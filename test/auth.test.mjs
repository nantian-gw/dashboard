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

function loadAuth({ fetchImpl }) {
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
  return loadAuth({
    fetchImpl: async () => ({
      ok: status >= 200 && status < 300,
      status,
    }),
  });
}

test("200 allows authentication", async () => {
  const { verifyTokenAgainstControlplane, credentialsConfig } =
    loadAuthWithStatus(200);

  assert.equal(
    await verifyTokenAgainstControlplane("secret-token"),
    true
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
    true
  );
});

test("401 denies authentication", async () => {
  const { verifyTokenAgainstControlplane, credentialsConfig } =
    loadAuthWithStatus(401);

  assert.equal(
    await verifyTokenAgainstControlplane("secret-token"),
    false
  );
  assert.equal(await credentialsConfig.authorize({ token: "secret-token" }), null);
});

test("403 denies authentication", async () => {
  const { verifyTokenAgainstControlplane } = loadAuthWithStatus(403);

  assert.equal(
    await verifyTokenAgainstControlplane("secret-token"),
    false
  );
});

test("404 denies authentication", async () => {
  const { verifyTokenAgainstControlplane } = loadAuthWithStatus(404);

  assert.equal(
    await verifyTokenAgainstControlplane("secret-token"),
    false
  );
});

test("500 denies authentication", async () => {
  const { verifyTokenAgainstControlplane } = loadAuthWithStatus(500);

  assert.equal(
    await verifyTokenAgainstControlplane("secret-token"),
    false
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
    false
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
    false
  );
});

test("verification sends bearer token to controlplane summary with abort signal", async () => {
  let call;
  const { verifyTokenAgainstControlplane } = loadAuth({
    fetchImpl: async (url, init) => {
      call = { url, init };
      return { ok: true, status: 200 };
    },
  });

  assert.equal(
    await verifyTokenAgainstControlplane("secret-token"),
    true
  );

  assert.equal(call.url, "http://controlplane.test/v1/summary");
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
    assert.equal(await credentialsConfig.authorize({ token: "bad-token" }, request), null);
  }

  assert.equal(fetchCalls, 10);
  assert.equal(await credentialsConfig.authorize({ token: "bad-token" }, request), null);
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
    assert.equal(await credentialsConfig.authorize({ token: "bad-token" }, clientA), null);
  }

  assert.equal(await credentialsConfig.authorize({ token: "bad-token" }, clientA), null);
  assert.equal(await credentialsConfig.authorize({ token: "bad-token" }, clientB), null);
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
      return { ok: true, status: 200 };
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
