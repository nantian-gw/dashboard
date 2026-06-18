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

function readSource(relativePath) {
  return readFileSync(resolve(root, relativePath), "utf8");
}

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

test("localizeDashboardPath preserves already localized root paths with query strings or hashes", () => {
  const { localizeDashboardPath } = loadDashboardNavigation();

  assert.equal(localizeDashboardPath("zh", "/en?tab=1"), "/en?tab=1");
  assert.equal(localizeDashboardPath("en", "/zh#top"), "/zh#top");
});

test("localizeDashboardPath falls back to the default locale for unknown locale inputs", () => {
  const { localizeDashboardPath } = loadDashboardNavigation();

  assert.equal(localizeDashboardPath("fr", "/gateways"), "/en/gateways");
});

test("localizeDashboardPath rejects non-absolute dashboard hrefs", () => {
  const { localizeDashboardPath } = loadDashboardNavigation();

  assert.throws(() => localizeDashboardPath("en", "gateways"), /must start with \//);
});

test("LocalizedLink separates query prewarm from route prefetch", () => {
  const source = readSource("src/components/dashboard/localized-link.tsx");

  assert.match(
    source,
    /queryPrewarm\??:\s*boolean|queryPrewarm\s*=\s*true/,
    "LocalizedLink must expose an independent queryPrewarm control"
  );
  assert.doesNotMatch(
    source,
    /if\s*\(\s*prefetch\s*===\s*false\s*\)\s*return;?/,
    "LocalizedLink must not let prefetch=false disable query prewarm implicitly"
  );
  assert.match(
    source,
    /if\s*\(\s*prefetch\s*!==\s*false\s*\)[\s\S]*router\.prefetch\(localizedHref\)/,
    "LocalizedLink must gate manual route prefetch independently"
  );
  assert.match(
    source,
    /if\s*\(\s*queryPrewarm\s*!==\s*false\s*\)[\s\S]*prewarmDashboardQueries\(queryClient,\s*localizedHref\)/,
    "LocalizedLink must gate query prewarm independently"
  );
});

test("LocalizedLink turns hover prewarm into delayed intent work", () => {
  const source = readSource("src/components/dashboard/localized-link.tsx");

  assert.match(source, /setTimeout\(/, "LocalizedLink must debounce hover-triggered prewarm");
  assert.match(
    source,
    /150|HOVER_PREWARM_DELAY_MS/,
    "LocalizedLink must delay hover prewarm by the configured intent threshold"
  );
  assert.match(source, /onMouseLeave/, "LocalizedLink must cancel hover prewarm on pointer leave");
  assert.match(source, /clearTimeout/, "LocalizedLink must clear pending hover timers");
  assert.match(
    source,
    /prewarmedHrefRef\.current === localizedHref/,
    "LocalizedLink must suppress duplicate manual prewarm for the same mounted href"
  );
  assert.match(
    source,
    /onFocus=\{\(event\)\s*=>\s*\{\s*handlePrewarm\(\);\s*onFocus\?\.\(event\);\s*\}\}/,
    "LocalizedLink must keep focus-triggered prewarm immediate instead of delaying it behind hover intent"
  );
});
