"use client";

import { memo, useMemo, useCallback } from "react";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { AITokenUsage } from "@/hooks/use-api";

interface TokenChartProps {
  data: AITokenUsage[];
}

export const TokenChart = memo(function TokenChart({ data }: TokenChartProps) {
  const chartData = useMemo(() => {
    return data.map((d) => ({
      ...d,
      time: new Date(d.timestamp).toISOString(),
    }));
  }, [data]);

  const formatXAxis = useCallback((v: string | number) => {
    return new Date(v).toLocaleDateString();
  }, []);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsBarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 11 }}
          className="text-muted-foreground"
          tickFormatter={formatXAxis}
        />
        <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
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
        <Legend />
        <Bar dataKey="promptTokens" name="Prompt Tokens" stackId="a" fill="var(--ai-primary)" />
        <Bar
          dataKey="completionTokens"
          name="Completion Tokens"
          stackId="a"
          fill="var(--ai-accent-openai)"
        />
      </RechartsBarChart>
    </ResponsiveContainer>
  );
});