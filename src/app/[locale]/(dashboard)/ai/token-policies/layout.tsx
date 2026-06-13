"use client";

import { CapabilityGate } from "@/components/dashboard/capability-gate";

export default function AITokenPoliciesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CapabilityGate capability="aiTokenPolicies">{children}</CapabilityGate>
  );
}
