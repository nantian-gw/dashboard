export type DashboardCapabilityKey =
  | "overview"
  | "gateways"
  | "routes"
  | "referenceGrants"
  | "backendTls"
  | "nodes"
  | "diagnostics"
  | "observability"
  | "settings"
  | "aiOverview"
  | "aiServices"
  | "aiTokenPolicies"
  | "aiCost"
  | "aiTraces"
  | "aiUsage"
  | "wasmPlugins"
  | "chatbot";

export type DashboardCapabilities = Record<DashboardCapabilityKey, boolean>;

export const DEFAULT_DASHBOARD_CAPABILITIES: DashboardCapabilities = {
  overview: true,
  gateways: true,
  routes: true,
  referenceGrants: true,
  backendTls: true,
  nodes: true,
  diagnostics: true,
  observability: true,
  settings: true,
  aiOverview: false,
  aiServices: false,
  aiTokenPolicies: false,
  aiCost: false,
  aiTraces: false,
  aiUsage: false,
  wasmPlugins: false,
  chatbot: false,
};
