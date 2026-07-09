import { CapabilityGate } from "@/components/dashboard/capability-gate";

export default function WasmPluginsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CapabilityGate capability="wasmPlugins">{children}</CapabilityGate>;
}
