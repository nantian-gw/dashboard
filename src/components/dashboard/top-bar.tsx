"use client";

import { TopBarActions } from "@/components/dashboard/top-bar-actions";
import { TopBarLocaleSwitcher } from "@/components/dashboard/top-bar-locale-switcher";
import { TopBarPageTitle } from "@/components/dashboard/top-bar-page-title";

export function TopBar() {
  return (
    <header className="flex h-14 items-center gap-4 border-b bg-card px-6">
      <TopBarPageTitle />
      <div className="flex-1" />
      <TopBarActions />
      <TopBarLocaleSwitcher />
    </header>
  );
}
