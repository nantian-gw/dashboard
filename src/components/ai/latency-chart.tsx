"use client";

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

export function LatencyChart({ data }: LatencyChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    time: new Date(d.timestamp).toISOString(),
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <RechartsLineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 11 }}
          className="text-muted-foreground"
          tickFormatter={(v) => new Date(v).toLocaleTimeString()}
        />
        <YAxis
          tick={{ fontSize: 11 }}
          className="text-muted-foreground"
          unit=" ms"
        />
        <Tooltip
          labelFormatter={(label) => new Date(label).toLocaleString()}
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
}