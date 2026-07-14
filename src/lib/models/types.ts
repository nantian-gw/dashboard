import yaml from "js-yaml";

export type JsonObject = Record<string, unknown>;

export function toYaml(obj: unknown): string {
  try {
    return yaml.dump(obj, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      sortKeys: false,
    });
  } catch (e) {
    console.error("YAML dump error:", e);
    return String(obj);
  }
}

/** A Kubernetes-style resource with metadata and spec. */
export type KubernetesResource = {
  metadata?: {
    name?: string;
    namespace?: string;
  };
  spec?: Record<string, unknown>;
  [key: string]: unknown;
};

export type ManagedResource = {
  kind?: string;
  namespace?: string;
  name?: string;
  resource?: KubernetesResource;
};

/** Extract the inner resource from a ManagedResource wrapper, or return the resource as-is. */
export function unwrapResource<R extends KubernetesResource = KubernetesResource>(
  resource: ManagedResource | R
): R {
  if (resource && typeof resource === "object" && "resource" in resource && resource.resource) {
    return resource.resource as R;
  }
  return resource as R;
}

export type GatewayRow = {
  name: string;
  namespace: string;
  gatewayClass: string;
  status: string;
  address: string;
  listenerCount: number;
  routeCount: number;
  listeners: ListenerRow[];
  routes: RouteRow[];
  manifest: string;
};

export type ListenerRow = {
  name: string;
  protocol: string;
  port: number;
  hostnames: string[];
  status: string;
  hostname?: string;
  allowedRoutes?: {
    namespaces?: {
      from?: string;
      selector?: JsonObject;
    };
    kinds?: Array<{ group: string; kind: string }>;
  };
  tls?: {
    certificateRefs?: JsonObject[];
    mode?: string;
    options?: JsonObject;
  };
  filters?: JsonObject[];
  allowedKinds?: Array<{ group: string; kind: string }>;
};

export type RouteRow = {
  kind: string;
  name: string;
  namespace: string;
  parent: string;
  parentRefs: JsonObject[];
  hostnames: string[];
  backend: string;
  backendCount: number;
  status: string;
  manifest?: string;
};

export type BackendTlsPolicyRow = {
  name: string;
  namespace: string;
  targetRef?: JsonObject;
  caCertificate: string;
  status: string;
};

export type BackendLbPolicyRow = {
  name: string;
  namespace: string;
  targetRefs: JsonObject[];
  sessionPersistence?: string;
  loadBalancing?: string;
  circuitBreaker?: string;
  status: string;
};

export type TokenPolicyRow = {
  name: string;
  namespace: string;
  targetRefs: JsonObject[];
  tokensPerMinute?: number;
  tokensPerHour?: number;
  requestsPerMinute?: number;
  scope?: string;
  burst?: number;
  onLimit?: string;
  status: string;
};

export type NodeRow = {
  name: string;
  connected: boolean;
  ready: boolean;
  status: string;
  ackState: string;
  snapshotVersion: string;
  lastSeen: string;
  drifted: boolean;
};

export type DiagnosticIssue = {
  severity: "warning" | "info" | "error";
  title: string;
  description?: string;
  source: string;
  resource?: string;
};

// ── Internal helpers ──

export type ListenerHealthCounts = {
  readyListenerCount: number;
  warningListenerCount: number;
  failedListenerCount: number;
};

export function asObject(value: unknown): JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** Coerce a value to ManagedResource[], defending against null/undefined from API responses. */
export function asManagedResourceArray(value: unknown): ManagedResource[] {
  return Array.isArray(value) ? value : [];
}

export function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function hasNumber(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value);
}

export function resourceObject(item: ManagedResource): JsonObject {
  return asObject(item.resource);
}

export function resourceMetadata(item: ManagedResource): JsonObject {
  return asObject(resourceObject(item).metadata);
}

export function resourceSpec(item: ManagedResource): JsonObject {
  return asObject(resourceObject(item).spec);
}

export function resourceStatus(item: ManagedResource): JsonObject {
  return asObject(resourceObject(item).status);
}

export function namedResourceValue(item: ManagedResource, key: "name" | "namespace"): string {
  return asString(item[key]) || asString(resourceMetadata(item)[key]);
}

export function conditionFrom(conditions: unknown, type: string): JsonObject {
  return asObject(
    asArray(conditions).find((condition) => asObject(condition).type === type)
  );
}

export function conditionTrue(conditions: unknown, type: string): boolean {
  return conditionFrom(conditions, type).status === "True";
}

export function conditionReason(conditions: unknown, type: string): string {
  return asString(conditionFrom(conditions, type).reason);
}

export function statusFromConditions(
  conditions: unknown,
  readyType: string,
  readyLabel: string,
  acceptedType = "Accepted"
): string {
  if (conditionTrue(conditions, readyType)) return readyLabel;
  if (conditionTrue(conditions, acceptedType)) return "Accepted";
  return (
    conditionReason(conditions, readyType) ||
    conditionReason(conditions, acceptedType) ||
    "Unknown"
  );
}

export function firstString(values: unknown[]): string {
  for (const value of values) {
    const str = asString(value);
    if (str) return str;
  }
  return "";
}

export function listenersFromPayload(payload: unknown): unknown[] {
  const data = asObject(payload);
  const listeners = asArray(data.listeners);
  return listeners.length > 0 ? listeners : asArray(payload);
}

export function deriveListenerHealthCounts(listenersPayload: unknown): ListenerHealthCounts {
  return listenersFromPayload(listenersPayload).reduce<ListenerHealthCounts>(
    (counts, listener) => {
      const status = asString(
        asObject(asObject(asObject(listener).status).programmed).status
      );

      if (status === "True") {
        counts.readyListenerCount += 1;
      } else if (status === "False") {
        counts.failedListenerCount += 1;
      } else {
        counts.warningListenerCount += 1;
      }

      return counts;
    },
    { readyListenerCount: 0, warningListenerCount: 0, failedListenerCount: 0 }
  );
}

export function hasCompleteListenerHealthCounts(summary: unknown): boolean {
  const data = asObject(summary);
  return (
    hasNumber(data.readyListenerCount) &&
    hasNumber(data.warningListenerCount) &&
    hasNumber(data.failedListenerCount)
  );
}

export function mapControlplaneSummary(
  summary: unknown,
  listenersPayload?: unknown
): JsonObject {
  const data = { ...asObject(summary) };
  const derived = deriveListenerHealthCounts(listenersPayload);

  return {
    ...data,
    readyListenerCount: hasNumber(data.readyListenerCount)
      ? data.readyListenerCount
      : derived.readyListenerCount,
    warningListenerCount: hasNumber(data.warningListenerCount)
      ? data.warningListenerCount
      : derived.warningListenerCount,
    failedListenerCount: hasNumber(data.failedListenerCount)
      ? data.failedListenerCount
      : derived.failedListenerCount,
  };
}
