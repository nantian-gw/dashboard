"use client";

import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface AreaChartProps {
  data: Array<{ time: string; value: number }>;
  dataKey?: string;
  nameKey?: string;
  stroke?: string;
  fill?: string;
  fillOpacity?: number;
}

export function AreaChart({
  data,
  dataKey = "value",
  nameKey = "time",
  stroke = "#3b82f6",
  fill = "#3b82f6",
  fillOpacity = 0.2,
}: AreaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsAreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey={nameKey}
          tick={{ fontSize: 11 }}
          className="text-muted-foreground"
          tickFormatter={(v) => new Date(v).toLocaleTimeString()}
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
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={stroke}
          fill={fill}
          fillOpacity={fillOpacity}
          strokeWidth={2}
        />
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
}