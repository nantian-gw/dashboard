"use client";

import { CapabilityGate } from "@/components/dashboard/capability-gate";

export default function AICostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CapabilityGate capability="aiCost">{children}</CapabilityGate>;
}
