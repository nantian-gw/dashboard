"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useAICost } from "@/hooks/use-api";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";

const CostTrendChart = dynamic(
  () => import("@/components/ai/cost-trend-chart").then((m) => m.CostTrendChart),
  { ssr: false, loading: () => <Skeleton className="h-[320px] w-full" /> },
);

export default function AICostModelPage() {
  const t = useTranslations();
  const locale = useLocale();
  const params = useParams();
  const model = decodeURIComponent(params.model as string);

  const { data, isLoading, error } = useAICost("30d");

  const modelData = data?.byModel.find((m) => m.model === model);
  const modelTrend = data?.trend.filter((d) => d.model === model) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/${locale}/ai/cost`}>
          <Button variant="ghost" size="sm" className="mb-2 -ml-2">
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t("ai.cost.back_to_cost")}
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">{model}</h1>
        <p className="text-muted-foreground">{t("pages.ai.costDetail.subtitle")}</p>
      </div>

      {isLoading && (
        <>
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
          <Skeleton className="h-[320px] w-full" />
        </>
      )}

      {error && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Failed to load cost data: {(error as Error).message}
          </CardContent>
        </Card>
      )}

      {data && !modelData && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Model &quot;{model}&quot; not found in cost data.
          </CardContent>
        </Card>
      )}

      {modelData && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label={t("ai.cost.cost")}
              value={`$${modelData.cost.toFixed(4)}`}
              className="border-l-4 border-l-emerald-500"
            />
            <KpiCard
              label={t("ai.cost.requests")}
              value={modelData.requests}
              className="border-l-4 border-l-blue-500"
            />
            <KpiCard
              label={t("ai.cost.input_tokens")}
              value={modelData.inputTokens}
              className="border-l-4 border-l-violet-500"
            />
            <KpiCard
              label={t("ai.cost.output_tokens")}
              value={modelData.outputTokens}
              className="border-l-4 border-l-amber-500"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                {t("ai.cost.cost_trend")} - {model}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CostTrendChart data={modelTrend} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}