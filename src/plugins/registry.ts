import {
  Activity,
  BarChart3,
  Bot,
  Cpu,
  DollarSign,
  Globe,
  LayoutDashboard,
  MessageSquareCode,
  Puzzle,
  Route,
  Server,
  Settings,
  ShieldAlert,
  ShieldCheck,
  TicketCheck,
} from "lucide-react";
import type { DashboardPlugin } from "./types";

export const dashboardPlugins: DashboardPlugin[] = [
  {
    id: "core",
    navItems: [
      { href: "/overview", labelKey: "nav.overview", icon: LayoutDashboard, capability: "overview" },
      { href: "/gateways", labelKey: "nav.gateways", icon: Globe, capability: "gateways" },
      { href: "/routes", labelKey: "nav.routes", icon: Route, capability: "routes" },
      {
        href: "/reference-grants",
        labelKey: "nav.reference_grants",
        icon: ShieldAlert,
        capability: "referenceGrants",
      },
      { href: "/backend-tls", labelKey: "nav.backend_tls", icon: ShieldCheck, capability: "backendTls" },
      { href: "/nodes", labelKey: "nav.nodes", icon: Server, capability: "nodes" },
      { href: "/diagnostics", labelKey: "nav.diagnostics", icon: Activity, capability: "diagnostics" },
      {
        href: "/observability",
        labelKey: "nav.observability",
        icon: BarChart3,
        capability: "observability",
      },
      { href: "/settings", labelKey: "nav.settings", icon: Settings, capability: "settings" },
    ],
  },
  {
    id: "ai",
    navItems: [
      { href: "/ai/overview", labelKey: "nav.ai_gateway", icon: Bot, capability: "aiOverview" },
      { href: "/ai/services", labelKey: "nav.ai_services", icon: Cpu, capability: "aiServices" },
      {
        href: "/ai/token-policies",
        labelKey: "nav.token_policies",
        icon: TicketCheck,
        capability: "aiTokenPolicies",
      },
      { href: "/ai/cost", labelKey: "nav.cost", icon: DollarSign, capability: "aiCost" },
      { href: "/chatbot", labelKey: "nav.chatbot", icon: MessageSquareCode, capability: "chatbot" },
    ],
  },
  {
    id: "wasm",
    navItems: [
      { href: "/wasm/plugins", labelKey: "nav.wasm_plugins", icon: Puzzle, capability: "wasmPlugins" },
    ],
  },
];
