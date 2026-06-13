"use client";

import { CapabilityGate } from "@/components/dashboard/capability-gate";

export default function AITracesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CapabilityGate capability="aiTraces">{children}</CapabilityGate>;
}
