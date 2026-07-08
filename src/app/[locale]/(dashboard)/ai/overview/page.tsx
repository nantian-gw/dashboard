"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useAIOverview, useAITokenTrend, useAILatencyTrend } from "@/hooks/use-api";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const TokenChart = dynamic(
  () => import("@/components/ai/token-chart").then((m) => m.TokenChart),
  { ssr: false, loading: () => <Skeleton className="h-[300px] w-full" /> },
);

const LatencyChart = dynamic(
  () => import("@/components/ai/latency-chart").then((m) => m.LatencyChart),
  { ssr: false, loading: () => <Skeleton className="h-[250px] w-full" /> },
);

export default function AIOverviewPage() {
  const t = useTranslations();
  const { data, isLoading, error } = useAIOverview();
  const { data: tokenTrend, isLoading: tokenLoading } = useAITokenTrend();
  const { data: latencyTrend, isLoading: latencyLoading } = useAILatencyTrend();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t("pages.ai.overview.title")}</h1>
          <p className="text-muted-foreground">{t("pages.ai.overview.subtitle")}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t("pages.ai.overview.title")}</h1>
          <p className="text-muted-foreground">{t("pages.ai.overview.subtitle")}</p>
        </div>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Failed to load AI overview: {(error as Error).message}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("pages.ai.overview.title")}</h1>
        <p className="text-muted-foreground">{t("pages.ai.overview.subtitle")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard label={t("ai.total_services")} value={data!.totalServices} />
        <KpiCard label={t("ai.total_tokens")} value={data!.totalTokens} />
        <KpiCard label={t("ai.total_requests")} value={data!.totalRequests} />
        <KpiCard
          label={t("ai.avg_latency")}
          value={`${data!.averageLatency.toFixed(1)} ms`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("ai.token_usage_trend")}</CardTitle>
          </CardHeader>
          <CardContent>
            {tokenLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <TokenChart data={tokenTrend ?? []} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("ai.latency_performance")}</CardTitle>
          </CardHeader>
          <CardContent>
            {latencyLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : (
              <LatencyChart data={latencyTrend ?? []} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}