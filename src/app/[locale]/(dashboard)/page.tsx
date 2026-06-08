import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import OverviewClient from "./overview-client";

export default async function OverviewPage() {
  const t = await getTranslations();
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t("pages.overview.title")}</h1>
      <p className="text-muted-foreground">{t("pages.overview.subtitle")}</p>
      <Suspense fallback={<OverviewSkeleton />}>
        <OverviewClient />
      </Suspense>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card text-card-foreground shadow">
          <div className="p-6 pb-2">
            <div className="h-4 w-24 animate-pulse rounded-md bg-primary/10" />
          </div>
          <div className="p-6 pt-0">
            <div className="h-8 w-16 animate-pulse rounded-md bg-primary/10" />
          </div>
        </div>
      ))}
    </div>
  );
}