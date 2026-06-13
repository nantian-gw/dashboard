"use client";

import { createContext, useContext, useMemo } from "react";
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

export function DashboardCapabilitiesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const query = useDashboardCapabilities();
  const value = useMemo(
    () => ({
      capabilities: query.data ?? DEFAULT_DASHBOARD_CAPABILITIES,
      isLoading: query.isLoading,
    }),
    [query.data, query.isLoading],
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
