"use client";

import type { ComponentProps } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link, { type LinkProps } from "next/link";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { localizeDashboardPath } from "@/lib/dashboard-navigation";
import { prewarmDashboardQueries } from "@/lib/dashboard-query-prewarm";

type LocalizedLinkProps = Omit<ComponentProps<typeof Link>, "href"> &
  Pick<LinkProps, "replace" | "scroll" | "prefetch"> & {
    href: string;
  };

export function LocalizedLink({
  href,
  onMouseEnter,
  onFocus,
  prefetch,
  ...props
}: LocalizedLinkProps) {
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const localizedHref = localizeDashboardPath(locale, href);

  function handlePrewarm() {
    if (prefetch === false) return;
    try {
      void router.prefetch(localizedHref);
    } catch {
      // Best-effort optimization only.
    }
    prewarmDashboardQueries(queryClient, localizedHref);
  }

  return (
    <Link
      href={localizedHref}
      prefetch={prefetch}
      onMouseEnter={(event) => {
        handlePrewarm();
        onMouseEnter?.(event);
      }}
      onFocus={(event) => {
        handlePrewarm();
        onFocus?.(event);
      }}
      {...props}
    />
  );
}
