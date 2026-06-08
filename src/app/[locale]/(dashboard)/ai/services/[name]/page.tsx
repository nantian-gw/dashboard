"use client";

import dynamic from "next/dynamic";
import { use } from "react";
import { useTranslations } from "next-intl";
import { useAIServices } from "@/hooks/use-api";
import { FormatBadge } from "@/components/ai/format-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { AIServiceSummary } from "@/hooks/use-api";

const TokenChart = dynamic(
  () => import("@/components/ai/token-chart").then((m) => m.TokenChart),
  { ssr: false, loading: () => <Skeleton className="h-[300px] w-full" /> },
);

const LatencyChart = dynamic(
  () => import("@/components/ai/latency-chart").then((m) => m.LatencyChart),
  { ssr: false, loading: () => <Skeleton className="h-[250px] w-full" /> },
);

export default function AIServiceDetailPage({
  params,
}: {
  params: Promise<{ locale: string; name: string }>;
}) {
  const t = useTranslations();
  const { name } = use(params);
  const decodedName = decodeURIComponent(name);

  const { data, isLoading, error } = useAIServices();
  const services = Array.isArray(data) ? data : [];
  const service = services.find(
    (s) => s.name === decodedName,
  ) as AIServiceSummary | undefined;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Failed to load AI service: {(error as Error).message}
        </CardContent>
      </Card>
    );
  }

  if (!service) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          AI service not found.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{service.name}</h1>
        <p className="text-muted-foreground">{t("pages.ai.service_detail.subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("ai.provider")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{service.provider}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("ai.format")}</CardTitle>
          </CardHeader>
          <CardContent>
            <FormatBadge format={service.format} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("ai.model")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-sm">{service.model}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("ai.status")}</CardTitle>
          </CardHeader>
          <CardContent>
            <span
              className={
                service.status === "active"
                  ? "inline-block h-2 w-2 rounded-full bg-emerald-500 mr-2"
                  : "inline-block h-2 w-2 rounded-full bg-red-500 mr-2"
              }
            />
            <span className="text-sm text-muted-foreground">
              {service.status === "active" ? t("ai.status_active") : t("ai.status_inactive")}
            </span>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("ai.token_usage")}</CardTitle>
          </CardHeader>
          <CardContent>
            <TokenChart data={[]} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("ai.latency")}</CardTitle>
          </CardHeader>
          <CardContent>
            <LatencyChart data={[]} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}