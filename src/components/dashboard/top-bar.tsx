"use client";

import { useAtom } from "jotai";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { refreshEnabledAtom } from "@/lib/store";
import { GlobalSearch } from "@/components/dashboard/global-search";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, Languages, Sun, Moon } from "lucide-react";

export function TopBar() {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const [refreshEnabled, setRefreshEnabled] = useAtom(refreshEnabledAtom);

  const { theme, setTheme } = useTheme();
  const currentLocale = pathname.match(/^\/(en|zh)/)?.[1] || "en";
  const pageTitle = pathname.split("/").pop() || "overview";

  function changeLocale(newLocale: string) {
    if (newLocale === currentLocale) return;
    const pathWithoutLocale = pathname.replace(/^\/(en|zh)/, "");
    router.push(`/${newLocale}${pathWithoutLocale || "/overview"}`);
  }

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-card px-6">
      <h2 className="font-semibold capitalize">{pageTitle}</h2>
      <div className="flex-1" />
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
      <Select value={currentLocale} onValueChange={changeLocale}>
        <SelectTrigger className="w-24">
          <Languages className="h-4 w-4 mr-1" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en">English</SelectItem>
          <SelectItem value="zh">中文</SelectItem>
        </SelectContent>
      </Select>
    </header>
  );
}
