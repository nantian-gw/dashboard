"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { controlplane, dataplane } from "@/lib/api";
import { mapDiagnostics, mapNodePayload, asManagedResourceArray, type ManagedResource } from "@/lib/admin-models";

const REFETCH_INTERVAL = (query: any) => {
  if (typeof document !== "undefined" && document.hidden) return false;
  if (query.state.error) return 60000;
  return 30000 + Math.random() * 5000;
};
const STALE_TIME = 300000;
const GC_TIME = 5 * 60 * 1000;

export function useNodes(enabled = true) {
  return useQuery({
    queryKey: ["nodes"],
    queryFn: async () => {
      const payload = await controlplane.get("/v1/nodes");
      return { nodes: mapNodePayload(payload) };
    },
    refetchInterval: REFETCH_INTERVAL,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    enabled,
  }) as UseQueryResult<{ nodes: ReturnType<typeof mapNodePayload> }>;
}

export function referenceGrantsQueryOptions() {
  return {
    queryKey: ["referencegrants"] as const,
    queryFn: async () => {
      const resources = asManagedResourceArray(
        await controlplane.get<ManagedResource[]>("/v1/resources", {
          kind: "ReferenceGrant",
        })
      );
      return { grants: resources };
    },
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  };
}

export function referenceGrantQueryOptions(namespace: string, name: string) {
  return {
    queryKey: ["referencegrant", namespace, name] as const,
    queryFn: () =>
      controlplane.get<ManagedResource>(`/v1/resources/referencegrant/${namespace}/${name}`),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  };
}

export function useReferenceGrants(enabled = true) {
  return useQuery({
    ...referenceGrantsQueryOptions(),
    enabled,
  }) as UseQueryResult<{ grants: ManagedResource[] }>;
}

export function useReferenceGrant(namespace: string, name: string) {
  return useQuery({
    ...referenceGrantQueryOptions(namespace, name),
    enabled: !!namespace && !!name,
  }) as UseQueryResult<ManagedResource>;
}

export function useDiagnostics(enabled = true) {
  return useQuery({
    queryKey: ["diagnostics"],
    queryFn: async () => {
      const [controlplaneSummary, infrastructure, dataplaneSummary] =
        await Promise.all([
          controlplane.get("/v1/summary"),
          controlplane.get("/v1/infrastructure"),
          dataplane.get("/v1/summary"),
        ]);
      return {
        issues: mapDiagnostics(controlplaneSummary, infrastructure, dataplaneSummary),
      };
    },
    refetchInterval: REFETCH_INTERVAL,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    enabled,
  }) as UseQueryResult<{ issues: ReturnType<typeof mapDiagnostics> }>;
}

export type PrometheusResponse = {
  status: string;
  data: {
    resultType: string;
    result: Array<{
      metric: Record<string, string>;
      value: [number, string];
    }>;
  };
};

export type PrometheusRangeResponse = {
  status: string;
  data: {
    resultType: string;
    result: Array<{
      metric: Record<string, string>;
      values: Array<[number, string]>;
    }>;
  };
};

export function usePrometheusQuery(query: string, enabled = true) {
  return useQuery({
    queryKey: ["prometheus", query],
    queryFn: async () => {
      const res = await controlplane.post<PrometheusResponse>("/v1/metrics/query", { query });
      return res;
    },
    refetchInterval: 15_000,
    staleTime: 10_000,
    retry: 1,
    retryDelay: 2000,
    enabled: !!query && enabled,
  }) as UseQueryResult<PrometheusResponse>;
}

export function usePrometheusRangeQuery(query: string, hours = 1, enabled = true) {
  const now = new Date();
  const end = now.toISOString();
  const start = new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();
  const step = (Math.max(15, Math.ceil((hours * 60) / 60)) * 60).toString(); // at most 60 data points

  return useQuery({
    queryKey: ["prometheus-range", query, hours],
    queryFn: async () => {
      const res = await controlplane.post<PrometheusRangeResponse>("/v1/metrics/query_range", {
        query,
        start,
        end,
        step,
      });
      return res;
    },
    refetchInterval: REFETCH_INTERVAL,
    staleTime: 15_000,
    retry: 1,
    retryDelay: 2000,
    enabled: !!query && enabled,
  }) as UseQueryResult<PrometheusRangeResponse>;
}
