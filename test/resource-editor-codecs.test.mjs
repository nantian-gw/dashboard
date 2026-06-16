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

test("gateway codec preserves an explicit empty listener list from YAML", () => {
  const { gatewayFormDataToManifest, gatewayManifestToFormData } = loadTsModule(
    "src/components/resources/gateway-form-codec.ts",
    commonStubs
  );

  const yamlText = `apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: edge
  namespace: platform
spec:
  gatewayClassName: nantian
  listeners: []
`;

  const formData = normalize(gatewayManifestToFormData(yamlText));

  assert.deepEqual(formData, {
    name: "edge",
    namespace: "platform",
    gatewayClass: "nantian",
    listeners: [],
  });
  assert.match(gatewayFormDataToManifest(formData), /listeners: \[\]/);
});

test("gateway codec initializes TLS defaults for HTTPS and TLS listeners without tls blocks", () => {
  const { gatewayManifestToFormData } = loadTsModule(
    "src/components/resources/gateway-form-codec.ts",
    commonStubs
  );

  const yamlText = `apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: edge
  namespace: platform
spec:
  gatewayClassName: nantian
  listeners:
    - name: https
      port: 443
      protocol: HTTPS
    - name: tls
      port: 8443
      protocol: TLS
`;

  assert.deepEqual(normalize(gatewayManifestToFormData(yamlText)), {
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
          certificateRefs: [],
        },
      },
      {
        name: "tls",
        port: 8443,
        protocol: "TLS",
        tls: {
          mode: "Terminate",
          certificateRefs: [],
        },
      },
    ],
  });
});

test("backend TLS codec round-trips hostname and CA refs", () => {
  const { backendTlsFormDataToManifest, backendTlsManifestToFormData } = loadTsModule(
    "src/components/resources/backendtls-form-codec.ts",
    commonStubs
  );

  const formData = {
    name: "mtls-store",
    namespace: "platform",
    targetGroup: "",
    targetKind: "Service",
    targetName: "store",
    hostname: "store.internal",
    caRefs: [{ name: "store-ca", group: "", kind: "ConfigMap" }],
  };

  const yamlText = backendTlsFormDataToManifest(formData);
  assert.match(yamlText, /kind: BackendTLSPolicy/);
  assert.deepEqual(normalize(backendTlsManifestToFormData(yamlText)), formData);
});

test("reference grant codec round-trips multiple from/to entries", () => {
  const { referenceGrantFormDataToManifest, referenceGrantManifestToFormData } = loadTsModule(
    "src/components/resources/referencegrant-form-codec.ts",
    commonStubs
  );

  const formData = {
    name: "allow-shop",
    namespace: "shared",
    froms: [
      { group: "gateway.networking.k8s.io", kind: "HTTPRoute", namespace: "shop" },
      { group: "gateway.networking.k8s.io", kind: "GRPCRoute", namespace: "payments" },
    ],
    tos: [
      { group: "", kind: "Service", name: "catalog" },
      { group: "", kind: "Secret", name: "catalog-cert" },
    ],
  };

  const yamlText = referenceGrantFormDataToManifest(formData);
  assert.match(yamlText, /kind: ReferenceGrant/);
  assert.deepEqual(normalize(referenceGrantManifestToFormData(yamlText)), formData);
});

test("HTTPRoute codec round-trips filters, matches, timeouts, and backends", () => {
  const { httpRouteFormDataToManifest, httpRouteManifestToFormData } = loadTsModule(
    "src/components/resources/httproute-form-codec.ts",
    commonStubs
  );

  const formData = {
    name: "checkout",
    namespace: "shop",
    gatewayName: "edge",
    gatewayNamespace: "platform",
    hostnames: "api.example.com, checkout.example.com",
    rules: [
      {
        pathMatch: "/checkout",
        method: "POST",
        headerMatches: [{ type: "Exact", name: "x-tenant", value: "shop" }],
        queryParamMatches: [{ type: "Exact", name: "preview", value: "1" }],
        filters: [
          {
            type: "RequestHeaderModifier",
            config: {
              set: [{ name: "x-stage", value: "stable" }],
              add: [],
              remove: ["x-remove-me"],
            },
          },
        ],
        requestTimeout: "30s",
        backends: [{ name: "checkout-svc", namespace: "shop", port: 8080, weight: 100 }],
      },
    ],
  };

  const yamlText = httpRouteFormDataToManifest(formData);
  assert.match(yamlText, /kind: HTTPRoute/);
  assert.deepEqual(normalize(httpRouteManifestToFormData(yamlText)), formData);
});

test("GRPCRoute codec round-trips hostnames, matches, and backends", () => {
  const { grpcRouteFormDataToManifest, grpcRouteManifestToFormData } = loadTsModule(
    "src/components/resources/grpcroute-form-codec.ts",
    commonStubs
  );

  const formData = {
    name: "payments",
    namespace: "shop",
    gatewayName: "edge",
    gatewayNamespace: "platform",
    hostnames: "grpc.example.com",
    rules: [
      {
        matches: [{ service: "payments.v1.Checkout", method: "Create" }],
        backends: [{ name: "payments-svc", namespace: "shop", port: 50051, weight: 100 }],
      },
    ],
  };

  const yamlText = grpcRouteFormDataToManifest(formData);
  assert.match(yamlText, /kind: GRPCRoute/);
  assert.deepEqual(normalize(grpcRouteManifestToFormData(yamlText)), formData);
});

for (const [kind, relativePath, formData] of [
  [
    "TCPRoute",
    "src/components/resources/tcproute-form-codec.ts",
    {
      name: "tcp-store",
      namespace: "shop",
      gatewayName: "edge",
      gatewayNamespace: "platform",
      backends: [{ name: "store-tcp", namespace: "shop", port: 9000, weight: 100 }],
    },
  ],
  [
    "TLSRoute",
    "src/components/resources/tlsroute-form-codec.ts",
    {
      name: "tls-store",
      namespace: "shop",
      gatewayName: "edge",
      gatewayNamespace: "platform",
      sniHosts: "store.example.com",
      backends: [{ name: "store-tls", namespace: "shop", port: 443, weight: 100 }],
    },
  ],
  [
    "UDPRoute",
    "src/components/resources/udproute-form-codec.ts",
    {
      name: "udp-metrics",
      namespace: "ops",
      gatewayName: "edge",
      gatewayNamespace: "platform",
      backends: [{ name: "metrics-udp", namespace: "ops", port: 8125, weight: 100 }],
    },
  ],
]) {
  test(`${kind} codec round-trips parent gateway and backend refs`, () => {
    const moduleExports = loadTsModule(relativePath, commonStubs);
    const exportNames = {
      TCPRoute: ["tcpRouteFormDataToManifest", "tcpRouteManifestToFormData"],
      TLSRoute: ["tlsRouteFormDataToManifest", "tlsRouteManifestToFormData"],
      UDPRoute: ["udpRouteFormDataToManifest", "udpRouteManifestToFormData"],
    };
    const [toYamlName, fromYamlName] = exportNames[kind];
    const toYaml = moduleExports[toYamlName];
    const fromYaml = moduleExports[fromYamlName];

    const yamlText = toYaml(formData);
    assert.match(yamlText, new RegExp(`kind: ${kind}`));
    assert.deepEqual(normalize(fromYaml(yamlText)), formData);
  });
}
