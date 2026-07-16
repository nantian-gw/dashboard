import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const realRequire = createRequire(import.meta.url);
const ts = realRequire("typescript");

function loadRateLimitModule() {
  const source = readFileSync(resolve(root, "src/lib/rate-limit.ts"), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  });

  const cjsModule = { exports: {} };
  vm.runInNewContext(outputText, {
    exports: cjsModule.exports,
    module: cjsModule,
    require: realRequire,
  });

  return cjsModule.exports;
}

function loadAuth({ fetchImpl, consoleImpl = console }) {
  const source = readFileSync(resolve(root, "src/lib/auth.ts"), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  });

  let authConfig;
  let credentialsConfig;
  const mockRequire = (specifier) => {
    if (specifier === "next-auth") {
      return {
        __esModule: true,
        CredentialsSignin: class CredentialsSignin extends Error {
          constructor(message, errorOptions) {
            super(message, errorOptions);
            this.name = "CredentialsSignin";
            this.type = "CredentialsSignin";
            this.code = "credentials";
          }
        },
        default: (config) => {
          authConfig = config;
          return {
            handlers: {},
            auth: () => undefined,
            signIn: () => undefined,
            signOut: () => undefined,
          };
        },
      };
    }

    if (specifier === "next-auth/providers/credentials") {
      return {
        __esModule: true,
        default: (config) => {
          credentialsConfig = config;
          return config;
        },
      };
    }

    if (specifier === "@/lib/admin-urls") {
      return {
        CONTROLPLANE_ADMIN_URL: "http://controlplane.test",
      };
    }

    if (specifier === "./rate-limit") {
      return loadRateLimitModule();
    }

    return realRequire(specifier);
  };

  const cjsModule = { exports: {} };
  const timers = new Set();
  const context = {
    AbortController,
    clearTimeout: (timer) => {
      timers.delete(timer);
      clearTimeout(timer);
    },
    exports: cjsModule.exports,
    console: consoleImpl,
    fetch: fetchImpl,
    module: cjsModule,
    process: {
      env: {
        AUTH_SECRET: "test-auth-secret",
      },
    },
    require: mockRequire,
    setTimeout: (handler, delay) => {
      const timer = setTimeout(handler, delay);
      timers.add(timer);
      return timer;
    },
  };

  vm.runInNewContext(outputText, context);

  for (const timer of timers) {
    clearTimeout(timer);
  }

  return {
    ...cjsModule.exports,
    authConfig,
    credentialsConfig,
  };
}

function loadAuthWithStatus(status) {
  const ok = status >= 200 && status < 300;
  return loadAuth({
    fetchImpl: async () => ({
      ok,
      status,
      json: async () => ok ? { authenticated: true } : null,
    }),
  });
}

test("200 allows authentication", async () => {
  const { verifyTokenAgainstControlplane, credentialsConfig } =
    loadAuthWithStatus(200);

  assert.equal(
    await verifyTokenAgainstControlplane("secret-token"),
    "valid"
  );

  const user = await credentialsConfig.authorize({ token: "secret-token" });
  assert.equal(user.id, "admin");
  assert.equal(user.name, "Admin");
  assert.equal(user.email, "admin@nantian-gw");
  assert.equal(user.token, "secret-token");
});

test("204 allows authentication", async () => {
  const { verifyTokenAgainstControlplane } = loadAuthWithStatus(204);

  assert.equal(
    await verifyTokenAgainstControlplane("secret-token"),
    "valid"
  );
});

test("401 denies authentication", async () => {
  const { verifyTokenAgainstControlplane, credentialsConfig } =
    loadAuthWithStatus(401);

  assert.equal(
    await verifyTokenAgainstControlplane("secret-token"),
    "invalid"
  );
  await assert.rejects(
    credentialsConfig.authorize({ token: "secret-token" }),
    (error) => error.code === "invalid"
  );
});

test("403 denies authentication", async () => {
  const { verifyTokenAgainstControlplane } = loadAuthWithStatus(403);

  assert.equal(
    await verifyTokenAgainstControlplane("secret-token"),
    "invalid"
  );
});

test("404 denies authentication", async () => {
  const { verifyTokenAgainstControlplane } = loadAuthWithStatus(404);

  assert.equal(
    await verifyTokenAgainstControlplane("secret-token"),
    "network_error"
  );
});

test("500 denies authentication", async () => {
  const { verifyTokenAgainstControlplane } = loadAuthWithStatus(500);

  assert.equal(
    await verifyTokenAgainstControlplane("secret-token"),
    "network_error"
  );
});

test("thrown fetch error denies authentication", async () => {
  const { verifyTokenAgainstControlplane } = loadAuth({
    fetchImpl: async () => {
      throw new Error("upstream unavailable");
    },
  });

  assert.equal(
    await verifyTokenAgainstControlplane("secret-token"),
    "network_error"
  );
});

test("AbortError-style thrown error denies authentication", async () => {
  const { verifyTokenAgainstControlplane } = loadAuth({
    fetchImpl: async () => {
      throw new DOMException("operation aborted", "AbortError");
    },
  });

  assert.equal(
    await verifyTokenAgainstControlplane("secret-token"),
    "network_error"
  );
});

test("verification sends bearer token to controlplane summary with abort signal", async () => {
  let call;
  const { verifyTokenAgainstControlplane } = loadAuth({
    fetchImpl: async (url, init) => {
      call = { url, init };
      return { ok: true, status: 200, json: async () => ({ authenticated: true }) };
    },
  });

  assert.equal(
    await verifyTokenAgainstControlplane("secret-token"),
    "valid"
  );

  assert.equal(call.url, "http://controlplane.test/v1/auth/verify");
  assert.equal(call.init.headers.Authorization, "Bearer secret-token");
  assert.ok(call.init.signal instanceof AbortSignal);
});

test("authorization rate limit blocks repeated attempts for the same forwarded client", async () => {
  let fetchCalls = 0;
  const { credentialsConfig, resetAuthRateLimitForTests } = loadAuth({
    fetchImpl: async () => {
      fetchCalls += 1;
      return { ok: false, status: 401 };
    },
  });
  resetAuthRateLimitForTests();

  const request = new Request("http://dashboard.test/api/auth/callback/credentials", {
    headers: {
      "x-forwarded-for": "203.0.113.10, 10.0.0.1",
    },
  });

  for (let i = 0; i < 10; i += 1) {
    await assert.rejects(
      credentialsConfig.authorize({ token: "bad-token" }, request),
      (error) => error.code === "invalid"
    );
  }

  assert.equal(fetchCalls, 10);
  await assert.rejects(
    credentialsConfig.authorize({ token: "bad-token" }, request),
    (error) => error.code === "rate_limited"
  );
  assert.equal(fetchCalls, 10);
});

test("authorization rate limit isolates different forwarded clients", async () => {
  let fetchCalls = 0;
  const { credentialsConfig, resetAuthRateLimitForTests } = loadAuth({
    fetchImpl: async () => {
      fetchCalls += 1;
      return { ok: false, status: 401 };
    },
  });
  resetAuthRateLimitForTests();

  const clientA = new Request("http://dashboard.test/api/auth/callback/credentials", {
    headers: { "x-forwarded-for": "203.0.113.10" },
  });
  const clientB = new Request("http://dashboard.test/api/auth/callback/credentials", {
    headers: { "x-forwarded-for": "203.0.113.11" },
  });

  for (let i = 0; i < 10; i += 1) {
    await assert.rejects(
      credentialsConfig.authorize({ token: "bad-token" }, clientA),
      (error) => error.code === "invalid"
    );
  }

  await assert.rejects(
    credentialsConfig.authorize({ token: "bad-token" }, clientA),
    (error) => error.code === "rate_limited"
  );
  await assert.rejects(
    credentialsConfig.authorize({ token: "bad-token" }, clientB),
    (error) => error.code === "invalid"
  );
  assert.equal(fetchCalls, 11);
});

test("authorization rate limit uses forwarded, real IP, and Cloudflare headers with fallback order", async () => {
  const { getAuthRateLimitKey } = loadAuth({
    fetchImpl: async () => ({ ok: true, status: 200 }),
  });

  assert.equal(
    getAuthRateLimitKey(new Request("http://dashboard.test", {
      headers: { "x-forwarded-for": " 203.0.113.12 , 10.0.0.1" },
    })),
    "ip:203.0.113.12"
  );
  assert.equal(
    getAuthRateLimitKey(new Request("http://dashboard.test", {
      headers: {
        "x-forwarded-for": " , ",
        "x-real-ip": "198.51.100.20",
      },
    })),
    "ip:198.51.100.20"
  );
  assert.equal(
    getAuthRateLimitKey(new Request("http://dashboard.test", {
      headers: {
        "x-real-ip": "198.51.100.21",
      },
    })),
    "ip:198.51.100.21"
  );
  assert.equal(
    getAuthRateLimitKey(new Request("http://dashboard.test", {
      headers: {
        "x-real-ip": " ",
        "cf-connecting-ip": "198.51.100.22",
      },
    })),
    "ip:198.51.100.22"
  );
  assert.equal(getAuthRateLimitKey(), "ip:unknown");
});

test("empty token does not consume rate-limit budget", async () => {
  let fetchCalls = 0;
  const { credentialsConfig, resetAuthRateLimitForTests } = loadAuth({
    fetchImpl: async () => {
      fetchCalls += 1;
      return { ok: true, status: 200, json: async () => ({ authenticated: true }) };
    },
  });
  resetAuthRateLimitForTests();

  const request = new Request("http://dashboard.test/api/auth/callback/credentials", {
    headers: { "x-forwarded-for": "203.0.113.10" },
  });

  for (let i = 0; i < 20; i += 1) {
    assert.equal(await credentialsConfig.authorize({ token: " " }, request), null);
  }

  const user = await credentialsConfig.authorize({ token: "secret-token" }, request);
  assert.equal(user.id, "admin");
  assert.equal(fetchCalls, 1);
});

test("auth logger suppresses expected credential failures but keeps network and plain errors", async () => {
  const invalidLogs = [];
  const invalidConsole = {
    debug: () => {},
    error: (...args) => invalidLogs.push(args),
    log: () => {},
    warn: () => {},
  };
  const {
    authConfig: invalidAuthConfig,
    credentialsConfig: invalidCredentialsConfig,
  } = loadAuth({
    consoleImpl: invalidConsole,
    fetchImpl: async () => ({
      ok: false,
      status: 401,
    }),
  });

  await assert.rejects(
    invalidCredentialsConfig.authorize({ token: "bad-token" }),
    (error) => {
      invalidAuthConfig.logger.error(error);
      return error.code === "invalid";
    }
  );
  assert.equal(invalidLogs.length, 0);

  const networkLogs = [];
  const networkConsole = {
    debug: () => {},
    error: (...args) => networkLogs.push(args),
    log: () => {},
    warn: () => {},
  };
  const {
    authConfig: networkAuthConfig,
    credentialsConfig: networkCredentialsConfig,
  } = loadAuth({
    consoleImpl: networkConsole,
    fetchImpl: async () => {
      throw new Error("upstream unavailable");
    },
  });

  await assert.rejects(
    networkCredentialsConfig.authorize({ token: "secret-token" }),
    (error) => {
      networkAuthConfig.logger.error(error);
      return error.code === "network";
    }
  );
  assert.ok(networkLogs.length > 0);

  const plainLogs = [];
  const plainConsole = {
    debug: () => {},
    error: (...args) => plainLogs.push(args),
    log: () => {},
    warn: () => {},
  };
  const { authConfig: plainAuthConfig } = loadAuth({
    consoleImpl: plainConsole,
    fetchImpl: async () => ({
      ok: true,
      status: 200,
    }),
  });

  plainAuthConfig.logger.error(new Error("plain failure"));
  assert.ok(plainLogs.length > 0);
});
