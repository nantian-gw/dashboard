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

function loadModule(relativePath) {
  const source = readFileSync(resolve(root, relativePath), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const cjsModule = { exports: {} };
  vm.runInNewContext(outputText, {
    exports: cjsModule.exports, module: cjsModule, require: realRequire,
  });
  return cjsModule.exports;
}

describe("proxy-headers whitelists", () => {
  const mod = loadModule("src/lib/proxy-headers.ts");

  test("forward list has 15 entries", () => assert.equal(mod.PROXY_FORWARD_HEADERS.length, 15));
  test("strip list has 10 entries", () => assert.equal(mod.PROXY_STRIP_HEADERS.length, 10));
  test("all forward entries are lowercase", () => {
    for (const h of mod.PROXY_FORWARD_HEADERS) assert.equal(h, h.toLowerCase());
  });
  test("authorization is whitelisted", () => assert.ok(mod.PROXY_FORWARD_HEADERS.includes("authorization")));
  test("host and connection are stripped", () => {
    assert.ok(mod.PROXY_STRIP_HEADERS.includes("host"));
    assert.ok(mod.PROXY_STRIP_HEADERS.includes("connection"));
  });
  test("lists are disjoint", () => {
    for (const h of mod.PROXY_FORWARD_HEADERS)
      assert.ok(!mod.PROXY_STRIP_HEADERS.includes(h), `${h} in both lists`);
  });
  test("buildProxyHeaders exists", () => assert.equal(typeof mod.buildProxyHeaders, "function"));
  test("proxyResponseHeaders exists", () => assert.equal(typeof mod.proxyResponseHeaders, "function"));
});
