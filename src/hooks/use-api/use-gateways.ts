"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { controlplane } from "@/lib/api";
import { mapGatewayResource, mapRoutesPayload, mapBackendTlsPolicyResource, mapBackendLbPolicyResource, mapTokenPolicyResource, deriveRouteStatus, toYaml, asManagedResourceArray, type ManagedResource } from "@/lib/admin-models";

const REFETCH_INTERVAL = (query: { state: { error: unknown } }) => {
  if (typeof document !== "undefined" && document.hidden) return false;
  if (query.state.error) return 60000;
  return 30000 + Math.random() * 5000;
};
const STALE_TIME = 300000;
const GC_TIME = 5 * 60 * 1000;

export function gatewaysQueryOptions() {
  return {
    queryKey: ["gateways"] as const,
    queryFn: async () => {
      const [resources, summary, routesPayload] = await Promise.all([
        controlplane.get<ManagedResource[]>("/v1/resources", { kind: "Gateway" }),
        controlplane.get<Record<string, unknown>>("/v1/summary"),
        controlplane.get("/v1/routes"),
      ]);
      const routes = mapRoutesPayload(routesPayload);
      const summaryObject = (summary && typeof summary === "object" && !Array.isArray(summary)
        ? summary
        : {}) as Record<string, unknown>;
      return {
        gateways: asManagedResourceArray(resources).map((resource) => mapGatewayResource(resource, routes)),
        httpRouteCount: (summaryObject.httpRouteCount as number) ?? 0,
        grpcRouteCount: (summaryObject.grpcRouteCount as number) ?? 0,
      };
    },
    refetchOnWindowFocus: true,
    refetchInterval: REFETCH_INTERVAL,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  };
}

export function gatewayQueryOptions(namespace: string, name: string) {
  return {
    queryKey: ["gateway", namespace, name] as const,
    queryFn: async () => {
      const [resource, routesPayload] = await Promise.all([
        controlplane.get<ManagedResource>(`/v1/resources/gateway/${namespace}/${name}`),
        controlplane.get("/v1/routes"),
      ]);
      return mapGatewayResource(resource, mapRoutesPayload(routesPayload));
    },
    refetchOnWindowFocus: true,
    refetchInterval: REFETCH_INTERVAL,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  };
}

export function routeQueryOptions(namespace: string, name: string, kind: string) {
  return {
    queryKey: ["route", namespace, name, kind] as const,
    queryFn: async () => {
      const r = await controlplane.get<ManagedResource>(
        `/v1/resources/${kind.toLowerCase()}/${namespace}/${name}`
      );
      const rawSpec = (r.resource?.spec || {}) as Record<string, unknown>;
      const rules = (rawSpec.rules as Record<string, unknown>[]) || [];
      const backends: unknown[] = [];
      const pathMatches: string[] = [];

      rules.forEach((rule: Record<string, unknown>) => {
        if (rule.matches) {
          (rule.matches as Record<string, unknown>[]).forEach((m: Record<string, unknown>) => {
            if (m.path) {
              const p = m.path as Record<string, unknown>;
              pathMatches.push(`${String(p.type || "PathPrefix")}: ${String(p.value || "/")}`);
            }
            if (m.headers) pathMatches.push(`Headers: ${(m.headers as unknown[]).length}`);
            if (m.method) pathMatches.push(`Method: ${String(m.method)}`);
          });
        }
        if (rule.backendRefs) {
          (rule.backendRefs as Record<string, unknown>[]).forEach((br: Record<string, unknown>) => {
            backends.push({
              name: br.name,
              namespace: br.namespace || namespace,
              port: br.port,
              weight: br.weight || 0,
            });
          });
        }
      });

      return {
        route: {
          kind,
          name: r.name || name,
          namespace: r.namespace || namespace,
          status: deriveRouteStatus(r),
          hostnames: (rawSpec.hostnames as string[]) || [],
          parentRefs: (rawSpec.parentRefs as Record<string, unknown>[]) || [],
          rules,
          pathMatches,
          backends,
          filters: rules.flatMap((rule: Record<string, unknown>) => (rule.filters as unknown[]) || []),
          timeouts: (rules[0] as Record<string, unknown> | undefined)?.timeouts,
          manifest: toYaml(r.resource || r),
        },
      };
    },
    refetchOnWindowFocus: true,
    refetchInterval: REFETCH_INTERVAL,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  };
}

export function routesQueryOptions() {
  return {
    queryKey: ["routes"] as const,
    queryFn: async () => {
      const payload = await controlplane.get("/v1/routes");
      return { routes: mapRoutesPayload(payload) };
    },
    refetchOnWindowFocus: true,
    refetchInterval: REFETCH_INTERVAL,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  };
}

export function tokenPoliciesQueryOptions() {
  return {
    queryKey: ["token-policies"] as const,
    queryFn: async () => {
      const resources = asManagedResourceArray(
        await controlplane.get<ManagedResource[]>("/v1/resources", {
          kind: "TokenPolicy",
        })
      );
      return { policies: resources.map(mapTokenPolicyResource) };
    },
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  };
}

export function backendTlsQueryOptions() {
  return {
    queryKey: ["backend-tls"] as const,
    queryFn: async () => {
      const resources = asManagedResourceArray(
        await controlplane.get<ManagedResource[]>("/v1/resources", {
          kind: "BackendTLSPolicy",
        })
      );
      return { policies: resources.map(mapBackendTlsPolicyResource) };
    },
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  };
}

export function useGateways(enabled = true) {
  return useQuery({
    ...gatewaysQueryOptions(),
    enabled,
  }) as UseQueryResult<{
    gateways: ReturnType<typeof mapGatewayResource>[];
    httpRouteCount: number;
    grpcRouteCount: number;
  }>;
}

export function useGateway(namespace: string, name: string) {
  return useQuery({
    ...gatewayQueryOptions(namespace, name),
    enabled: !!namespace && !!name,
  }) as UseQueryResult<ReturnType<typeof mapGatewayResource>>;
}

export function useRoute(namespace: string, name: string, kind: string) {
  return useQuery({
    ...routeQueryOptions(namespace, name, kind),
    enabled: !!namespace && !!name && !!kind,
  }) as UseQueryResult<{ route: Record<string, unknown> }>;
}

export function useRoutes(enabled = true) {
  return useQuery({
    ...routesQueryOptions(),
    enabled,
  }) as UseQueryResult<{ routes: ReturnType<typeof mapRoutesPayload> }>;
}

export function useTokenPolicies(enabled = true) {
  return useQuery({
    ...tokenPoliciesQueryOptions(),
    enabled,
  }) as UseQueryResult<{ policies: ReturnType<typeof mapTokenPolicyResource>[] }>;
}

export function useBackendTls(enabled = true) {
  return useQuery({
    ...backendTlsQueryOptions(),
    enabled,
  }) as UseQueryResult<{ policies: ReturnType<typeof mapBackendTlsPolicyResource>[] }>;
}

export function backendLbQueryOptions() {
  return {
    queryKey: ["backend-lb"] as const,
    queryFn: async () => {
      const resources = asManagedResourceArray(
        await controlplane.get<ManagedResource[]>("/v1/resources", {
          kind: "BackendLBPolicy",
        })
      );
      return { policies: resources.map(mapBackendLbPolicyResource) };
    },
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  };
}

export function useBackendLb(enabled = true) {
  return useQuery({
    ...backendLbQueryOptions(),
    enabled,
  }) as UseQueryResult<{ policies: ReturnType<typeof mapBackendLbPolicyResource>[] }>;
}
