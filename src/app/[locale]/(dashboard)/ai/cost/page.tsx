"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useAICost } from "@/hooks/use-api";
import { CostSummaryCards } from "@/components/ai/cost-summary-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CostByModelChart = dynamic(
  () => import("@/components/ai/cost-by-model-chart").then((m) => m.CostByModelChart),
  { ssr: false, loading: () => <Skeleton className="h-[320px] w-full" /> },
);

const CostTrendChart = dynamic(
  () => import("@/components/ai/cost-trend-chart").then((m) => m.CostTrendChart),
  { ssr: false, loading: () => <Skeleton className="h-[320px] w-full" /> },
);

const ModelCostTable = dynamic(
  () => import("@/components/ai/model-cost-table").then((m) => m.ModelCostTable),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> },
);

type TimeRange = "24h" | "7d" | "30d";

export default function AICostPage() {
  const t = useTranslations();
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const { data, isLoading, error } = useAICost(timeRange);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t("pages.ai.cost.title")}</h1>
          <p className="text-muted-foreground">{t("pages.ai.cost.subtitle")}</p>
        </div>

        <div className="flex items-center gap-2">
          {(["24h", "7d", "30d"] as TimeRange[]).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setTimeRange(range)}
              className={cn(timeRange === range && "font-medium")}
            >
              {t(`ai.time_${range}`)}
            </Button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-[320px] w-full" />
        <Skeleton className="h-[320px] w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t("pages.ai.cost.title")}</h1>
          <p className="text-muted-foreground">{t("pages.ai.cost.subtitle")}</p>
        </div>

        <div className="flex items-center gap-2">
          {(["24h", "7d", "30d"] as TimeRange[]).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setTimeRange(range)}
              className={cn(timeRange === range && "font-medium")}
            >
              {t(`ai.time_${range}`)}
            </Button>
          ))}
        </div>

        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Failed to load cost data: {(error as Error).message}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("pages.ai.cost.title")}</h1>
        <p className="text-muted-foreground">{t("pages.ai.cost.subtitle")}</p>
      </div>

      <div className="flex items-center gap-2">
        {(["24h", "7d", "30d"] as TimeRange[]).map((range) => (
          <Button
            key={range}
            variant={timeRange === range ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setTimeRange(range)}
            className={cn(timeRange === range && "font-medium")}
          >
            {t(`ai.time_${range}`)}
          </Button>
        ))}
      </div>

      <CostSummaryCards
        totalCost={data!.totalCost}
        todayCost={data!.todayCost}
        monthCost={data!.monthCost}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("ai.cost.cost_by_model")}</CardTitle>
          </CardHeader>
          <CardContent>
            <CostByModelChart data={data!.byModel} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("ai.cost.cost_trend")}</CardTitle>
          </CardHeader>
          <CardContent>
            <CostTrendChart data={data!.trend} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("ai.cost.model_cost_table")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ModelCostTable data={data!.byModel} />
        </CardContent>
      </Card>
    </div>
  );
}