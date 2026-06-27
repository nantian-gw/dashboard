import type { ManagedResource, KubernetesResource } from "@/lib/admin-models";
import { unwrapResource } from "@/lib/admin-models";
import {
  assertManifestKind,
  parseSingleManifest,
  readManifestIdentity,
  type ManifestRecord,
} from "@/lib/resource-manifest";
import type { ResourceEditorCodec } from "./resource-editor-types";
import type { BackendTlsFormData } from "./backendtls-form";

export function createEmptyBackendTlsFormData(): BackendTlsFormData {
  return {
    name: "",
    namespace: "default",
    targetGroup: "",
    targetKind: "Service",
    targetName: "",
    hostname: "",
    caRefs: [{ name: "", group: "", kind: "ConfigMap" }],
  };
}

export function backendTlsResourceToFormData(
  resource: ManagedResource | KubernetesResource
): BackendTlsFormData {
  const fallbackName =
    "name" in resource && typeof resource.name === "string" ? resource.name : "";
  const fallbackNamespace =
    "namespace" in resource && typeof resource.namespace === "string"
      ? resource.namespace
      : "default";
  const unwrapped = unwrapResource(resource) as ManifestRecord;
  const spec = (unwrapped.spec ?? {}) as Record<string, unknown>;
  const metadata = (unwrapped.metadata ?? {}) as Record<string, unknown>;
  const targetRef = (spec.targetRef ?? {}) as Record<string, unknown>;
  const validation = (spec.validation ?? {}) as Record<string, unknown>;

  return {
    name: String(metadata.name ?? fallbackName),
    namespace: String(metadata.namespace ?? fallbackNamespace),
    targetGroup: String(targetRef.group ?? ""),
    targetKind: String(targetRef.kind ?? "Service"),
    targetName: String(targetRef.name ?? ""),
    hostname: String(validation.hostname ?? ""),
    caRefs:
      Array.isArray(validation.caCertificateRefs) && validation.caCertificateRefs.length > 0
        ? validation.caCertificateRefs.map((ref: Record<string, unknown>) => ({
            name: String(ref.name ?? ""),
            group: String(ref.group ?? ""),
            kind: String(ref.kind ?? "ConfigMap"),
          }))
        : createEmptyBackendTlsFormData().caRefs,
  };
}

export function backendTlsFormDataToManifest(formData: BackendTlsFormData): string {
  const validCaRefs = formData.caRefs.filter((ref) => ref.name.trim());
  const caRefsYaml =
    validCaRefs.length === 0
      ? ""
      : `\n    caCertificateRefs:\n${validCaRefs
          .map(
            (ref) =>
              `    - name: ${ref.name}\n      group: ${ref.group || '""'}\n      kind: ${ref.kind}`
          )
          .join("\n")}`;

  return `apiVersion: gateway.networking.k8s.io/v1alpha3
kind: BackendTLSPolicy
metadata:
  name: ${formData.name}
  namespace: ${formData.namespace}
spec:
  targetRef:
    group: ${formData.targetGroup || '""'}
    kind: ${formData.targetKind}
    name: ${formData.targetName}
  validation:
    hostname: ${formData.hostname || '""'}${caRefsYaml}
`;
}

export function backendTlsManifestToFormData(yamlText: string): BackendTlsFormData {
  const manifest = parseSingleManifest(yamlText);
  assertManifestKind(manifest, "gateway.networking.k8s.io/v1alpha3", "BackendTLSPolicy");
  readManifestIdentity(manifest);
  return backendTlsResourceToFormData(manifest as unknown as KubernetesResource);
}

export const backendTlsEditorCodec: ResourceEditorCodec<BackendTlsFormData> = {
  apiVersion: "gateway.networking.k8s.io/v1alpha3",
  kind: "BackendTLSPolicy",
  toYaml: backendTlsFormDataToManifest,
  fromYaml: backendTlsManifestToFormData,
  getIdentity: (formData) => ({
    name: formData.name,
    namespace: formData.namespace,
  }),
};
