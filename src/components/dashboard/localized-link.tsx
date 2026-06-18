"use client";

import type { ComponentProps } from "react";
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link, { type LinkProps } from "next/link";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { localizeDashboardPath } from "@/lib/dashboard-navigation";
import { prewarmDashboardQueries } from "@/lib/dashboard-query-prewarm";

const HOVER_PREWARM_DELAY_MS = 150;

type LocalizedLinkProps = Omit<ComponentProps<typeof Link>, "href"> &
  Pick<LinkProps, "replace" | "scroll" | "prefetch"> & {
    href: string;
    queryPrewarm?: boolean;
  };

export function LocalizedLink({
  href,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  prefetch,
  queryPrewarm = true,
  ...props
}: LocalizedLinkProps) {
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const localizedHref = localizeDashboardPath(locale, href);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prewarmedHrefRef = useRef<string | null>(null);

  function clearHoverTimer() {
    if (hoverTimerRef.current !== null) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }

  function handlePrewarm() {
    clearHoverTimer();

    // Skip duplicate same href prewarm work for this mounted link instance.
    if (prewarmedHrefRef.current === localizedHref) {
      return;
    }

    if (prefetch !== false) {
      try {
        void router.prefetch(localizedHref);
      } catch {
        // Best-effort optimization only.
      }
    }

    if (queryPrewarm !== false) {
      try {
        prewarmDashboardQueries(queryClient, localizedHref);
      } catch {
        // Best-effort optimization only.
      }
    }

    if (prefetch !== false || queryPrewarm !== false) {
      prewarmedHrefRef.current = localizedHref;
    }
  }

  useEffect(() => {
    prewarmedHrefRef.current = null;
    clearHoverTimer();
    return clearHoverTimer;
  }, [localizedHref]);

  return (
    <Link
      href={localizedHref}
      prefetch={prefetch}
      onMouseEnter={(event) => {
        clearHoverTimer();
        if (prewarmedHrefRef.current !== localizedHref) {
          hoverTimerRef.current = setTimeout(() => {
            handlePrewarm();
          }, HOVER_PREWARM_DELAY_MS);
        }
        onMouseEnter?.(event);
      }}
      onMouseLeave={(event) => {
        clearHoverTimer();
        onMouseLeave?.(event);
      }}
      onFocus={(event) => {
        handlePrewarm();
        onFocus?.(event);
      }}
      {...props}
    />
  );
}
