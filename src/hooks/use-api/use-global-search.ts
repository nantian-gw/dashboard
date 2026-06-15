"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { GlobalSearchItem } from "@/lib/global-search";

const STALE_TIME = 30_000;
const GC_TIME = 60_000;

export function useGlobalSearch(
  query: string,
  enabled = true
): UseQueryResult<GlobalSearchItem[]> {
  return useQuery({
    queryKey: ["global-search", query],
    queryFn: async () => {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(query)}`,
        { credentials: "include" }
      );
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }
      return response.json();
    },
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    enabled: enabled && query.trim().length > 0,
    retry: 1,
  }) as UseQueryResult<GlobalSearchItem[]>;
}
