"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { controlplane } from "@/lib/api";
import type { PrometheusResponse } from "./use-resources";

export type BackendCluster = {
  name: string;
  namespace: string;
  protocol: string;
  endpoints?: Array<{ address: string; port: number; healthy: boolean }>;
  circuitBreaker?: {
    maxInflightRequests: number;
  };
};

export type CircuitBreakerRow = {
  name: string;
  namespace: string;
  protocol: string;
  maxInflight: number;
  currentInflight: number;
  rejectedTotal: number;
  status: "ok" | "warning" | "critical";
};

const REFETCH_INTERVAL = (query: any) => {
  if (typeof document !== "undefined" && document.hidden) return false;
  if (query.state.error) return 60000;
  return 15000 + Math.random() * 5000;
};
const STALE_TIME = 10000;

function buildBackendRegex(backends: BackendCluster[]): string {
  return backends
    .map((b) => escapePromRegex(`${b.namespace}/${b.name}`))
    .join("|");
}

function escapePromRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parsePromMap(
  data: PrometheusResponse | undefined,
): Map<string, number> {
  const map = new Map<string, number>();
  if (!data?.data?.result) return map;
  for (const r of data.data.result) {
    const backend = r.metric?.backend as string | undefined;
    const v = parseFloat(r.value?.[1]);
    if (backend && Number.isFinite(v)) {
      map.set(backend, v);
    }
  }
  return map;
}

export function useCircuitBreakerBackends(enabled = true) {
  return useQuery({
    queryKey: ["circuit-breaker-backends"],
    queryFn: async (): Promise<CircuitBreakerRow[]> => {
      const backends = await controlplane.get<BackendCluster[]>(
        "/v1/backends",
        { all: "true" },
      );

      const cbBackends = (Array.isArray(backends) ? backends : []).filter(
        (b) => b.circuitBreaker,
      );

      if (cbBackends.length === 0) return [];

      const regex = buildBackendRegex(cbBackends);

      const inflightQuery = `nantian_gateway_dataplane_http_circuit_breaker_backend_inflight_current{backend=~"${regex}"}`;
      const rejectedQuery = `nantian_gateway_dataplane_http_circuit_breaker_rejected_backend_total{backend=~"${regex}"}`;

      const [inflightData, rejectedData] = await Promise.all([
        controlplane
          .post<PrometheusResponse>("/v1/metrics/query", {
            query: inflightQuery,
          })
          .catch(() => undefined),
        controlplane
          .post<PrometheusResponse>("/v1/metrics/query", {
            query: rejectedQuery,
          })
          .catch(() => undefined),
      ]);

      const inflightMap = parsePromMap(inflightData);
      const rejectedMap = parsePromMap(rejectedData);

      return cbBackends.map((b) => {
        const backendId = `${b.namespace}/${b.name}`;
        const maxInflight = b.circuitBreaker!.maxInflightRequests;
        const currentInflight = inflightMap.get(backendId) ?? 0;
        const rejectedTotal = rejectedMap.get(backendId) ?? 0;

        let status: CircuitBreakerRow["status"] = "ok";
        if (maxInflight > 0) {
          const ratio = currentInflight / maxInflight;
          if (ratio >= 0.9) status = "critical";
          else if (ratio >= 0.7) status = "warning";
        }

        return {
          name: b.name,
          namespace: b.namespace,
          protocol: b.protocol,
          maxInflight,
          currentInflight,
          rejectedTotal,
          status,
        };
      });
    },
    refetchInterval: REFETCH_INTERVAL,
    staleTime: STALE_TIME,
    enabled,
  }) as UseQueryResult<CircuitBreakerRow[]>;
}
