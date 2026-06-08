"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  LayoutDashboard,
  Globe,
  Route,
  ShieldCheck,
  ShieldAlert,
  Server,
  Activity,
  BarChart3,
  Menu,
  Bot,
  MessageSquareCode,
  DollarSign,
  Settings,
  Puzzle,
  Cpu,
  TicketCheck,
} from "lucide-react";

const navItems = [
  { href: "/overview", labelKey: "nav.overview", icon: LayoutDashboard },
  { href: "/gateways", labelKey: "nav.gateways", icon: Globe },
  { href: "/routes", labelKey: "nav.routes", icon: Route },
  { href: "/reference-grants", labelKey: "nav.reference_grants", icon: ShieldAlert },
  { href: "/backend-tls", labelKey: "nav.backend_tls", icon: ShieldCheck },
  { href: "/nodes", labelKey: "nav.nodes", icon: Server },
  { href: "/diagnostics", labelKey: "nav.diagnostics", icon: Activity },
  { href: "/observability", labelKey: "nav.observability", icon: BarChart3 },
  { href: "/ai/overview", labelKey: "nav.ai_gateway", icon: Bot },
  { href: "/ai/services", labelKey: "nav.ai_services", icon: Cpu },
  { href: "/ai/token-policies", labelKey: "nav.token_policies", icon: TicketCheck },
  { href: "/ai/cost", labelKey: "nav.cost", icon: DollarSign },
  { href: "/wasm/plugins", labelKey: "nav.wasm_plugins", icon: Puzzle },
  { href: "/chatbot", labelKey: "nav.chatbot", icon: MessageSquareCode },
  { href: "/settings", labelKey: "nav.settings", icon: Settings },
];

function NavContent() {
  const t = useTranslations();
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-4">
      <div className="mb-4 px-2">
        <h1 className="text-lg font-semibold">Nantian Gateway</h1>
        <p className="text-xs text-muted-foreground">{t("shell.brand_subtitle")}</p>
      </div>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname.includes(item.href);
        return (
          <Link key={item.href} href={item.href}>
            <Button
              variant={isActive ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-2",
                isActive && "bg-muted font-medium"
              )}
            >
              <Icon className="h-4 w-4" />
              {t(item.labelKey)}
            </Button>
          </Link>
        );
      })}
    </nav>
  );
}

export function SidebarNav() {
  return (
    <>
      <aside className="hidden w-64 flex-col border-r bg-card md:flex">
        <NavContent />
      </aside>

      <div className="flex md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="m-2">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <NavContent />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}