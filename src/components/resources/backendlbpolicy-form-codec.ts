import type { ManagedResource, KubernetesResource } from "@/lib/admin-models";
import { unwrapResource } from "@/lib/admin-models";
import {
  assertManifestKind,
  parseSingleManifest,
  readManifestIdentity,
  type ManifestRecord,
} from "@/lib/resource-manifest";
import type { ResourceEditorCodec } from "./resource-editor-types";
import type { BackendLbPolicyFormData } from "./backendlbpolicy-form";

export function createEmptyBackendLbPolicyFormData(): BackendLbPolicyFormData {
  return {
    name: "",
    namespace: "default",
    targetRefs: [{ group: "", kind: "Service", name: "" }],
    sessionEnabled: false,
    sessionName: "",
    sessionType: "Cookie",
    cookieLifetimeType: "Session",
    absoluteTimeout: "",
    idleTimeout: "",
    lbType: "RoundRobin",
    consistentHashKeyType: "SourceIP",
    consistentHashHeaderName: "",
    circuitBreakerEnabled: false,
    maxInflightRequests: "",
  };
}

export function backendLbPolicyResourceToFormData(
  resource: ManagedResource | KubernetesResource
): BackendLbPolicyFormData {
  const fallbackName =
    "name" in resource && typeof resource.name === "string" ? resource.name : "";
  const fallbackNamespace =
    "namespace" in resource && typeof resource.namespace === "string"
      ? resource.namespace
      : "default";
  const unwrapped = unwrapResource(resource) as ManifestRecord;
  const spec = (unwrapped.spec ?? {}) as Record<string, unknown>;
  const metadata = (unwrapped.metadata ?? {}) as Record<string, unknown>;
  const targetRefs = Array.isArray(spec.targetRefs)
    ? spec.targetRefs.map((ref: Record<string, unknown>) => ({
        group: String(ref.group ?? ""),
        kind: String(ref.kind ?? "Service"),
        name: String(ref.name ?? ""),
      }))
    : createEmptyBackendLbPolicyFormData().targetRefs;

  const sessionPersistence = (spec.sessionPersistence ?? {}) as Record<string, unknown>;
  const cookieConfig = (sessionPersistence?.cookieConfig ?? {}) as Record<string, unknown>;
  const loadBalancing = (spec.loadBalancing ?? {}) as Record<string, unknown>;
  const consistentHash = (loadBalancing?.consistentHash ?? {}) as Record<string, unknown>;
  const circuitBreaker = (spec.circuitBreaker ?? {}) as Record<string, unknown>;

  return {
    name: String(metadata.name ?? fallbackName),
    namespace: String(metadata.namespace ?? fallbackNamespace),
    targetRefs:
      targetRefs.length > 0
        ? targetRefs
        : createEmptyBackendLbPolicyFormData().targetRefs,
    sessionEnabled: !!sessionPersistence?.type,
    sessionName: String(sessionPersistence?.sessionName ?? ""),
    sessionType: String(sessionPersistence?.type ?? "Cookie"),
    cookieLifetimeType: String(cookieConfig?.lifetimeType ?? "Session"),
    absoluteTimeout: String(sessionPersistence?.absoluteTimeout ?? ""),
    idleTimeout: String(sessionPersistence?.idleTimeout ?? ""),
    lbType: String(loadBalancing?.type ?? "RoundRobin"),
    consistentHashKeyType: String(consistentHash?.keyType ?? "SourceIP"),
    consistentHashHeaderName: String(consistentHash?.headerName ?? ""),
    circuitBreakerEnabled: typeof circuitBreaker?.maxInflightRequests === "number",
    maxInflightRequests:
      typeof circuitBreaker?.maxInflightRequests === "number"
        ? String(circuitBreaker.maxInflightRequests)
        : "",
  };
}

export function backendLbPolicyFormDataToManifest(formData: BackendLbPolicyFormData): string {
  const validTargetRefs = formData.targetRefs.filter((ref) => ref.name.trim());
  const targetRefsYaml = validTargetRefs
    .map(
      (ref) =>
        `  - group: ${ref.group || '""'}\n    kind: ${ref.kind}\n    name: ${ref.name}`
    )
    .join("\n");

  let sessionPersistenceYaml = "";
  if (formData.sessionEnabled) {
    const parts: string[] = [];
    if (formData.sessionName) {
      parts.push(`    sessionName: ${formData.sessionName}`);
    }
    parts.push(`    type: ${formData.sessionType}`);
    if (formData.absoluteTimeout) {
      parts.push(`    absoluteTimeout: ${formData.absoluteTimeout}`);
    }
    if (formData.idleTimeout) {
      parts.push(`    idleTimeout: ${formData.idleTimeout}`);
    }
    if (formData.sessionType === "Cookie") {
      parts.push(`    cookieConfig:\n      lifetimeType: ${formData.cookieLifetimeType}`);
    }
    sessionPersistenceYaml = `\n  sessionPersistence:\n${parts.join("\n")}`;
  }

  let loadBalancingYaml = "";
  if (formData.lbType && formData.lbType !== "RoundRobin") {
    const lbLines: string[] = [];
    lbLines.push(`    type: ${formData.lbType}`);
    if (formData.lbType === "ConsistentHash") {
      lbLines.push(`    consistentHash:`);
      lbLines.push(`      keyType: ${formData.consistentHashKeyType}`);
      if (
        formData.consistentHashKeyType === "Header" &&
        formData.consistentHashHeaderName.trim()
      ) {
        lbLines.push(`      headerName: ${formData.consistentHashHeaderName.trim()}`);
      }
    }
    loadBalancingYaml = `\n  loadBalancing:\n${lbLines.join("\n")}`;
  }

  let circuitBreakerYaml = "";
  if (formData.circuitBreakerEnabled && formData.maxInflightRequests.trim()) {
    circuitBreakerYaml = `\n  circuitBreaker:\n    maxInflightRequests: ${formData.maxInflightRequests.trim()}`;
  }

  return `apiVersion: gateway.networking.k8s.io/v1alpha2
kind: BackendLBPolicy
metadata:
  name: ${formData.name}
  namespace: ${formData.namespace}
spec:
  targetRefs:
${targetRefsYaml}${sessionPersistenceYaml}${loadBalancingYaml}${circuitBreakerYaml}
`;
}

export function backendLbPolicyManifestToFormData(yamlText: string): BackendLbPolicyFormData {
  const manifest = parseSingleManifest(yamlText);
  assertManifestKind(manifest, "gateway.networking.k8s.io/v1alpha2", "BackendLBPolicy");
  readManifestIdentity(manifest);
  return backendLbPolicyResourceToFormData(manifest as unknown as KubernetesResource);
}

export const backendLbPolicyEditorCodec: ResourceEditorCodec<BackendLbPolicyFormData> = {
  apiVersion: "gateway.networking.k8s.io/v1alpha2",
  kind: "BackendLBPolicy",
  toYaml: backendLbPolicyFormDataToManifest,
  fromYaml: backendLbPolicyManifestToFormData,
  getIdentity: (formData) => ({
    name: formData.name,
    namespace: formData.namespace,
  }),
};
