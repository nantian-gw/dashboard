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

function loadGlobalSearch() {
  const source = readFileSync(resolve(root, "src/lib/global-search.ts"), "utf8");
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

test("global search builds clickable cross-resource results", () => {
  const { buildGlobalSearchItems, filterGlobalSearchItems } = loadGlobalSearch();

  const items = buildGlobalSearchItems({
    gateways: [
      {
        name: "edge-gateway",
        namespace: "default",
        gatewayClass: "nantian",
        address: "gw.example.com",
        status: "Ready",
      },
    ],
    routes: [
      {
        kind: "HTTPRoute",
        name: "checkout",
        namespace: "shop",
        parent: "edge-gateway",
        backend: "checkout-svc",
        status: "Accepted",
      },
    ],
    referenceGrants: [
      {
        name: "allow-shop",
        namespace: "shared",
        resource: {
          spec: {
            from: [{ kind: "HTTPRoute", namespace: "shop" }],
            to: [{ kind: "Service", name: "checkout-svc" }],
          },
        },
      },
    ],
    backendTlsPolicies: [
      {
        name: "checkout-tls",
        namespace: "shop",
        targetRef: { kind: "Service", name: "checkout-svc" },
        status: "Accepted",
      },
    ],
    nodes: [
      {
        name: "dp-1",
        ready: true,
        ackState: "Current",
        snapshotVersion: "abc123",
      },
    ],
    diagnostics: [
      {
        severity: "warning",
        title: "Route has no ready backends",
        source: "controlplane",
        resource: "shop/checkout",
      },
    ],
  });

  assert.equal(
    JSON.stringify(items.map((item) => [item.kind, item.title, item.href])),
    JSON.stringify([
      ["gateway", "edge-gateway", "/gateways/default/edge-gateway"],
      ["route", "checkout", "/routes/HTTPRoute/shop/checkout"],
      ["referenceGrant", "allow-shop", "/reference-grants/shared/allow-shop"],
      ["backendTls", "checkout-tls", "/backend-tls"],
      ["node", "dp-1", "/nodes"],
      ["diagnostic", "Route has no ready backends", "/diagnostics"],
    ])
  );

  const results = filterGlobalSearchItems(items, "checkout");

  assert.equal(
    JSON.stringify(results.map((item) => item.kind)),
    JSON.stringify(["route", "backendTls", "referenceGrant", "diagnostic"])
  );
});

test("global search ranks title matches before metadata matches", () => {
  const { buildGlobalSearchItems, filterGlobalSearchItems } = loadGlobalSearch();
  const items = buildGlobalSearchItems({
    gateways: [
      { name: "api", namespace: "default", address: "checkout.example.com" },
      { name: "checkout", namespace: "default", address: "api.example.com" },
    ],
  });

  const results = filterGlobalSearchItems(items, "checkout");

  assert.equal(results[0].title, "checkout");
  assert.equal(results[1].title, "api");
});
