import type { QueryClient } from "@tanstack/react-query";
import { aiServicesQueryOptions } from "@/hooks/use-api/use-ai";
import {
  backendTlsQueryOptions,
  gatewayQueryOptions,
  gatewaysQueryOptions,
  routeQueryOptions,
  routesQueryOptions,
  tokenPoliciesQueryOptions,
} from "@/hooks/use-api/use-gateways";
import {
  referenceGrantQueryOptions,
  referenceGrantsQueryOptions,
} from "@/hooks/use-api/use-resources";
import {
  getDashboardQueryPrewarmTargets,
  type DashboardQueryPrewarmTarget,
} from "@/lib/dashboard-prewarm-targets";

function prefetchTarget(queryClient: QueryClient, target: DashboardQueryPrewarmTarget) {
  switch (target.kind) {
    case "gateways-list":
      return queryClient.prefetchQuery(gatewaysQueryOptions());
    case "gateway-detail":
      return queryClient.prefetchQuery(gatewayQueryOptions(target.namespace, target.name));
    case "routes-list":
      return queryClient.prefetchQuery(routesQueryOptions());
    case "route-detail":
      return queryClient.prefetchQuery(
        routeQueryOptions(target.namespace, target.name, target.routeKind)
      );
    case "backend-tls-list":
      return queryClient.prefetchQuery(backendTlsQueryOptions());
    case "reference-grants-list":
      return queryClient.prefetchQuery(referenceGrantsQueryOptions());
    case "reference-grant-detail":
      return queryClient.prefetchQuery(
        referenceGrantQueryOptions(target.namespace, target.name)
      );
    case "ai-services-list":
      return queryClient.prefetchQuery(aiServicesQueryOptions());
    case "token-policies-list":
      return queryClient.prefetchQuery(tokenPoliciesQueryOptions());
  }
}

export function prewarmDashboardQueries(queryClient: QueryClient, localizedHref: string) {
  for (const target of getDashboardQueryPrewarmTargets(localizedHref)) {
    try {
      void prefetchTarget(queryClient, target);
    } catch {
      // Best-effort optimization only.
    }
  }
}
