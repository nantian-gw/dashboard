"use client";

import type { ComponentProps } from "react";
import Link, { type LinkProps } from "next/link";
import { useLocale } from "next-intl";
import { localizeDashboardPath } from "@/lib/dashboard-navigation";

type LocalizedLinkProps = Omit<ComponentProps<typeof Link>, "href"> &
  Pick<LinkProps, "replace" | "scroll" | "prefetch"> & {
    href: string;
  };

export function LocalizedLink({ href, ...props }: LocalizedLinkProps) {
  const locale = useLocale();

  return <Link href={localizeDashboardPath(locale, href)} {...props} />;
}
