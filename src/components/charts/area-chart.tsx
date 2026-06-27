"use client";

import { memo, useCallback } from "react";
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

export const AreaChart = memo(function AreaChart({
  data,
  dataKey = "value",
  nameKey = "time",
  stroke = "#3b82f6",
  fill = "#3b82f6",
  fillOpacity = 0.2,
}: AreaChartProps) {
  const formatTick = useCallback((v: string | number) => {
    return new Date(v).toLocaleTimeString();
  }, []);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsAreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey={nameKey}
          tick={{ fontSize: 11 }}
          className="text-muted-foreground"
          tickFormatter={formatTick}
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
});