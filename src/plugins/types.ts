import type { LucideIcon } from "lucide-react";
import type {
  DashboardCapabilities,
  DashboardCapabilityKey,
} from "@/lib/dashboard-capabilities";

export type DashboardNavItem = {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  capability: DashboardCapabilityKey;
};

export type DashboardPlugin = {
  id: "core" | "ai" | "wasm";
  navItems: DashboardNavItem[];
};

export function getEnabledNavItems(
  plugins: DashboardPlugin[],
  capabilities: DashboardCapabilities,
) {
  return plugins
    .flatMap((plugin) => plugin.navItems)
    .filter((item) => capabilities[item.capability]);
}
