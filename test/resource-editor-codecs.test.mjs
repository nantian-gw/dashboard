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

function normalize(value) {
  return JSON.parse(JSON.stringify(value));
}

const commonStubs = {
  "@/lib/admin-models": {
    unwrapResource: (value) => value,
  },
  "@/lib/resource-manifest": loadTsModule("src/lib/resource-manifest.ts"),
};

test("gateway codec round-trips listeners with TLS certificate refs", () => {
  const { gatewayFormDataToManifest, gatewayManifestToFormData } = loadTsModule(
    "src/components/resources/gateway-form-codec.ts",
    commonStubs
  );

  const formData = {
    name: "edge",
    namespace: "platform",
    gatewayClass: "nantian",
    listeners: [
      {
        name: "https",
        port: 443,
        protocol: "HTTPS",
        tls: {
          mode: "Terminate",
          certificateRefs: [
            {
              name: "edge-cert",
              namespace: "platform",
              kind: "Secret",
              group: "",
            },
          ],
        },
      },
    ],
  };

  const yamlText = gatewayFormDataToManifest(formData);
  assert.match(yamlText, /kind: Gateway/);
  assert.deepEqual(normalize(gatewayManifestToFormData(yamlText)), formData);
});
