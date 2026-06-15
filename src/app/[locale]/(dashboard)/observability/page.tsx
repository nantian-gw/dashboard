"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  usePrometheusQuery,
  usePrometheusRangeQuery,
  type PrometheusResponse,
  type PrometheusRangeResponse,
} from "@/hooks/use-api";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TimeRangeSelector, TIME_RANGES, type TimeRange } from "@/components/dashboard/time-range-selector";
import { Download } from "lucide-react";

const AreaChart = dynamic(() => import("@/components/charts/area-chart").then((m) => m.AreaChart), {
  ssr: false,
  loading: () => <Skeleton className="h-[300px] w-full" />,
});
const LineChartComponent = dynamic(
  () => import("@/components/charts/line-chart").then((m) => m.LineChartComponent),
  { ssr: false, loading: () => <Skeleton className="h-[250px] w-full" /> },
);

const P95_QUERY = 'histogram_quantile(0.95, rate(nantian_gateway_dataplane_traffic_request_latency_ms_bucket{response_flag="none"}[5m]))';
const P99_QUERY = 'histogram_quantile(0.99, rate(nantian_gateway_dataplane_traffic_request_latency_ms_bucket{response_flag="none"}[5m]))';
const RPS_QUERY = 'rate(nantian_gateway_dataplane_traffic_request_events_total[5m])';
const SUCCESS_RATE_QUERY = 'sum(rate(nantian_gateway_dataplane_traffic_response_flags_total{flag="none"}[5m])) / sum(rate(nantian_gateway_dataplane_traffic_request_events_total[5m])) * 100';

function scalarValue(data: PrometheusResponse | undefined): number | null {
  if (!data || data.status !== "success") return null;
  const result = data.data?.result;
  if (!result || result.length === 0) return null;
  const val = Number(result[0]?.value?.[1]);
  return Number.isFinite(val) ? val : null;
}

function rangeValues(data: PrometheusRangeResponse | undefined): Array<{ time: string; value: number }> {
  if (!data || data.status !== "success") return [];
  const result = data.data?.result;
  if (!result || result.length === 0) return [];
  return (result[0]?.values || [])
    .map(([ts, v]) => ({ time: new Date(ts * 1000).toISOString(), value: Number(v) }))
    .filter((p) => Number.isFinite(p.value));
}

function rangePairValues(
  a: PrometheusRangeResponse | undefined,
  b: PrometheusRangeResponse | undefined,
): Array<{ time: string; a: number; b: number }> {
  const va = a?.data?.result?.[0]?.values || [];
  const vb = b?.data?.result?.[0]?.values || [];
  const byTime = new Map(va.map(([ts, v]) => [ts, Number(v)]));
  return vb
    .map(([ts, v]) => {
      const valueB = Number(v);
      const valueA = byTime.get(ts);
      if (!Number.isFinite(valueB) || valueA === undefined || !Number.isFinite(valueA)) return null;
      return { time: new Date(ts * 1000).toISOString(), a: valueA, b: valueB };
    })
    .filter((p): p is { time: string; a: number; b: number } => p !== null);
}

export default function ObservabilityPage() {
  const t = useTranslations();
  const [timeRange, setTimeRange] = useState<TimeRange>("1h");
  const hours = TIME_RANGES.find((r) => r.value === timeRange)?.hours ?? 1;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("pages.observability.title")}</h1>
          <p className="text-muted-foreground">{t("pages.observability.subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
          <Button variant="outline" size="sm" asChild>
            <a href="/grafana-dashboard.json" download>
              <Download className="mr-2 h-4 w-4" />
              Grafana JSON
            </a>
          </Button>
        </div>
      </div>
      <ObservabilityContent hours={hours} />
    </div>
  );
}

function ObservabilityContent({ hours }: { hours: number }) {
  return <ObservabilityData hours={hours} />;
}

function PrometheusNotConfiguredCard() {
  const t = useTranslations();
  return (
    <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
      <CardHeader>
        <CardTitle>{t("pages.observability.notConfigured.title")}</CardTitle>
        <CardDescription>{t("pages.observability.notConfigured.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Link href="/settings">
          <Button variant="default">{t("pages.observability.notConfigured.link")}</Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function PrometheusUnavailableCard() {
  const t = useTranslations();
  return (
    <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
      <CardHeader>
        <CardTitle>{t("pages.observability.unreachable.title")}</CardTitle>
        <CardDescription>{t("pages.observability.unreachable.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Link href="/settings">
          <Button variant="outline">{t("pages.observability.unreachable.link")}</Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function ObservabilityData({ hours }: { hours: number }) {
  const {
    data: p95Data,
    isLoading: p95Loading,
    isError: p95Error,
  } = usePrometheusQuery(P95_QUERY);
  const {
    data: p99Data,
    isLoading: p99Loading,
    isError: p99Error,
  } = usePrometheusQuery(P99_QUERY);
  const {
    data: rpsData,
    isLoading: rpsLoading,
    isError: rpsError,
  } = usePrometheusQuery(RPS_QUERY);
  const {
    data: successRateData,
    isLoading: srLoading,
    isError: srError,
  } = usePrometheusQuery(SUCCESS_RATE_QUERY);

  const {
    data: rpsRangeData,
    isLoading: rpsRangeLoading,
    isError: rpsRangeError,
  } = usePrometheusRangeQuery(RPS_QUERY, hours);
  const {
    data: p95RangeData,
    isLoading: p95RangeLoading,
    isError: p95RangeError,
  } = usePrometheusRangeQuery(P95_QUERY, hours);
  const {
    data: p99RangeData,
    isLoading: p99RangeLoading,
    isError: p99RangeError,
  } = usePrometheusRangeQuery(P99_QUERY, hours);
  const {
    data: successRangeData,
    isLoading: srRangeLoading,
    isError: srRangeError,
  } = usePrometheusRangeQuery(SUCCESS_RATE_QUERY, hours);

  const isLoading =
    p95Loading || p99Loading || rpsLoading || srLoading ||
    rpsRangeLoading || p95RangeLoading || p99RangeLoading || srRangeLoading;
  const hasError =
    p95Error || p99Error || rpsError || srError ||
    rpsRangeError || p95RangeError || p99RangeError || srRangeError;
  const allEmpty =
    !isLoading &&
    !hasError &&
    (p95Data?.data?.result?.length ?? 0) === 0 &&
    (p99Data?.data?.result?.length ?? 0) === 0 &&
    (rpsData?.data?.result?.length ?? 0) === 0 &&
    (successRateData?.data?.result?.length ?? 0) === 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (allEmpty) {
    return <PrometheusNotConfiguredCard />;
  }

  if (hasError) {
    return <PrometheusUnavailableCard />;
  }

  const p95 = scalarValue(p95Data);
  const p99 = scalarValue(p99Data);
  const rps = scalarValue(rpsData);
  const successRate = scalarValue(successRateData);

  const rpsChartData = rangeValues(rpsRangeData);
  const latencyChartData = rangePairValues(p95RangeData, p99RangeData);
  const successChartData = rangeValues(successRangeData).map((p) => ({
    time: p.time,
    rate: Math.min(100, Math.max(0, p.value)),
  }));

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="RPS"
          value={rps !== null ? rps.toLocaleString() : "—"}
        />
        <KpiCard
          label="Success Rate"
          value={successRate !== null ? `${successRate.toFixed(1)}%` : "—"}
        />
        <KpiCard
          label="p95 Latency"
          value={p95 !== null ? `${p95.toFixed(1)}ms` : "—"}
        />
        <KpiCard
          label="p99 Latency"
          value={p99 !== null ? `${p99.toFixed(1)}ms` : "—"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Request Volume</CardTitle>
        </CardHeader>
        <CardContent>
          <AreaChart
            data={rpsChartData}
            dataKey="value"
            nameKey="time"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.2}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Latency (p95 / p99)</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChartComponent
              data={latencyChartData}
              dataKey="a"
              stroke="#3b82f6"
              name="p95"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChartComponent
              data={successChartData}
              dataKey="rate"
              stroke="#22c55e"
              name="Success Rate %"
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}