"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { localizeDashboardPath } from "@/lib/dashboard-navigation";

export function useLocalizedDashboardRouter() {
  const locale = useLocale();
  const router = useRouter();

  return {
    push(href: string, options?: Parameters<typeof router.push>[1]) {
      router.push(localizeDashboardPath(locale, href), options);
    },
    replace(href: string, options?: Parameters<typeof router.replace>[1]) {
      router.replace(localizeDashboardPath(locale, href), options);
    },
    prefetch(href: string) {
      return router.prefetch(localizeDashboardPath(locale, href));
    },
  };
}
