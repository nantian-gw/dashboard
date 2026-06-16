"use client";

import { Languages } from "lucide-react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function TopBarLocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function changeLocale(nextLocale: string) {
    if (nextLocale === locale) return;
    const pathWithoutLocale = pathname.replace(/^\/(en|zh)/, "");
    router.push(`/${nextLocale}${pathWithoutLocale || "/overview"}`);
  }

  return (
    <Select value={locale} onValueChange={changeLocale}>
      <SelectTrigger className="w-24">
        <Languages className="mr-1 h-4 w-4" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">English</SelectItem>
        <SelectItem value="zh">中文</SelectItem>
      </SelectContent>
    </Select>
  );
}
