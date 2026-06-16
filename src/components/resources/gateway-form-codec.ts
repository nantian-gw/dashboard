import type { ManagedResource, KubernetesResource } from "@/lib/admin-models";
import { unwrapResource } from "@/lib/admin-models";
import {
  assertManifestKind,
  parseSingleManifest,
  readManifestIdentity,
  type ManifestRecord,
} from "@/lib/resource-manifest";
import type { ResourceEditorCodec } from "./resource-editor-types";
import type { GatewayFormData } from "./gateway-form";

function createEmptyListener() {
  return { port: 80, protocol: "HTTP", name: "http" };
}

export function createEmptyGatewayFormData(): GatewayFormData {
  return {
    name: "",
    namespace: "default",
    gatewayClass: "nantian",
    listeners: [createEmptyListener()],
  };
}

export function gatewayResourceToFormData(
  resource: ManagedResource | KubernetesResource
): GatewayFormData {
  const fallbackName =
    "name" in resource && typeof resource.name === "string" ? resource.name : "";
  const fallbackNamespace =
    "namespace" in resource && typeof resource.namespace === "string"
      ? resource.namespace
      : "default";
  const unwrapped = unwrapResource(resource) as ManifestRecord;
  const spec = (unwrapped.spec ?? {}) as Record<string, any>;
  const metadata = (unwrapped.metadata ?? {}) as Record<string, any>;
  const listeners =
    Array.isArray(spec.listeners) && spec.listeners.length > 0
      ? spec.listeners.map((listener: any) => {
          const entry = {
            name: String(listener.name ?? ""),
            port:
              typeof listener.port === "number"
                ? listener.port
                : parseInt(String(listener.port), 10) || 0,
            protocol: String(listener.protocol ?? "HTTP"),
          } as GatewayFormData["listeners"][number];

          if (listener.tls) {
            entry.tls = {
              mode: String(listener.tls.mode ?? "Terminate"),
              certificateRefs: Array.isArray(listener.tls.certificateRefs)
                ? listener.tls.certificateRefs.map((ref: any) => ({
                    name: String(ref.name ?? ""),
                    namespace: String(ref.namespace ?? ""),
                    kind: String(ref.kind ?? "Secret"),
                    group: String(ref.group ?? ""),
                  }))
                : [],
            };
          }

          return entry;
        })
      : createEmptyGatewayFormData().listeners;

  return {
    name: String(metadata.name ?? fallbackName),
    namespace: String(metadata.namespace ?? fallbackNamespace),
    gatewayClass: String(spec.gatewayClassName ?? "nantian"),
    listeners,
  };
}

export function gatewayFormDataToManifest(formData: GatewayFormData): string {
  const listenersYaml = formData.listeners
    .map((listener) => {
      const lines = [
        `    - name: ${listener.name}`,
        `      port: ${listener.port}`,
        `      protocol: ${listener.protocol}`,
      ];

      if (listener.tls && (listener.protocol === "HTTPS" || listener.protocol === "TLS")) {
        lines.push("      tls:");
        lines.push(
          `        mode: ${listener.protocol === "HTTPS" ? "Terminate" : listener.tls.mode}`
        );

        const refs = listener.tls.certificateRefs.filter((ref) => ref.name.trim());
        if (refs.length > 0) {
          lines.push("        certificateRefs:");
          for (const ref of refs) {
            lines.push(`        - name: ${ref.name}`);
            lines.push(`          namespace: ${ref.namespace}`);
            if (ref.kind !== "Secret") lines.push(`          kind: ${ref.kind}`);
            if (ref.group) lines.push(`          group: ${ref.group}`);
          }
        }
      }

      return lines.join("\n");
    })
    .join("\n");

  return `apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: ${formData.name}
  namespace: ${formData.namespace}
spec:
  gatewayClassName: ${formData.gatewayClass}
  listeners:
${listenersYaml}
`;
}

export function gatewayManifestToFormData(yamlText: string): GatewayFormData {
  const manifest = parseSingleManifest(yamlText);
  assertManifestKind(manifest, "gateway.networking.k8s.io/v1", "Gateway");
  readManifestIdentity(manifest);
  return gatewayResourceToFormData(manifest as KubernetesResource);
}

export const gatewayEditorCodec: ResourceEditorCodec<GatewayFormData> = {
  apiVersion: "gateway.networking.k8s.io/v1",
  kind: "Gateway",
  toYaml: gatewayFormDataToManifest,
  fromYaml: gatewayManifestToFormData,
  getIdentity: (formData) => ({
    name: formData.name,
    namespace: formData.namespace,
  }),
};
