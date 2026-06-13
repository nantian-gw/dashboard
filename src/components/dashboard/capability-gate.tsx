"use client";

import { FeatureUnavailable } from "@/components/dashboard/feature-unavailable";
import PageSkeleton from "@/components/dashboard/page-skeleton";
import { useDashboardCapabilitiesState } from "@/components/dashboard/dashboard-capabilities-provider";
import { useDashboardCapabilities } from "@/hooks/use-api";
import type { DashboardCapabilityKey } from "@/lib/dashboard-capabilities";

export function CapabilityGate({
  capability,
  children,
}: {
  capability: DashboardCapabilityKey;
  children: React.ReactNode;
}) {
  const { capabilities, isLoading } = useDashboardCapabilitiesState();
  const capabilityQuery = useDashboardCapabilities();
  const isMissingCapabilityEndpoint =
    capabilityQuery.error instanceof Error &&
    capabilityQuery.error.message.includes("/v1/dashboard/capabilities") &&
    capabilityQuery.error.message.endsWith(": 404");

  if (isLoading || capabilityQuery.isLoading) {
    return <PageSkeleton />;
  }
  if (isMissingCapabilityEndpoint && !capabilityQuery.data) {
    return <FeatureUnavailable />;
  }
  if (capabilityQuery.error && !capabilityQuery.data) {
    return <>{children}</>;
  }
  if (!capabilities[capability]) {
    return <FeatureUnavailable />;
  }
  return <>{children}</>;
}
