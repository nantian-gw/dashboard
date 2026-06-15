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

function loadNextConfig(env = {}) {
  const source = readFileSync(resolve(root, "next.config.ts"), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  });

  const cjsModule = { exports: {} };
  const mockRequire = (specifier) => {
    if (specifier === "next-intl/plugin") {
      return {
        __esModule: true,
        default: () => (config) => config,
      };
    }
    return realRequire(specifier);
  };

  vm.runInNewContext(outputText, {
    exports: cjsModule.exports,
    module: cjsModule,
    process: {
      env: {
        ...process.env,
        DASHBOARD_ENABLE_HSTS: undefined,
        ...env,
      },
    },
    require: mockRequire,
  });

  return cjsModule.exports.default ?? cjsModule.exports;
}

function loadProxy({ parentEnv = {}, env = {}, authImpl = async () => null } = {}) {
  const source = readFileSync(resolve(root, "src/proxy.ts"), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  });

  class MockNextResponse {
    constructor(type, url) {
      this.type = type;
      this.url = url;
      this.headers = new Headers();
    }

    static next() {
      return new MockNextResponse("next");
    }

    static redirect(url) {
      return new MockNextResponse("redirect", url.toString());
    }
  }

  const mockRequire = (specifier) => {
    if (specifier === "@/lib/auth") {
      return { auth: authImpl };
    }
    if (specifier === "next-intl/middleware") {
      return {
        __esModule: true,
        default: () => () => MockNextResponse.next(),
      };
    }
    if (specifier === "./i18n/routing") {
      return { routing: { defaultLocale: "en" } };
    }
    if (specifier === "next/server") {
      return {
        NextResponse: MockNextResponse,
      };
    }
    return realRequire(specifier);
  };

  const cjsModule = { exports: {} };
  vm.runInNewContext(outputText, {
    exports: cjsModule.exports,
    module: cjsModule,
    process: {
      env: {
        ...parentEnv,
        DASHBOARD_ENABLE_HSTS: undefined,
        ...env,
      },
    },
    require: mockRequire,
    Headers,
    URL,
  });

  return {
    proxy: cjsModule.exports.default,
    createRequest(pathname) {
      const url = new URL(pathname, "http://dashboard.test");
      return {
        url: url.toString(),
        nextUrl: { pathname },
      };
    },
  };
}

async function headerMap(config) {
  const rules = await config.headers();
  assert.equal(rules.length, 1);
  assert.equal(rules[0].source, "/:path*");
  return new Map(rules[0].headers.map((header) => [header.key, header.value]));
}

test("dashboard config emits baseline security headers", async () => {
  const config = loadNextConfig();
  const headers = await headerMap(config);

  assert.equal(headers.get("X-Frame-Options"), "DENY");
  assert.equal(headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(headers.get("Referrer-Policy"), "strict-origin-when-cross-origin");
  assert.match(headers.get("Permissions-Policy"), /camera=\(\)/);
  assert.match(headers.get("Permissions-Policy"), /microphone=\(\)/);
  assert.match(headers.get("Permissions-Policy"), /geolocation=\(\)/);
  assert.match(headers.get("Permissions-Policy"), /payment=\(\)/);
  assert.match(headers.get("Permissions-Policy"), /usb=\(\)/);
  assert.match(headers.get("Permissions-Policy"), /interest-cohort=\(\)/);

  // CSP is now set dynamically in the proxy middleware (src/proxy.ts)
  // with per-request nonce, not in the static next.config headers.
  assert.equal(headers.has("Content-Security-Policy"), false);
});

test("dashboard config does not bake HSTS into build-time headers", async () => {
  const defaultHeaders = await headerMap(loadNextConfig());
  assert.equal(defaultHeaders.has("Strict-Transport-Security"), false);

  const hstsHeaders = await headerMap(loadNextConfig({
    DASHBOARD_ENABLE_HSTS: "true",
  }));
  assert.equal(hstsHeaders.has("Strict-Transport-Security"), false);
});

test("dashboard proxy runtime HSTS defaults off even when parent env is set", async () => {
  const { proxy, createRequest } = loadProxy({
    parentEnv: { DASHBOARD_ENABLE_HSTS: "true" },
    env: {},
  });

  const response = await proxy(createRequest("/en/login"));
  assert.equal(response.headers.get("Strict-Transport-Security"), null);
});

test("dashboard proxy runtime HSTS is opt-in", async () => {
  const { proxy, createRequest } = loadProxy({
    env: { DASHBOARD_ENABLE_HSTS: "true" },
  });

  const response = await proxy(createRequest("/en/login"));
  assert.equal(
    response.headers.get("Strict-Transport-Security"),
    "max-age=31536000; includeSubDomains"
  );
});

test("dashboard proxy sets CSP with per-request nonce", async () => {
  const { proxy, createRequest } = loadProxy();

  const response = await proxy(createRequest("/en/login"));
  const csp = response.headers.get("Content-Security-Policy");
  assert.ok(csp, "CSP header must be present");
  assert.match(csp, /script-src 'self' 'nonce-/);
  assert.match(csp, /'strict-dynamic'/);
  // script-src must not contain unsafe-inline (replaced by nonce+strict-dynamic)
  assert.doesNotMatch(csp, /script-src[^;]*'unsafe-inline'/);
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /object-src 'none'/);
});

test("dashboard proxy redirects bare root requests to the localized login page", async () => {
  const { proxy, createRequest } = loadProxy();

  const response = await proxy(createRequest("/"));
  assert.equal(response.type, "redirect");
  assert.equal(response.url, "http://dashboard.test/en/login");
});

test("dashboard keeps existing Next config behavior", () => {
  const config = loadNextConfig();

  assert.deepEqual(Array.from(config.transpilePackages), ["recharts"]);
  assert.equal(config.output, "standalone");
  assert.equal(config.poweredByHeader, false);
  assert.deepEqual(
    Array.from(config.experimental.optimizePackageImports),
    ["lucide-react"]
  );
});
