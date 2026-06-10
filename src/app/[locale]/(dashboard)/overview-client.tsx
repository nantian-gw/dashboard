"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useControlplaneSummary, useDataplaneSummary } from "@/hooks/use-api";

const DonutChart = dynamic(() => import("@/components/charts/donut-chart").then((m) => m.DonutChart), {
  ssr: false,
  loading: () => <Skeleton className="h-[200px] w-full" />,
});

type OverviewSnapshot = {
  listenerCount?: number;
  httpRouteCount?: number;
  grpcRouteCount?: number;
  streamRouteCount?: number;
  nodeCount?: number;
  readyNodeCount?: number;
  readyListenerCount?: number;
  warningListenerCount?: number;
  failedListenerCount?: number;
  currentVersionReadyCount?: number;
  driftedNodeCount?: number;
  snapshotVersion?: string;
  generatedAt?: string;
};

type DataplaneSummary = {
  trafficOverview?: {
    summary?: {
      counts?: {
        totalEvents?: number;
        bytesReceived?: number;
        bytesSent?: number;
        upstreamPoolHits?: number;
        upstreamPoolMisses?: number;
      };
      status?: {
        retryRate?: number;
        failoverSuccessRate?: number;
        upstreamPoolHitRatio?: number;
        maxLatencyMs?: number;
      };
    };
  };
};

export default function OverviewClient() {
  const t = useTranslations();
  const { data: cpSummary, isLoading: cpLoading } = useControlplaneSummary();
  const { data: dpSummary } = useDataplaneSummary();

  const snapshot = (cpSummary as OverviewSnapshot | undefined) ?? {};

  const listenerHealthData = useMemo(() => {
    return [
      { name: t("overview.status_ready"), value: snapshot.readyListenerCount ?? 0, color: "#22c55e" },
      { name: t("overview.status_warning"), value: snapshot.warningListenerCount ?? 0, color: "#f59e0b" },
      { name: t("overview.status_failed"), value: snapshot.failedListenerCount ?? 0, color: "#ef4444" },
    ];
  }, [snapshot.readyListenerCount, snapshot.warningListenerCount, snapshot.failedListenerCount, t]);

  const nodeStatusData = useMemo(() => {
    return [
      { name: t("overview.status_ready"), value: snapshot.currentVersionReadyCount ?? 0, color: "#22c55e" },
      { name: t("overview.status_drifted"), value: snapshot.driftedNodeCount ?? 0, color: "#f59e0b" },
    ];
  }, [snapshot.currentVersionReadyCount, snapshot.driftedNodeCount, t]);

  if (cpLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const traffic = (dpSummary as DataplaneSummary | undefined)?.trafficOverview?.summary ?? {};
  const trafficCounts = traffic.counts ?? {};
  const trafficStatus = traffic.status ?? {};

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label={t("overview.kpi_gateways")}
          value={snapshot.listenerCount ?? 0}
          foot={t("overview.kpi_gateways_foot")}
        />
        <KpiCard
          label={t("overview.kpi_http_routes")}
          value={snapshot.httpRouteCount ?? 0}
        />
        <KpiCard
          label={t("overview.kpi_grpc_routes")}
          value={snapshot.grpcRouteCount ?? 0}
        />
        <KpiCard
          label={t("overview.kpi_stream_routes")}
          value={snapshot.streamRouteCount ?? 0}
        />
        <KpiCard
          label={t("overview.kpi_nodes")}
          value={snapshot.nodeCount ?? 0}
          foot={t("overview.kpi_nodes_foot", { n: snapshot.readyNodeCount ?? 0 })}
        />
        <KpiCard
          label={t("overview.kpi_requests")}
          value={trafficCounts.totalEvents ?? 0}
          foot={t("overview.kpi_latency_foot", { ms: trafficStatus.maxLatencyMs ?? 0 })}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("overview.card_listener_health")}</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart data={listenerHealthData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("overview.card_node_status")}</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart data={nodeStatusData} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("overview.card_traffic")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">{t("overview.kpi_requests")}</p>
            <p className="text-2xl font-bold">{(trafficCounts.totalEvents ?? 0).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t("overview.traffic_max_latency")}</p>
            <p className="text-2xl font-bold">{trafficStatus.maxLatencyMs ?? 0}ms</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t("overview.traffic_throughput")}</p>
            <p className="text-2xl font-bold">{((trafficCounts.bytesReceived ?? 0) + (trafficCounts.bytesSent ?? 0)).toLocaleString()}B</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("overview.card_snapshot")}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t("overview.snapshot_version")}</dt>
              <dd className="font-mono">{snapshot.snapshotVersion ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t("overview.snapshot_generated")}</dt>
              <dd className="font-mono">{snapshot.generatedAt ?? "—"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </>
  );
}