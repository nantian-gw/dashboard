"use client";

import { FeatureUnavailable } from "@/components/dashboard/feature-unavailable";
import PageSkeleton from "@/components/dashboard/page-skeleton";
import { useDashboardCapabilitiesState } from "@/components/dashboard/dashboard-capabilities-provider";
import type { DashboardCapabilityKey } from "@/lib/dashboard-capabilities";

export function CapabilityGate({
  capability,
  children,
}: {
  capability: DashboardCapabilityKey;
  children: React.ReactNode;
}) {
  const { capabilities, isLoading } = useDashboardCapabilitiesState();

  if (isLoading) {
    return <PageSkeleton />;
  }
  if (!capabilities[capability]) {
    return <FeatureUnavailable />;
  }
  return <>{children}</>;
}
