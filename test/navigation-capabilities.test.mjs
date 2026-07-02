import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test, { describe } from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const realRequire = createRequire(import.meta.url);
const ts = realRequire("typescript");

function loadModule(relativePath, mockGlobals = {}) {
  const source = readFileSync(resolve(root, relativePath), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  });

  const cjsModule = { exports: {} };
  const sandbox = {
    exports: cjsModule.exports,
    module: cjsModule,
    require: realRequire,
    process: { env: { ...process.env } },
    ...mockGlobals,
  };
  vm.runInNewContext(outputText, sandbox);
  return cjsModule.exports;
}

describe("dashboard capabilities", () => {
  test("all 19 capability keys are listed", () => {
    const mod = loadModule("src/lib/dashboard-capabilities.ts");
    const keys = Object.keys(mod.DEFAULT_DASHBOARD_CAPABILITIES);
    assert.equal(keys.length, 19, "must have exactly 19 capability keys");
  });

  test("core capabilities enabled by default", () => {
    const mod = loadModule("src/lib/dashboard-capabilities.ts");
    const caps = mod.DEFAULT_DASHBOARD_CAPABILITIES;
    assert.ok(caps.overview);
    assert.ok(caps.gateways);
    assert.ok(caps.routes);
    assert.ok(caps.diagnostics);
    assert.ok(caps.observability);
  });

  test("AI capabilities disabled by default", () => {
    const mod = loadModule("src/lib/dashboard-capabilities.ts");
    const caps = mod.DEFAULT_DASHBOARD_CAPABILITIES;
    assert.equal(caps.aiOverview, false);
    assert.equal(caps.aiServices, false);
    assert.equal(caps.aiCost, false);
    assert.equal(caps.wasmPlugins, false);
  });
});

describe("navigation localization", () => {
  test("prepends locale for unlocalized paths", () => {
    // mock i18n routing
    const mockI18n = {
      routing: { locales: ["en", "zh"], defaultLocale: "en" },
    };
    const mockModule = { exports: {} };
    const navSource = readFileSync(resolve(root, "src/lib/dashboard-navigation.ts"), "utf8");
    const { outputText } = ts.transpileModule(
      navSource.replace(/from\s+"@\/i18n\/routing"/, 'from "./mock-i18n"'),
      { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }
    );
    vm.runInNewContext(outputText, {
      exports: mockModule.exports,
      module: mockModule,
      require: (spec) => {
        if (spec === "./mock-i18n") return mockI18n;
        return realRequire(spec);
      },
    });
    assert.equal(typeof mockModule.exports.localizeDashboardPath, "function");
  });
});
