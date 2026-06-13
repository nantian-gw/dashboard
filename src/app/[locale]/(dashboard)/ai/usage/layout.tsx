"use client";

import { CapabilityGate } from "@/components/dashboard/capability-gate";

export default function AIUsageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CapabilityGate capability="aiUsage">{children}</CapabilityGate>;
}
