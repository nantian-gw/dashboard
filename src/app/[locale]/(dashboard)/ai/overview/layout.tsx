import { CapabilityGate } from "@/components/dashboard/capability-gate";

export default function AIOverviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CapabilityGate capability="aiOverview">{children}</CapabilityGate>;
}
