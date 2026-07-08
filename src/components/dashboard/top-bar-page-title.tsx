"use client";

import { memo } from "react";
import { usePathname } from "next/navigation";
import { getDashboardPageTitle } from "@/lib/dashboard-page-title";

export const TopBarPageTitle = memo(function TopBarPageTitle() {
  const pathname = usePathname();
  const pageTitle = getDashboardPageTitle(pathname);

  return <h2 className="font-semibold capitalize">{pageTitle}</h2>;
});
