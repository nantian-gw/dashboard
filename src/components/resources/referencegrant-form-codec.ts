import type { ManagedResource, KubernetesResource } from "@/lib/admin-models";
import { unwrapResource } from "@/lib/admin-models";
import {
  assertManifestKind,
  parseSingleManifest,
  readManifestIdentity,
  type ManifestRecord,
} from "@/lib/resource-manifest";
import type { ResourceEditorCodec } from "./resource-editor-types";
import type { ReferenceGrantFormData } from "./referencegrant-form";

export function createEmptyReferenceGrantFormData(): ReferenceGrantFormData {
  return {
    name: "",
    namespace: "default",
    froms: [{ group: "gateway.networking.k8s.io", kind: "HTTPRoute", namespace: "default" }],
    tos: [{ group: "", kind: "Service", name: "" }],
  };
}

export function referenceGrantResourceToFormData(
  resource: ManagedResource | KubernetesResource
): ReferenceGrantFormData {
  const fallbackName =
    "name" in resource && typeof resource.name === "string" ? resource.name : "";
  const fallbackNamespace =
    "namespace" in resource && typeof resource.namespace === "string"
      ? resource.namespace
      : "default";
  const unwrapped = unwrapResource(resource) as ManifestRecord;
  const spec = (unwrapped.spec ?? {}) as Record<string, unknown>;
  const metadata = (unwrapped.metadata ?? {}) as Record<string, unknown>;

  return {
    name: String(metadata.name ?? fallbackName),
    namespace: String(metadata.namespace ?? fallbackNamespace),
    froms:
      Array.isArray(spec.from) && spec.from.length > 0
        ? spec.from.map((entry: Record<string, unknown>) => ({
            group: String(entry.group ?? "gateway.networking.k8s.io"),
            kind: String(entry.kind ?? "HTTPRoute"),
            namespace: String(entry.namespace ?? ""),
          }))
        : createEmptyReferenceGrantFormData().froms,
    tos:
      Array.isArray(spec.to) && spec.to.length > 0
        ? spec.to.map((entry: Record<string, unknown>) => ({
            group: String(entry.group ?? ""),
            kind: String(entry.kind ?? "Service"),
            name: String(entry.name ?? ""),
          }))
        : createEmptyReferenceGrantFormData().tos,
  };
}

export function referenceGrantFormDataToManifest(formData: ReferenceGrantFormData): string {
  const fromYaml = formData.froms
    .map(
      (entry) =>
        `    - group: ${entry.group || "gateway.networking.k8s.io"}\n      kind: ${entry.kind}\n      namespace: ${entry.namespace}`
    )
    .join("\n");
  const toYaml = formData.tos
    .map(
      (entry) =>
        `    - group: ${entry.group || ""}\n      kind: ${entry.kind}${entry.name.trim() ? `\n      name: ${entry.name}` : ""}`
    )
    .join("\n");

  return `apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: ${formData.name}
  namespace: ${formData.namespace}
spec:
  from:
${fromYaml}
  to:
${toYaml}
`;
}

export function referenceGrantManifestToFormData(yamlText: string): ReferenceGrantFormData {
  const manifest = parseSingleManifest(yamlText);
  assertManifestKind(manifest, "gateway.networking.k8s.io/v1beta1", "ReferenceGrant");
  readManifestIdentity(manifest);
  return referenceGrantResourceToFormData(manifest as unknown as KubernetesResource);
}

export const referenceGrantEditorCodec: ResourceEditorCodec<ReferenceGrantFormData> = {
  apiVersion: "gateway.networking.k8s.io/v1beta1",
  kind: "ReferenceGrant",
  toYaml: referenceGrantFormDataToManifest,
  fromYaml: referenceGrantManifestToFormData,
  getIdentity: (formData) => ({
    name: formData.name,
    namespace: formData.namespace,
  }),
};
