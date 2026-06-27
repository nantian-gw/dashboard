"use client";

import { memo, useCallback } from "react";
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

interface LineChartComponentProps {
  data: Record<string, string | number>[];
  dataKey?: string;
  stroke?: string;
  name?: string;
  yAxisWidth?: number;
}

export const LineChartComponent = memo(function LineChartComponent({
  data,
  dataKey = "value",
  stroke = "#3b82f6",
  name = dataKey,
  yAxisWidth = 40,
}: LineChartComponentProps) {
  const formatTick = useCallback((v: string | number) => {
    return new Date(v).toLocaleTimeString();
  }, []);

  return (
    <ResponsiveContainer width="100%" height={250}>
      <RechartsLineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 11 }}
          className="text-muted-foreground"
          tickFormatter={formatTick}
        />
        <YAxis tick={{ fontSize: 11 }} width={yAxisWidth} className="text-muted-foreground" />
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
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={stroke}
          name={name}
          strokeWidth={2}
          dot={false}
        />
      </RechartsLineChart>
    </ResponsiveContainer>
  );
});