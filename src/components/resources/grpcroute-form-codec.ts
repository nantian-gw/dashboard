import type { ManagedResource, KubernetesResource } from "@/lib/admin-models";
import { unwrapResource } from "@/lib/admin-models";
import {
  assertManifestKind,
  parseSingleManifest,
  readManifestIdentity,
  type ManifestRecord,
} from "@/lib/resource-manifest";
import type { ResourceEditorCodec } from "./resource-editor-types";
import type { GRPCRouteFormData } from "./grpcroute-form";

function createEmptyRule() {
  return {
    matches: [{ service: "", method: "" }],
    backends: [{ name: "", namespace: "default", port: 50051, weight: 100 }],
  };
}

function readBackends(rawBackends: unknown, namespace: string) {
  if (!Array.isArray(rawBackends) || rawBackends.length === 0) {
    return [{ name: "", namespace, port: 50051, weight: 100 }];
  }

  return rawBackends.map((rawBackend) => {
    const backend =
      rawBackend && typeof rawBackend === "object" && !Array.isArray(rawBackend)
        ? (rawBackend as Record<string, unknown>)
        : {};

    return {
      name: String(backend.name ?? ""),
      namespace: String(backend.namespace ?? namespace),
      port: Number(backend.port ?? 50051),
      weight: Number(backend.weight ?? 100),
    };
  });
}

export function createEmptyGRPCRouteFormData(): GRPCRouteFormData {
  return {
    name: "",
    namespace: "default",
    gatewayName: "",
    gatewayNamespace: "default",
    hostnames: "",
    rules: [createEmptyRule()],
  };
}

export function grpcRouteResourceToFormData(
  resource: ManagedResource | KubernetesResource
): GRPCRouteFormData {
  const fallbackName =
    "name" in resource && typeof resource.name === "string" ? resource.name : "";
  const fallbackNamespace =
    "namespace" in resource && typeof resource.namespace === "string"
      ? resource.namespace
      : "default";
  const unwrapped = unwrapResource(resource) as ManifestRecord;
  const spec = (unwrapped.spec ?? {}) as Record<string, unknown>;
  const metadata = (unwrapped.metadata ?? {}) as Record<string, unknown>;
  const metadataNamespace = String(metadata.namespace ?? fallbackNamespace);
  const parentRefs = Array.isArray(spec.parentRefs) ? spec.parentRefs : [];
  const parentRef =
    parentRefs[0] && typeof parentRefs[0] === "object" && !Array.isArray(parentRefs[0])
      ? (parentRefs[0] as Record<string, unknown>)
      : {};

  const rules = Array.isArray(spec.rules)
    ? spec.rules.map((rawRule) => {
        const rule =
          rawRule && typeof rawRule === "object" && !Array.isArray(rawRule)
            ? (rawRule as Record<string, unknown>)
            : {};
        const matches = Array.isArray(rule.matches) ? rule.matches : [];
        const match =
          matches[0] && typeof matches[0] === "object" && !Array.isArray(matches[0])
            ? (matches[0] as Record<string, unknown>)
            : {};
        const method =
          match.method && typeof match.method === "object" && !Array.isArray(match.method)
            ? (match.method as Record<string, unknown>)
            : {};

        return {
          matches: [
            {
              service: String(method.service ?? ""),
              method: String(method.method ?? ""),
            },
          ],
          backends: readBackends(rule.backendRefs, metadataNamespace),
        };
      })
    : [];

  return {
    name: String(metadata.name ?? fallbackName),
    namespace: metadataNamespace,
    gatewayName: String(parentRef.name ?? ""),
    gatewayNamespace: String(parentRef.namespace ?? metadataNamespace),
    hostnames: Array.isArray(spec.hostnames) ? spec.hostnames.map(String).join(", ") : "",
    rules: rules.length > 0 ? rules : createEmptyGRPCRouteFormData().rules,
  };
}

export function grpcRouteFormDataToManifest(formData: GRPCRouteFormData): string {
  const hostnameList = formData.hostnames
    .split(",")
    .map((hostname) => hostname.trim())
    .filter((hostname) => hostname);
  const validRules = formData.rules.filter((rule) =>
    rule.backends.some((backend) => backend.name.trim())
  );

  const rulesYaml =
    validRules.length === 0
      ? "  rules: []"
      : `  rules:\n${validRules
          .map((rule) => {
            const validBackends = rule.backends.filter((backend) => backend.name.trim());
            const backendRefsYaml = validBackends
              .map(
                (backend) => `      - name: ${backend.name}
        namespace: ${backend.namespace}
        port: ${backend.port}
        weight: ${backend.weight}`
              )
              .join("\n");

            const match = rule.matches[0] ?? { service: "", method: "" };
            if (match.service.trim() || match.method.trim()) {
              return `  - matches:
    - method:
        service: ${match.service || "*"}
        method: ${match.method || "*"}
    backendRefs:
${backendRefsYaml}`;
            }

            return `  - backendRefs:
${backendRefsYaml}`;
          })
          .join("\n")}`;

  return `apiVersion: gateway.networking.k8s.io/v1
kind: GRPCRoute
metadata:
  name: ${formData.name}
  namespace: ${formData.namespace}
spec:
  parentRefs:
  - kind: Gateway
    group: gateway.networking.k8s.io
    name: ${formData.gatewayName}
    namespace: ${formData.gatewayNamespace}
${hostnameList.length > 0 ? `  hostnames:\n${hostnameList.map((hostname) => `    - "${hostname}"`).join("\n")}\n` : ""}${rulesYaml}
`;
}

export function grpcRouteManifestToFormData(yamlText: string): GRPCRouteFormData {
  const manifest = parseSingleManifest(yamlText);
  assertManifestKind(manifest, "gateway.networking.k8s.io/v1", "GRPCRoute");
  readManifestIdentity(manifest);
  return grpcRouteResourceToFormData(manifest as KubernetesResource);
}

export const grpcRouteEditorCodec: ResourceEditorCodec<GRPCRouteFormData> = {
  apiVersion: "gateway.networking.k8s.io/v1",
  kind: "GRPCRoute",
  toYaml: grpcRouteFormDataToManifest,
  fromYaml: grpcRouteManifestToFormData,
  getIdentity: (formData) => ({
    name: formData.name,
    namespace: formData.namespace,
  }),
};
