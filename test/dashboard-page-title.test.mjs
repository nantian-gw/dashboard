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

function loadDashboardPageTitle() {
  const source = readFileSync(resolve(root, "src/lib/dashboard-page-title.ts"), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  });

  const cjsModule = { exports: {} };
  vm.runInNewContext(outputText, {
    exports: cjsModule.exports,
    module: cjsModule,
    require,
  });

  return cjsModule.exports;
}

test("dashboard page title keeps overview as the default dashboard shell label", () => {
  const { getDashboardPageTitle } = loadDashboardPageTitle();
  assert.equal(getDashboardPageTitle("/en/overview"), "overview");
  assert.equal(getDashboardPageTitle("/zh"), "overview");
});

test("dashboard page title preserves the visible leaf segment used by the current shell", () => {
  const { getDashboardPageTitle } = loadDashboardPageTitle();
  assert.equal(getDashboardPageTitle("/en/gateways"), "gateways");
  assert.equal(getDashboardPageTitle("/zh/gateways/default/edge"), "edge");
  assert.equal(getDashboardPageTitle("/en/routes/HTTPRoute/shop/checkout"), "checkout");
});

test("dashboard page title ignores query strings and hashes", () => {
  const { getDashboardPageTitle } = loadDashboardPageTitle();
  assert.equal(
    getDashboardPageTitle("/en/reference-grants/shared/allow-shop?tab=yaml"),
    "allow-shop"
  );
  assert.equal(getDashboardPageTitle("/zh/backend-tls/default/mtls#spec"), "mtls");
});
