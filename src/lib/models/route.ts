import type {
  KubernetesResource,
  ManagedResource,
  RouteRow,
} from "./types";

import {
  asArray,
  asObject,
  asString,
  firstString,
  resourceObject,
  statusFromConditions,
  toYaml,
  unwrapResource,
} from "./types";

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

// Derives a route's status from its resource `status.parents[0].conditions`,
// mirroring the first-parent Accepted logic used by the routes list (mapRoute).
// Accepts a ManagedResource wrapper or a raw resource; "Unknown" when absent.
export function deriveRouteStatus(resource: ManagedResource | KubernetesResource | undefined): string {
  const k8s = resource ? unwrapResource(resource) : {};
  const parents = asArray(asObject(asObject(k8s).status).parents);
  const conditions = asObject(parents[0]).conditions;
  return statusFromConditions(conditions, "Accepted", "Accepted");
}
