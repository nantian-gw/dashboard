"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { controlplane } from "@/lib/api";
import { asManagedResourceArray, type ManagedResource } from "@/lib/admin-models";

const STALE_TIME = 300000;
const GC_TIME = 5 * 60 * 1000;

export function useWasmPlugins(enabled = true) {
  return useQuery({
    queryKey: ["wasm", "plugins"],
    queryFn: async () => {
      const resources = asManagedResourceArray(
        await controlplane.get<ManagedResource[]>("/v1/resources", {
          kind: "WasmPlugin",
        })
      );
      return { plugins: resources };
    },
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    enabled,
  }) as UseQueryResult<{ plugins: ManagedResource[] }>;
}

export function useWasmPlugin(namespace: string, name: string) {
  return useQuery({
    queryKey: ["wasm", "plugin", namespace, name],
    queryFn: () =>
      controlplane.get<ManagedResource>(
        `/v1/resources/wasmplugin/${namespace}/${name}`
      ),
    enabled: !!namespace && !!name,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  }) as UseQueryResult<ManagedResource>;
}
