"use client";

import { useAtom } from "jotai";
import { LogOut, Moon, RefreshCw, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { signOut } from "next-auth/react";
import { GlobalSearch } from "@/components/dashboard/global-search";
import { Button } from "@/components/ui/button";
import { refreshEnabledAtom } from "@/lib/store";

export function TopBarActions() {
  const t = useTranslations();
  const [refreshEnabled, setRefreshEnabled] = useAtom(refreshEnabledAtom);
  const { theme, setTheme } = useTheme();

  return (
    <>
      <GlobalSearch />
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setRefreshEnabled(!refreshEnabled)}
        title={refreshEnabled ? t("control.auto_refresh_on") : t("control.auto_refresh_off")}
      >
        <RefreshCw className={`h-4 w-4 ${refreshEnabled ? "animate-spin-slow" : ""}`} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      >
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => signOut({ callbackUrl: "/en/login" })}
        title={t("control.logout")}
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </>
  );
}
