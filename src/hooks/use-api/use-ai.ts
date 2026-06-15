"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { controlplane } from "@/lib/api";

const STALE_TIME = 300000;
const GC_TIME = 5 * 60 * 1000;

export interface AIServiceSummary {
  name: string;
  namespace: string;
  provider: string;
  format: string;
  model: string;
  status: string;
}

export interface AITokenUsage {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  timestamp: string;
}

export interface AITraceSummary {
  id: string;
  model: string;
  duration: number;
  tokens: number;
  status: string;
  timestamp: string;
}

export interface AICostSummary {
  totalCost: number;
  todayCost: number;
  monthCost: number;
  byModel: AICostByModel[];
  trend: AICostTrend[];
}

export interface AICostByModel {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  requests: number;
}

export interface AICostTrend {
  date: string;
  cost: number;
  model: string;
}

export interface AIOverview {
  totalServices: number;
  totalTokens: number;
  totalRequests: number;
  averageLatency: number;
  activeModels: string[];
}

export function useAIOverview() {
  return useQuery({
    queryKey: ["ai", "overview"],
    queryFn: () => controlplane.get<AIOverview>("/v1/ai/overview"),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  }) as UseQueryResult<AIOverview>;
}

export function useAIServices() {
  return useQuery({
    queryKey: ["ai", "services"],
    queryFn: () => controlplane.get<AIServiceSummary[]>("/v1/ai/services"),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  }) as UseQueryResult<AIServiceSummary[]>;
}

export function useAITokenUsage() {
  return useQuery({
    queryKey: ["ai", "token-usage"],
    queryFn: () => controlplane.get<AITokenUsage[]>("/v1/ai/token-usage"),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  }) as UseQueryResult<AITokenUsage[]>;
}

export function useAITraces() {
  return useQuery({
    queryKey: ["ai", "traces"],
    queryFn: () => controlplane.get<AITraceSummary[]>("/v1/ai/traces"),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  }) as UseQueryResult<AITraceSummary[]>;
}

export function useAICost(timeRange?: string) {
  return useQuery({
    queryKey: ["ai", "cost", timeRange],
    queryFn: () => controlplane.get<AICostSummary>("/v1/ai/cost" + (timeRange ? `?range=${timeRange}` : "")),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  }) as UseQueryResult<AICostSummary>;
}

export interface AITokenTrendDatum {
  timestamp: string;
  promptTokens: number;
  completionTokens: number;
  model: string;
}

export interface AILatencyTrendDatum {
  timestamp: string;
  latency: number;
}

/**
 * Returns token usage trend data.
 * Uses the existing /v1/ai/token-usage endpoint and aggregates by timestamp.
 * Falls back to empty array when backend is unavailable.
 */
export function useAITokenTrend() {
  return useQuery({
    queryKey: ["ai", "token-trend"],
    queryFn: async () => {
      try {
        return await controlplane.get<AITokenUsage[]>("/v1/ai/token-usage");
      } catch {
        return [] as AITokenUsage[];
      }
    },
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  }) as UseQueryResult<AITokenUsage[]>;
}

/**
 * Returns latency trend data.
 * Uses the existing /v1/ai/traces endpoint and extracts duration as latency.
 * Falls back to empty array when backend is unavailable.
 */
export function useAILatencyTrend() {
  return useQuery({
    queryKey: ["ai", "latency-trend"],
    queryFn: async () => {
      try {
        const data = await controlplane.get<AITraceSummary[]>("/v1/ai/traces");
        return data.map((d) => ({
          timestamp: d.timestamp,
          latency: d.duration,
        })) as AILatencyTrendDatum[];
      } catch {
        return [] as AILatencyTrendDatum[];
      }
    },
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  }) as UseQueryResult<AILatencyTrendDatum[]>;
}
