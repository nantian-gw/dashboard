"use client";

import { createContext, useContext, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useDashboardCapabilities } from "@/hooks/use-api";
import {
  DEFAULT_DASHBOARD_CAPABILITIES,
  type DashboardCapabilities,
} from "@/lib/dashboard-capabilities";

type DashboardCapabilitiesContextValue = {
  capabilities: DashboardCapabilities;
  isLoading: boolean;
};

const DashboardCapabilitiesContext =
  createContext<DashboardCapabilitiesContextValue | null>(null);

const DASHBOARD_ROUTE_SEGMENTS = new Set([
  "ai",
  "backend-tls",
  "chatbot",
  "diagnostics",
  "gateways",
  "nodes",
  "observability",
  "overview",
  "reference-grants",
  "routes",
  "settings",
  "wasm",
]);

function isDashboardPathname(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 1) {
    return true;
  }
  return DASHBOARD_ROUTE_SEGMENTS.has(segments[1] ?? "");
}

export function DashboardCapabilitiesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isDashboardRoute = isDashboardPathname(pathname);
  const query = useDashboardCapabilities(isDashboardRoute);
  const value = useMemo(
    () => ({
      capabilities: isDashboardRoute
        ? query.data ?? DEFAULT_DASHBOARD_CAPABILITIES
        : DEFAULT_DASHBOARD_CAPABILITIES,
      isLoading: isDashboardRoute && query.isLoading,
    }),
    [isDashboardRoute, query.data, query.isLoading],
  );

  return (
    <DashboardCapabilitiesContext.Provider value={value}>
      {children}
    </DashboardCapabilitiesContext.Provider>
  );
}

export function useDashboardCapabilitiesState() {
  const value = useContext(DashboardCapabilitiesContext);
  if (!value) {
    throw new Error(
      "useDashboardCapabilitiesState must be used within DashboardCapabilitiesProvider",
    );
  }
  return value;
}
