"use client";

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

export function TokenChart({ data }: TokenChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    time: new Date(d.timestamp).toISOString(),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsBarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 11 }}
          className="text-muted-foreground"
          tickFormatter={(v) => new Date(v).toLocaleDateString()}
        />
        <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
        <Tooltip
          labelFormatter={(label) => new Date(label).toLocaleString()}
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
}