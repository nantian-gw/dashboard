"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useAITokenUsage } from "@/hooks/use-api";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TokenChart = dynamic(
  () => import("@/components/ai/token-chart").then((m) => m.TokenChart),
  { ssr: false, loading: () => <Skeleton className="h-[300px] w-full" /> },
);

type TimeRange = "24h" | "7d" | "30d";

export default function AIUsagePage() {
  const t = useTranslations();
  const [timeRange, setTimeRange] = useState<TimeRange>("24h");
  const { data, isLoading, error } = useAITokenUsage();

  const usage = Array.isArray(data) ? data : [];

  const totalPrompt = usage.reduce((sum, u) => sum + u.promptTokens, 0);
  const totalCompletion = usage.reduce((sum, u) => sum + u.completionTokens, 0);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t("pages.ai.usage.title")}</h1>
          <p className="text-muted-foreground">{t("pages.ai.usage.subtitle")}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-12" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-12" />
            </CardContent>
          </Card>
        </div>
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t("pages.ai.usage.title")}</h1>
          <p className="text-muted-foreground">{t("pages.ai.usage.subtitle")}</p>
        </div>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Failed to load token usage: {(error as Error).message}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("pages.ai.usage.title")}</h1>
        <p className="text-muted-foreground">{t("pages.ai.usage.subtitle")}</p>
      </div>

      <div className="flex items-center gap-2">
        {(["24h", "7d", "30d"] as TimeRange[]).map((range) => (
          <Button
            key={range}
            variant={timeRange === range ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setTimeRange(range)}
            className={cn(timeRange === range && "bg-muted font-medium")}
          >
            {t(`ai.time_${range}`)}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <KpiCard label={t("ai.prompt_tokens")} value={totalPrompt} />
        <KpiCard label={t("ai.completion_tokens")} value={totalCompletion} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("ai.token_usage_trend")}</CardTitle>
        </CardHeader>
        <CardContent>
          <TokenChart data={usage} />
        </CardContent>
      </Card>
    </div>
  );
}