"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { controlplane, dataplane } from "@/lib/api";
import { hasCompleteListenerHealthCounts, mapControlplaneSummary } from "@/lib/admin-models";

const REFETCH_INTERVAL = 30000;
const STALE_TIME = 300000;
const GC_TIME = 5 * 60 * 1000;

export function useControlplaneSummary() {
  return useQuery({
    queryKey: ["controlplane", "summary"],
    queryFn: async () => {
      const summary = await controlplane.get<Record<string, unknown>>("/v1/summary");
      if (hasCompleteListenerHealthCounts(summary)) return mapControlplaneSummary(summary);

      try {
        const listeners = await controlplane.get("/v1/listeners");
        return mapControlplaneSummary(summary, listeners);
      } catch {
        return mapControlplaneSummary(summary);
      }
    },
    refetchInterval: REFETCH_INTERVAL,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  }) as UseQueryResult<ReturnType<typeof mapControlplaneSummary>>;
}

export function useNamespaces() {
  return useQuery({
    queryKey: ["namespaces"],
    queryFn: () => controlplane.get<string[]>("/v1/namespaces"),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  }) as UseQueryResult<string[]>;
}

export function useDataplaneSummary() {
  return useQuery({
    queryKey: ["dataplane", "summary"],
    queryFn: () => dataplane.get("/v1/summary"),
    refetchInterval: REFETCH_INTERVAL,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  }) as UseQueryResult<Record<string, unknown>>;
}
