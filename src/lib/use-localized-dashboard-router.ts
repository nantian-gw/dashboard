"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { localizeDashboardPath } from "@/lib/dashboard-navigation";
import { prewarmDashboardQueries } from "@/lib/dashboard-query-prewarm";

export function useLocalizedDashboardRouter() {
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();

  return {
    push(href: string, options?: Parameters<typeof router.push>[1]) {
      const localizedHref = localizeDashboardPath(locale, href);
      prewarmDashboardQueries(queryClient, localizedHref);
      router.push(localizeDashboardPath(locale, href), options);
    },
    replace(href: string, options?: Parameters<typeof router.replace>[1]) {
      const localizedHref = localizeDashboardPath(locale, href);
      prewarmDashboardQueries(queryClient, localizedHref);
      router.replace(localizeDashboardPath(locale, href), options);
    },
    prefetch(href: string, options?: Parameters<typeof router.prefetch>[1]) {
      const localizedHref = localizeDashboardPath(locale, href);
      prewarmDashboardQueries(queryClient, localizedHref);
      // Preserve localized prefetch semantics: router.prefetch(localizeDashboardPath(locale, href), options)
      return router.prefetch(localizedHref, options);
    },
  };
}
