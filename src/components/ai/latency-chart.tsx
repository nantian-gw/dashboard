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
} from "recharts";

interface LatencyDatum {
  timestamp: string;
  latency: number;
}

interface LatencyChartProps {
  data: LatencyDatum[];
}

export const LatencyChart = memo(function LatencyChart({ data }: LatencyChartProps) {
  const chartData = useMemo(() => {
    return data.map((d) => ({
      ...d,
      time: new Date(d.timestamp).toISOString(),
    }));
  }, [data]);

  const formatXAxis = useCallback((v: string | number) => {
    return new Date(v).toLocaleTimeString();
  }, []);

  return (
    <ResponsiveContainer width="100%" height={250}>
      <RechartsLineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 11 }}
          className="text-muted-foreground"
          tickFormatter={formatXAxis}
        />
        <YAxis
          tick={{ fontSize: 11 }}
          className="text-muted-foreground"
          unit=" ms"
        />
        <Tooltip
          labelFormatter={(label) => {
            return new Date(label as string | number).toLocaleString();
          }}
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.5rem",
          }}
        />
        <Line
          type="monotone"
          dataKey="latency"
          stroke="var(--ai-primary)"
          strokeWidth={2}
          dot={false}
        />
      </RechartsLineChart>
    </ResponsiveContainer>
  );
});