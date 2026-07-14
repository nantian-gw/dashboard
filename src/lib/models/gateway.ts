import type {
  BackendLbPolicyRow,
  BackendTlsPolicyRow,
  GatewayRow,
  JsonObject,
  ListenerRow,
  ManagedResource,
  RouteRow,
  TokenPolicyRow,
} from "./types";

import {
  asArray,
  asNumber,
  asObject,
  asString,
  namedResourceValue,
  resourceObject,
  resourceSpec,
  resourceStatus,
  statusFromConditions,
  toYaml,
} from "./types";

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

// ── Policy resource mappers ──

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

export function mapBackendLbPolicyResource(item: ManagedResource): BackendLbPolicyRow {
  const spec = resourceSpec(item);
  const status = resourceStatus(item);
  const targetRefs = asArray(spec.targetRefs).map(asObject);
  const sessionPersistence = asObject(spec.sessionPersistence);
  const loadBalancing = asObject(spec.loadBalancing);
  const circuitBreaker = asObject(spec.circuitBreaker);

  const lbType = asString(loadBalancing.type);
  const spType = asString(sessionPersistence.type);
  const cbMaxInflight = circuitBreaker.maxInflightRequests;

  return {
    name: namedResourceValue(item, "name"),
    namespace: namedResourceValue(item, "namespace"),
    targetRefs,
    sessionPersistence: spType || undefined,
    loadBalancing: lbType || undefined,
    circuitBreaker:
      typeof cbMaxInflight === "number" ? `maxInflight: ${cbMaxInflight}` : undefined,
    status: statusFromConditions(status.conditions, "Accepted", "Accepted"),
  };
}
