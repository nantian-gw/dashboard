import { CapabilityGate } from "@/components/dashboard/capability-gate";

export default function ChatbotLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CapabilityGate capability="chatbot">{children}</CapabilityGate>;
}
