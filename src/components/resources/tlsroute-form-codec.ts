import type { ManagedResource, KubernetesResource } from "@/lib/admin-models";
import { unwrapResource } from "@/lib/admin-models";
import {
  assertManifestKind,
  parseSingleManifest,
  readManifestIdentity,
  type ManifestRecord,
} from "@/lib/resource-manifest";
import type { ResourceEditorCodec } from "./resource-editor-types";
import type { TLSRouteFormData } from "./tlsroute-form";

function createEmptyBackend(namespace = "default") {
  return { name: "", namespace, port: 443, weight: 100 };
}

export function createEmptyTLSRouteFormData(): TLSRouteFormData {
  return {
    name: "",
    namespace: "default",
    gatewayName: "",
    gatewayNamespace: "default",
    sniHosts: "",
    backends: [createEmptyBackend()],
  };
}

export function tlsRouteResourceToFormData(
  resource: ManagedResource | KubernetesResource
): TLSRouteFormData {
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
    sniHosts: Array.isArray(spec.hostnames) ? spec.hostnames.map(String).join(", ") : "",
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
              port: Number(backend.port ?? 443),
              weight: Number(backend.weight ?? 100),
            };
          })
        : createEmptyTLSRouteFormData().backends,
  };
}

export function tlsRouteFormDataToManifest(formData: TLSRouteFormData): string {
  const sniList = formData.sniHosts
    .split(",")
    .map((host) => host.trim())
    .filter((host) => host);
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
kind: TLSRoute
metadata:
  name: ${formData.name}
  namespace: ${formData.namespace}
spec:
  parentRefs:
  - kind: Gateway
    group: gateway.networking.k8s.io
    name: ${formData.gatewayName}
    namespace: ${formData.gatewayNamespace}
${sniList.length > 0 ? `  hostnames:\n${sniList.map((host) => `    - "${host}"`).join("\n")}\n` : ""}  rules:
${backendRefsYaml}
`;
}

export function tlsRouteManifestToFormData(yamlText: string): TLSRouteFormData {
  const manifest = parseSingleManifest(yamlText);
  assertManifestKind(manifest, "gateway.networking.k8s.io/v1", "TLSRoute");
  readManifestIdentity(manifest);
  return tlsRouteResourceToFormData(manifest as KubernetesResource);
}

export const tlsRouteEditorCodec: ResourceEditorCodec<TLSRouteFormData> = {
  apiVersion: "gateway.networking.k8s.io/v1",
  kind: "TLSRoute",
  toYaml: tlsRouteFormDataToManifest,
  fromYaml: tlsRouteManifestToFormData,
  getIdentity: (formData) => ({
    name: formData.name,
    namespace: formData.namespace,
  }),
};
