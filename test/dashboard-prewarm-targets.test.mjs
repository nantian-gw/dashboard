import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const ts = require("typescript");

function loadDashboardPrewarmTargets() {
  const source = readFileSync(resolve(root, "src/lib/dashboard-prewarm-targets.ts"), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      paths: {
        "@/*": ["./src/*"],
      },
    },
  });

  const cjsModule = { exports: {} };
  vm.runInNewContext(outputText, {
    exports: cjsModule.exports,
    module: cjsModule,
    require: (specifier) => {
      if (specifier === "@/i18n/routing") {
        return {
          routing: {
            locales: ["en", "zh"],
            defaultLocale: "en",
          },
        };
      }
      return require(specifier);
    },
  });

  return cjsModule.exports;
}

test("approved gateway and route pages resolve to explicit prewarm targets", () => {
  const { getDashboardQueryPrewarmTargets } = loadDashboardPrewarmTargets();

  assert.equal(
    JSON.stringify(getDashboardQueryPrewarmTargets("/en/gateways")),
    JSON.stringify([{ kind: "gateways-list" }])
  );
  assert.equal(
    JSON.stringify(getDashboardQueryPrewarmTargets("/zh/gateways/platform/edge")),
    JSON.stringify([{ kind: "gateway-detail", namespace: "platform", name: "edge" }])
  );
  assert.equal(
    JSON.stringify(getDashboardQueryPrewarmTargets("/en/routes")),
    JSON.stringify([{ kind: "routes-list" }])
  );
  assert.equal(
    JSON.stringify(getDashboardQueryPrewarmTargets("/zh/routes/HTTPRoute/shop/checkout")),
    JSON.stringify([
      {
        kind: "route-detail",
        routeKind: "HTTPRoute",
        namespace: "shop",
        name: "checkout",
      },
    ])
  );
});

test("approved backend TLS and reference grant pages resolve to explicit prewarm targets", () => {
  const { getDashboardQueryPrewarmTargets } = loadDashboardPrewarmTargets();

  assert.equal(
    JSON.stringify(getDashboardQueryPrewarmTargets("/en/backend-tls")),
    JSON.stringify([{ kind: "backend-tls-list" }])
  );
  assert.equal(
    JSON.stringify(getDashboardQueryPrewarmTargets("/zh/backend-tls/default/mtls")),
    JSON.stringify([{ kind: "backend-tls-list" }])
  );
  assert.equal(
    JSON.stringify(getDashboardQueryPrewarmTargets("/en/reference-grants")),
    JSON.stringify([{ kind: "reference-grants-list" }])
  );
  assert.equal(
    JSON.stringify(
      getDashboardQueryPrewarmTargets("/zh/reference-grants/shared/allow-shop?tab=manifest")
    ),
    JSON.stringify([
      { kind: "reference-grant-detail", namespace: "shared", name: "allow-shop" },
    ])
  );
});

test("approved AI pages resolve to list-backed prewarm targets", () => {
  const { getDashboardQueryPrewarmTargets } = loadDashboardPrewarmTargets();

  assert.equal(
    JSON.stringify(getDashboardQueryPrewarmTargets("/en/ai/services")),
    JSON.stringify([{ kind: "ai-services-list" }])
  );
  assert.equal(
    JSON.stringify(getDashboardQueryPrewarmTargets("/zh/ai/services/openai-gpt4")),
    JSON.stringify([{ kind: "ai-services-list" }])
  );
  assert.equal(
    JSON.stringify(getDashboardQueryPrewarmTargets("/en/ai/token-policies")),
    JSON.stringify([{ kind: "token-policies-list" }])
  );
  assert.equal(
    JSON.stringify(getDashboardQueryPrewarmTargets("/zh/ai/token-policies/default-limit")),
    JSON.stringify([{ kind: "token-policies-list" }])
  );
});

test("unsupported and create routes do not trigger query prewarm", () => {
  const { getDashboardQueryPrewarmTargets } = loadDashboardPrewarmTargets();

  assert.equal(JSON.stringify(getDashboardQueryPrewarmTargets("/en/overview")), JSON.stringify([]));
  assert.equal(
    JSON.stringify(getDashboardQueryPrewarmTargets("/zh/routes/create/grpcroute")),
    JSON.stringify([])
  );
  assert.equal(
    JSON.stringify(getDashboardQueryPrewarmTargets("/en/ai/token-policies/create")),
    JSON.stringify([])
  );
  assert.equal(
    JSON.stringify(getDashboardQueryPrewarmTargets("/zh/settings#metrics")),
    JSON.stringify([])
  );
});
