import yaml from "js-yaml";

type JsonObject = Record<string, unknown>;

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



type ListenerHealthCounts = {
  readyListenerCount: number;
  warningListenerCount: number;
  failedListenerCount: number;
};

function asObject(value: unknown): JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** Coerce a value to ManagedResource[], defending against null/undefined from API responses. */
export function asManagedResourceArray(value: unknown): ManagedResource[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function hasNumber(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value);
}

function listenersFromPayload(payload: unknown): unknown[] {
  const data = asObject(payload);
  const listeners = asArray(data.listeners);
  return listeners.length > 0 ? listeners : asArray(payload);
}

function deriveListenerHealthCounts(listenersPayload: unknown): ListenerHealthCounts {
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

function resourceObject(item: ManagedResource): JsonObject {
  return asObject(item.resource);
}

function resourceMetadata(item: ManagedResource): JsonObject {
  return asObject(resourceObject(item).metadata);
}

function resourceSpec(item: ManagedResource): JsonObject {
  return asObject(resourceObject(item).spec);
}

function resourceStatus(item: ManagedResource): JsonObject {
  return asObject(resourceObject(item).status);
}

function namedResourceValue(item: ManagedResource, key: "name" | "namespace"): string {
  return asString(item[key]) || asString(resourceMetadata(item)[key]);
}

function conditionFrom(conditions: unknown, type: string): JsonObject {
  return asObject(
    asArray(conditions).find((condition) => asObject(condition).type === type)
  );
}

function conditionTrue(conditions: unknown, type: string): boolean {
  return conditionFrom(conditions, type).status === "True";
}

function conditionReason(conditions: unknown, type: string): string {
  return asString(conditionFrom(conditions, type).reason);
}

function statusFromConditions(
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

function firstString(values: unknown[]): string {
  for (const value of values) {
    const str = asString(value);
    if (str) return str;
  }
  return "";
}

function gatewayAddress(status: JsonObject): string {
  const firstAddress = asObject(asArray(status.addresses)[0]);
  return asString(firstAddress.value);
}

function gatewayListeners(item: ManagedResource): ListenerRow[] {
  const specListeners = asArray(resourceSpec(item).listeners);
  const statusListeners = asArray(resourceStatus(item).listeners).map(asObject);

  return specListeners.map((listener) => {
    const spec = asObject(listener);
    const name = asString(spec.name);
    const listenerStatus = statusListeners.find((status) => status.name === name) || {};
    const conditions = listenerStatus.conditions;
    const hostname = asString(spec.hostname);

    const allowedRoutes = spec.allowedRoutes;
    const allowedRoutesObj = allowedRoutes ? asObject(allowedRoutes) : undefined;
    const namespaces = allowedRoutesObj?.namespaces ? asObject(allowedRoutesObj.namespaces) : undefined;
    const kinds = allowedRoutesObj?.kinds ? asArray(allowedRoutesObj.kinds) : undefined;

    const tls = spec.tls ? asObject(spec.tls) : undefined;
    const filters = spec.filters ? asArray(spec.filters) : undefined;

    const allowedKinds = kinds?.map((k) => {
        const kObj = k as JsonObject;
        return {
          group: asString(kObj.group),
          kind: asString(kObj.kind),
        };
      });

      return {
        name,
        protocol: asString(spec.protocol),
        port: asNumber(spec.port),
        hostnames: hostname ? [hostname] : [],
        status: statusFromConditions(conditions, "Programmed", "Ready"),
        hostname: hostname || undefined,
        allowedRoutes: allowedRoutesObj ? {
          namespaces: namespaces ? {
            from: asString(namespaces.from),
            selector: namespaces.selector as JsonObject | undefined,
          } : undefined,
          kinds: allowedKinds,
        } : undefined,
        tls: tls ? {
          certificateRefs: tls.certificateRefs ? asArray(tls.certificateRefs).map((c) => c as JsonObject) : undefined,
          mode: asString(tls.mode),
          options: tls.options ? asObject(tls.options) : undefined,
        } : undefined,
        filters: filters?.map((f) => asObject(f)),
      };
    });
}

function attachedRouteCount(status: JsonObject): number {
  return asArray(status.listeners).reduce<number>(
    (sum, listener) => sum + asNumber(asObject(listener).attachedRoutes),
    0
  );
}

export function mapGatewayResource(item: ManagedResource, routes: RouteRow[] = []): GatewayRow {
  const status = resourceStatus(item);
  const conditions = status.conditions;
  const name = namedResourceValue(item, "name");
  const namespace = namedResourceValue(item, "namespace");
  const attachedRoutes = routes.filter((route) =>
    route.parentRefs.some((parent) => {
      const kind = asString(parent.kind, "Gateway");
      const parentNamespace = asString(parent.namespace, namespace);
      return kind === "Gateway" && parent.name === name && parentNamespace === namespace;
    })
  );

  const listeners = gatewayListeners(item);

  return {
    name,
    namespace,
    gatewayClass: asString(resourceSpec(item).gatewayClassName, "nantian"),
    status: statusFromConditions(conditions, "Programmed", "Ready"),
    address: gatewayAddress(status),
    listenerCount: listeners.length,
    routeCount: attachedRoutes.length || attachedRouteCount(status),
    listeners,
    routes: attachedRoutes,
    manifest: toYaml(resourceObject(item)),
  };
}

function mapRoute(route: unknown, kind: string): RouteRow {
  const item = asObject(route);
  const rules = asArray(item.rules).map(asObject);
  const backendRefs = rules.flatMap((rule) => asArray(rule.backendRefs).map(asObject));
  const firstBackend = backendRefs[0] || {};
  const parentRefs = asArray(item.parentRefs).map(asObject);
  const firstParent = parentRefs[0] || {};
  const parents = asObject(item.status).parents;
  const parentStatus = asObject(asArray(parents)[0]);
  const parentStatusConditions = parentStatus.conditions;

  return {
    kind,
    name: asString(item.name),
    namespace: asString(item.namespace),
    parent: firstString([
      asString(firstParent.namespace)
        ? `${asString(firstParent.namespace)}/${asString(firstParent.name)}`
        : asString(firstParent.name),
    ]),
    parentRefs,
    hostnames: asArray(item.hostnames).map((hostname) => asString(hostname)).filter(Boolean),
    backend: firstString([
      asString(firstBackend.namespace)
        ? `${asString(firstBackend.namespace)}/${asString(firstBackend.name)}`
        : asString(firstBackend.name),
    ]),
    backendCount: backendRefs.length,
    status: statusFromConditions(parentStatusConditions, "Accepted", "Accepted"),
    manifest: toYaml(resourceObject(item)),
  };
}

export function mapRoutesPayload(payload: unknown): RouteRow[] {
  const data = asObject(payload);
  return [
    ...asArray(data.http).map((route) => mapRoute(route, "HTTPRoute")),
    ...asArray(data.grpc).map((route) => mapRoute(route, "GRPCRoute")),
    ...asArray(data.stream).map((route) => {
      const item = asObject(route);
      return mapRoute(route, `${asString(item.kind, "Stream")}Route`);
    }),
  ];
}

export function mapTokenPolicyResource(item: ManagedResource): TokenPolicyRow {
  const spec = resourceSpec(item);
  const status = resourceStatus(item);
  const targetRefs = asArray(spec.targetRefs).map(asObject);

  return {
    name: namedResourceValue(item, "name"),
    namespace: namedResourceValue(item, "namespace"),
    targetRefs,
    tokensPerMinute: asNumber(spec.tokensPerMinute) || undefined,
    tokensPerHour: asNumber(spec.tokensPerHour) || undefined,
    requestsPerMinute: asNumber(spec.requestsPerMinute) || undefined,
    scope: asString(spec.scope) || undefined,
    burst: asNumber(spec.burst) || undefined,
    onLimit: asString(spec.onLimit) || undefined,
    status: statusFromConditions(status.conditions, "Accepted", "Accepted"),
  };
}

export function mapBackendTlsPolicyResource(item: ManagedResource): BackendTlsPolicyRow {
  const spec = resourceSpec(item);
  const status = resourceStatus(item);
  const validation = asObject(spec.validation);
  const caRefs = asArray(validation.caCertificateRefs).map(asObject);
  const targetRef = asObject(spec.targetRef);

  return {
    name: namedResourceValue(item, "name"),
    namespace: namedResourceValue(item, "namespace"),
    targetRef,
    caCertificate: caRefs.map((ref) => asString(ref.name)).filter(Boolean).join(", "),
    status: statusFromConditions(status.conditions, "Accepted", "Accepted"),
  };
}

export function mapNodePayload(payload: unknown): NodeRow[] {
  return asArray(payload).map((node) => {
    const item = asObject(node);
    const lastAckVersion = asString(item.lastAckVersion);
    const lastSentVersion = asString(item.lastSentVersion);
    const connected = item.connected !== false;

    // A node is ready when: connected, explicitly marked ready, AND has acked
    // at least one snapshot (has a lastAckVersion). If connected but never acked,
    // treat as "Unknown" rather than "Ready" since the node may be stuck.
    const ready = connected
      && item.ready === true
      && lastAckVersion.length > 0;

    const status = connected
      ? (ready ? "Ready" : "Unknown")
      : "Disconnected";

    return {
      name: asString(item.nodeId),
      connected,
      ready,
      status,
      ackState: connected ? asString(item.lastConfigStatus, ready ? "ACK" : "Unknown") : "Disconnected",
      snapshotVersion: lastAckVersion || lastSentVersion,
      lastSeen: asString(item.lastSeenAt),
      drifted: connected && Boolean(lastAckVersion && lastSentVersion && lastAckVersion !== lastSentVersion),
    };
  });
}

export function mapDiagnostics(
  controlplaneSummary: unknown,
  infrastructure: unknown,
  dataplaneSummary: unknown
): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];

  for (const warning of asArray(asObject(controlplaneSummary).warnings)) {
    issues.push({
      severity: "warning",
      title: asString(warning, "Controlplane warning"),
      source: "controlplane",
    });
  }

  for (const warning of asArray(asObject(infrastructure).warnings)) {
    issues.push({
      severity: "warning",
      title: asString(warning, "Infrastructure warning"),
      source: "infrastructure",
    });
  }

  const dataplaneAvailability = asObject(asObject(dataplaneSummary).availability);
  if (asString(dataplaneAvailability.state) === "degraded") {
    issues.push({
      severity: "warning",
      title: "Dataplane summary unavailable",
      description:
        "Traffic and dataplane diagnostics are limited because the current dashboard session cannot access dataplane /v1/summary.",
      source: "dataplane",
    });
  }

  const warningOverview = asObject(asObject(dataplaneSummary).warningOverview);
  for (const warning of asArray(warningOverview.messages)) {
    issues.push({
      severity: "warning",
      title: asString(warning, "Dataplane warning"),
      source: "dataplane",
    });
  }

  return issues;
}



