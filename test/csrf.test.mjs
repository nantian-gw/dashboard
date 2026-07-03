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

describe("csrf", () => {
  const csrf = loadModule("src/lib/csrf.ts");

  test("generates a 43-character base64url token", () => {
    const token = csrf.generateCsrfToken();
    assert.equal(token.length, 43);
    assert.match(token, /^[A-Za-z0-9_-]+$/);
  });

  test("generates unique tokens", () => {
    const a = csrf.generateCsrfToken();
    const b = csrf.generateCsrfToken();
    assert.notEqual(a, b);
  });

  test("cookie header has correct format", () => {
    const header = csrf.getCsrfCookieHeader("test-token");
    assert.match(header, /^x-csrf-token=test-token;/);
    assert.match(header, /SameSite=Strict/);
    assert.match(header, /Secure/);
  });

  test("validateCsrfToken accepts matching tokens", () => {
    assert.ok(csrf.validateCsrfToken("abc", "abc"));
  });

  test("validateCsrfToken rejects mismatched tokens", () => {
    assert.equal(csrf.validateCsrfToken("abc", "def"), false);
  });

  test("validateCsrfToken rejects missing cookie", () => {
    assert.equal(csrf.validateCsrfToken(undefined, "abc"), false);
  });

  test("validateCsrfToken rejects missing header", () => {
    assert.equal(csrf.validateCsrfToken("abc", null), false);
  });

  test("getCsrfTokenFromCookies extracts token from cookie string", () => {
    const token = csrf.getCsrfTokenFromCookies("x-csrf-token=my-value; other=foo");
    assert.equal(token, "my-value");
  });

  test("getCsrfTokenFromCookies returns undefined for missing cookie", () => {
    assert.equal(csrf.getCsrfTokenFromCookies("other=foo"), undefined);
  });

  test("getCsrfTokenFromCookies returns undefined for null header", () => {
    assert.equal(csrf.getCsrfTokenFromCookies(null), undefined);
  });

  test("CSRF cookie and header names are identical", () => {
    assert.equal(csrf.CSRF_COOKIE_NAME, csrf.CSRF_HEADER_NAME);
    assert.equal(csrf.CSRF_COOKIE_NAME, "x-csrf-token");
  });
});

describe("CSRF constants", () => {
  const csrf = loadModule("src/lib/csrf.ts");

  test("cookie and header names match (double-submit pattern)", () => {
    assert.equal(csrf.CSRF_COOKIE_NAME, csrf.CSRF_HEADER_NAME);
    assert.equal(csrf.CSRF_COOKIE_NAME, "x-csrf-token");
  });
});
