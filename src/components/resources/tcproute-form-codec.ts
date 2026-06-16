import type { ManagedResource, KubernetesResource } from "@/lib/admin-models";
import { unwrapResource } from "@/lib/admin-models";
import {
  assertManifestKind,
  parseSingleManifest,
  readManifestIdentity,
  type ManifestRecord,
} from "@/lib/resource-manifest";
import type { ResourceEditorCodec } from "./resource-editor-types";
import type { TCPRouteFormData } from "./tcproute-form";

function createEmptyBackend(namespace = "default") {
  return { name: "", namespace, port: 80, weight: 100 };
}

export function createEmptyTCPRouteFormData(): TCPRouteFormData {
  return {
    name: "",
    namespace: "default",
    gatewayName: "",
    gatewayNamespace: "default",
    backends: [createEmptyBackend()],
  };
}

export function tcpRouteResourceToFormData(
  resource: ManagedResource | KubernetesResource
): TCPRouteFormData {
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
  const rules = Array.isArray(spec.rules) ? spec.rules : [];
  const rule =
    rules[0] && typeof rules[0] === "object" && !Array.isArray(rules[0])
      ? (rules[0] as Record<string, unknown>)
      : {};
  const backendRefs = Array.isArray(rule.backendRefs) ? rule.backendRefs : [];

  return {
    name: String(metadata.name ?? fallbackName),
    namespace: metadataNamespace,
    gatewayName: String(parentRef.name ?? ""),
    gatewayNamespace: String(parentRef.namespace ?? metadataNamespace),
    backends:
      backendRefs.length > 0
        ? backendRefs.map((rawBackend) => {
            const backend =
              rawBackend && typeof rawBackend === "object" && !Array.isArray(rawBackend)
                ? (rawBackend as Record<string, unknown>)
                : {};

            return {
              name: String(backend.name ?? ""),
              namespace: String(backend.namespace ?? metadataNamespace),
              port: Number(backend.port ?? 80),
              weight: Number(backend.weight ?? 100),
            };
          })
        : createEmptyTCPRouteFormData().backends,
  };
}

export function tcpRouteFormDataToManifest(formData: TCPRouteFormData): string {
  const validBackends = formData.backends.filter((backend) => backend.name.trim());
  const backendRefsYaml =
    validBackends.length === 0
      ? "  - backendRefs: []"
      : `  - backendRefs:\n${validBackends
          .map(
            (backend) => `    - name: ${backend.name}
      namespace: ${backend.namespace}
      port: ${backend.port}
      weight: ${backend.weight}`
          )
          .join("\n")}`;

  return `apiVersion: gateway.networking.k8s.io/v1
kind: TCPRoute
metadata:
  name: ${formData.name}
  namespace: ${formData.namespace}
spec:
  parentRefs:
  - kind: Gateway
    group: gateway.networking.k8s.io
    name: ${formData.gatewayName}
    namespace: ${formData.gatewayNamespace}
  rules:
${backendRefsYaml}
`;
}

export function tcpRouteManifestToFormData(yamlText: string): TCPRouteFormData {
  const manifest = parseSingleManifest(yamlText);
  assertManifestKind(manifest, "gateway.networking.k8s.io/v1", "TCPRoute");
  readManifestIdentity(manifest);
  return tcpRouteResourceToFormData(manifest as KubernetesResource);
}

export const tcpRouteEditorCodec: ResourceEditorCodec<TCPRouteFormData> = {
  apiVersion: "gateway.networking.k8s.io/v1",
  kind: "TCPRoute",
  toYaml: tcpRouteFormDataToManifest,
  fromYaml: tcpRouteManifestToFormData,
  getIdentity: (formData) => ({
    name: formData.name,
    namespace: formData.namespace,
  }),
};
