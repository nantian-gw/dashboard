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

function loadDashboardNavigation() {
  const source = readFileSync(resolve(root, "src/lib/dashboard-navigation.ts"), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
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

test("localizeDashboardPath prefixes locale-neutral dashboard paths", () => {
  const { localizeDashboardPath } = loadDashboardNavigation();

  assert.equal(localizeDashboardPath("en", "/gateways"), "/en/gateways");
  assert.equal(
    localizeDashboardPath("zh", "/routes/HTTPRoute/default/edge"),
    "/zh/routes/HTTPRoute/default/edge"
  );
});

test("localizeDashboardPath preserves already localized paths", () => {
  const { localizeDashboardPath } = loadDashboardNavigation();

  assert.equal(localizeDashboardPath("en", "/en/overview"), "/en/overview");
  assert.equal(localizeDashboardPath("zh", "/zh/ai/services"), "/zh/ai/services");
});

test("localizeDashboardPath falls back to the default locale for unknown locale inputs", () => {
  const { localizeDashboardPath } = loadDashboardNavigation();

  assert.equal(localizeDashboardPath("fr", "/gateways"), "/en/gateways");
});

test("localizeDashboardPath rejects non-absolute dashboard hrefs", () => {
  const { localizeDashboardPath } = loadDashboardNavigation();

  assert.throws(() => localizeDashboardPath("en", "gateways"), /must start with \//);
});
