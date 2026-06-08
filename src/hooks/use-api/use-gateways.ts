"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { controlplane } from "@/lib/api";
import { mapGatewayResource, mapRoutesPayload, mapBackendTlsPolicyResource, mapTokenPolicyResource, toYaml, type ManagedResource } from "@/lib/admin-models";

const REFETCH_INTERVAL = 30000;
const STALE_TIME = 300000;
const GC_TIME = 5 * 60 * 1000;

export function useGateways(enabled = true) {
  return useQuery({
    queryKey: ["gateways"],
    queryFn: async () => {
      const [resources, summary, routesPayload] = await Promise.all([
        controlplane.get<ManagedResource[]>("/v1/resources", { kind: "Gateway" }),
        controlplane.get<Record<string, unknown>>("/v1/summary"),
        controlplane.get("/v1/routes"),
      ]);
      const routes = mapRoutesPayload(routesPayload);
      return {
        gateways: resources.map((resource) => mapGatewayResource(resource, routes)),
        httpRouteCount: (summary.httpRouteCount as number) ?? 0,
        grpcRouteCount: (summary.grpcRouteCount as number) ?? 0,
      };
    },
    refetchInterval: REFETCH_INTERVAL,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    enabled,
  }) as UseQueryResult<{
    gateways: ReturnType<typeof mapGatewayResource>[];
    httpRouteCount: number;
    grpcRouteCount: number;
  }>;
}

export function useGateway(namespace: string, name: string) {
  return useQuery({
    queryKey: ["gateway", namespace, name],
    queryFn: async () => {
      const [resource, routesPayload] = await Promise.all([
        controlplane.get<ManagedResource>(
          `/v1/resources/gateway/${namespace}/${name}`
        ),
        controlplane.get("/v1/routes"),
      ]);
      return mapGatewayResource(resource, mapRoutesPayload(routesPayload));
    },
    enabled: !!namespace && !!name,
    refetchInterval: REFETCH_INTERVAL,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  }) as UseQueryResult<ReturnType<typeof mapGatewayResource>>;
}

export function useRoute(namespace: string, name: string, kind: string) {
  return useQuery({
    queryKey: ["route", namespace, name, kind],
    queryFn: async () => {
      const r = await controlplane.get<ManagedResource>(
        `/v1/resources/${kind.toLowerCase()}/${namespace}/${name}`
      );
      const rawSpec = (r.resource?.spec || {}) as Record<string, unknown>;

      const rules = (rawSpec.rules as unknown[]) || [];
      const backends: unknown[] = [];
      const pathMatches: string[] = [];

      rules.forEach((rule: any) => {
        if (rule.matches) {
          rule.matches.forEach((m: any) => {
            if (m.path) {
              pathMatches.push(`${m.path.type || "PathPrefix"}: ${m.path.value || "/"}`);
            }
            if (m.headers) {
              pathMatches.push(`Headers: ${m.headers.length}`);
            }
            if (m.method) {
              pathMatches.push(`Method: ${m.method}`);
            }
          });
        }
        if (rule.backendRefs) {
          rule.backendRefs.forEach((br: any) => {
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
          status: "Accepted",
          hostnames: rawSpec.hostnames || [],
          parentRefs: rawSpec.parentRefs || [],
          rules: rules,
          pathMatches,
          backends,
          filters: rules.flatMap((rule: any) => rule.filters || []),
          timeouts: (rules[0] as Record<string, unknown> | undefined)?.timeouts,
          manifest: toYaml(r.resource || r),
        }
      };
    },
    enabled: !!namespace && !!name && !!kind,
    refetchInterval: REFETCH_INTERVAL,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  }) as UseQueryResult<{ route: Record<string, unknown> }>;
}

export function useRoutes(enabled = true) {
  return useQuery({
    queryKey: ["routes"],
    queryFn: async () => {
      const payload = await controlplane.get("/v1/routes");
      return { routes: mapRoutesPayload(payload) };
    },
    refetchInterval: REFETCH_INTERVAL,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    enabled,
  }) as UseQueryResult<{ routes: ReturnType<typeof mapRoutesPayload> }>;
}

export function useTokenPolicies(enabled = true) {
  return useQuery({
    queryKey: ["token-policies"],
    queryFn: async () => {
      const resources = await controlplane.get<ManagedResource[]>(
        "/v1/resources",
        { kind: "TokenPolicy" }
      );
      return { policies: resources.map(mapTokenPolicyResource) };
    },
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    enabled,
  }) as UseQueryResult<{ policies: ReturnType<typeof mapTokenPolicyResource>[] }>;
}

export function useBackendTls(enabled = true) {
  return useQuery({
    queryKey: ["backend-tls"],
    queryFn: async () => {
      const resources = await controlplane.get<ManagedResource[]>(
        "/v1/resources",
        { kind: "BackendTLSPolicy" }
      );
      return { policies: resources.map(mapBackendTlsPolicyResource) };
    },
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    enabled,
  }) as UseQueryResult<{ policies: ReturnType<typeof mapBackendTlsPolicyResource>[] }>;
}
