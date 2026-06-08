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
