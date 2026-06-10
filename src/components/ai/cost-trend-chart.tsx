"use client";

import { memo, useMemo, useCallback } from "react";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { AICostTrend } from "@/hooks/use-api";

const MODEL_COLORS = [
  "#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1",
];

interface CostTrendChartProps {
  data: AICostTrend[];
}

export const CostTrendChart = memo(function CostTrendChart({ data }: CostTrendChartProps) {
  const { models, chartData } = useMemo(() => {
    const modelsSet = new Set<string>();
    const dateMap = new Map<string, Record<string, number>>();

    data.forEach((d) => {
      modelsSet.add(d.model);
      if (!dateMap.has(d.date)) {
        dateMap.set(d.date, {});
      }
      dateMap.get(d.date)![d.model] = Number(d.cost.toFixed(6));
    });

    const sortedChartData = Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, costs]) => ({
        date,
        ...costs,
      }));

    return {
      models: Array.from(modelsSet),
      chartData: sortedChartData,
    };
  }, [data]);

  const formatXAxis = useCallback((v: any) => {
    return new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }, []);

  const formatYAxis = useCallback((v: any) => {
    return `$${Number(v).toFixed(4)}`;
  }, []);

  const formatTooltipLabel = useCallback((label: any) => {
    return new Date(label).toLocaleDateString();
  }, []);

  const formatTooltipValue = useCallback((value: any, name: any) => {
    return [`$${Number(value).toFixed(6)}`, String(name)];
  }, []);

  return (
    <ResponsiveContainer width="100%" height={320}>
      <RechartsLineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          className="text-muted-foreground"
          tickFormatter={formatXAxis}
        />
        <YAxis
          tick={{ fontSize: 11 }}
          className="text-muted-foreground"
          tickFormatter={formatYAxis}
        />
        <Tooltip
          labelFormatter={formatTooltipLabel}
          formatter={formatTooltipValue}
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.5rem",
          }}
        />
        <Legend />
        {models.map((model, index) => (
          <Line
            key={model}
            type="monotone"
            dataKey={model}
            name={model}
            stroke={MODEL_COLORS[index % MODEL_COLORS.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
});
