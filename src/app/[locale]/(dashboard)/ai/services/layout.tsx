"use client";

import { CapabilityGate } from "@/components/dashboard/capability-gate";

export default function AIServicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CapabilityGate capability="aiServices">{children}</CapabilityGate>;
}
