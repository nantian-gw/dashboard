import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { localizeDashboardPath } from "@/lib/dashboard-navigation";
import { prewarmDashboardQueries } from "@/lib/dashboard-query-prewarm";

export function useLocalizedDashboardRouter() {
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();

  const push = useCallback(
    (href: string, options?: Parameters<typeof router.push>[1]) => {
      const localizedHref = localizeDashboardPath(locale, href);
      prewarmDashboardQueries(queryClient, localizedHref);
      router.push(localizeDashboardPath(locale, href), options);
    },
    [locale, router, queryClient],
  );

  const replace = useCallback(
    (href: string, options?: Parameters<typeof router.replace>[1]) => {
      const localizedHref = localizeDashboardPath(locale, href);
      prewarmDashboardQueries(queryClient, localizedHref);
      router.replace(localizeDashboardPath(locale, href), options);
    },
    [locale, router, queryClient],
  );

  const prefetch = useCallback(
    (href: string, options?: Parameters<typeof router.prefetch>[1]) => {
      const localizedHref = localizeDashboardPath(locale, href);
      prewarmDashboardQueries(queryClient, localizedHref);
      return router.prefetch(localizedHref, options);
    },
    [locale, router, queryClient],
  );

  return { push, replace, prefetch };
}
