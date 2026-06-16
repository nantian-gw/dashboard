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

function loadTsModule(relativePath, stubs = {}) {
  const source = readFileSync(resolve(root, relativePath), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
    fileName: relativePath,
  });

  const cjsModule = { exports: {} };
  vm.runInNewContext(outputText, {
    exports: cjsModule.exports,
    module: cjsModule,
    require: (specifier) => {
      if (specifier in stubs) return stubs[specifier];
      return require(specifier);
    },
    console,
  });

  return cjsModule.exports;
}

test("buildYamlDraft serializes the current form data without mutating it", () => {
  const { buildYamlDraft } = loadTsModule("src/components/resources/resource-editor-state.ts");
  const formData = { name: "edge", namespace: "platform" };
  const codec = {
    kind: "Gateway",
    apiVersion: "gateway.networking.k8s.io/v1",
    toYaml: (value) =>
      `apiVersion: gateway.networking.k8s.io/v1\nkind: Gateway\nmetadata:\n  name: ${value.name}\n  namespace: ${value.namespace}\n`,
    fromYaml: () => {
      throw new Error("not used");
    },
    getIdentity: (value) => ({ name: value.name, namespace: value.namespace }),
  };

  const yamlText = buildYamlDraft(codec, formData);

  assert.match(yamlText, /kind: Gateway/);
  assert.deepEqual(formData, { name: "edge", namespace: "platform" });
});

test("parseFormDraftFromYaml keeps YAML mode on invalid YAML", () => {
  const { parseFormDraftFromYaml } = loadTsModule("src/components/resources/resource-editor-state.ts");
  const codec = {
    kind: "Gateway",
    apiVersion: "gateway.networking.k8s.io/v1",
    toYaml: () => "",
    fromYaml: () => {
      throw new Error("Invalid YAML: unexpected end of stream");
    },
    getIdentity: () => ({ name: "edge", namespace: "platform" }),
  };

  const result = parseFormDraftFromYaml(codec, "apiVersion: gateway.networking.k8s.io/v1\nkind:");

  assert.equal(result.ok, false);
  assert.match(result.error, /unexpected end of stream/);
});

test("parseFormDraftFromYaml returns form data when the manifest kind matches", () => {
  const { parseFormDraftFromYaml } = loadTsModule("src/components/resources/resource-editor-state.ts");
  const codec = {
    kind: "ReferenceGrant",
    apiVersion: "gateway.networking.k8s.io/v1beta1",
    toYaml: () => "",
    fromYaml: () => ({
      name: "allow-shop",
      namespace: "shared",
      froms: [{ group: "gateway.networking.k8s.io", kind: "HTTPRoute", namespace: "shop" }],
      tos: [{ group: "", kind: "Service", name: "store" }],
    }),
    getIdentity: (value) => ({ name: value.name, namespace: value.namespace }),
  };

  const result = parseFormDraftFromYaml(codec, "kind: ReferenceGrant");

  assert.equal(result.ok, true);
  assert.deepEqual(result.formData, {
    name: "allow-shop",
    namespace: "shared",
    froms: [{ group: "gateway.networking.k8s.io", kind: "HTTPRoute", namespace: "shop" }],
    tos: [{ group: "", kind: "Service", name: "store" }],
  });
});

test("assertEditIdentityMatch rejects YAML identity drift on edit pages", () => {
  const { assertEditIdentityMatch } = loadTsModule("src/components/resources/resource-editor-state.ts");

  assert.equal(
    assertEditIdentityMatch(
      { name: "edge", namespace: "platform" },
      { name: "edge", namespace: "platform" }
    ),
    null
  );

  assert.match(
    assertEditIdentityMatch(
      { name: "edge", namespace: "platform" },
      { name: "edge-copy", namespace: "platform" }
    ),
    /must stay on platform\/edge/
  );
});
