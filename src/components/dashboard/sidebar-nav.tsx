"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LocalizedLink } from "@/components/dashboard/localized-link";
import { useDashboardCapabilitiesState } from "@/components/dashboard/dashboard-capabilities-provider";
import { cn } from "@/lib/utils";
import { dashboardPlugins } from "@/plugins/registry";
import { getEnabledNavItems } from "@/plugins/types";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu } from "lucide-react";

function NavContent() {
  const t = useTranslations();
  const pathname = usePathname();
  const { capabilities } = useDashboardCapabilitiesState();
  const navItems = getEnabledNavItems(dashboardPlugins, capabilities);

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
          <LocalizedLink key={item.href} href={item.href}>
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
          </LocalizedLink>
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
