"use client";

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { AICostByModel } from "@/hooks/use-api";

const MODEL_COLORS = [
  "#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1",
];

interface CostByModelChartProps {
  data: AICostByModel[];
}

export function CostByModelChart({ data }: CostByModelChartProps) {
  const chartData = [...data]
    .sort((a, b) => b.cost - a.cost)
    .map((d) => ({
      model: d.model,
      cost: Number(d.cost.toFixed(6)),
    }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <RechartsBarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 10, right: 20, left: 80, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11 }}
          className="text-muted-foreground"
          tickFormatter={(v) => `$${v.toFixed(4)}`}
        />
        <YAxis
          type="category"
          dataKey="model"
          tick={{ fontSize: 11 }}
          className="text-muted-foreground"
          width={75}
        />
        <Tooltip
          formatter={(value) => [`$${Number(value).toFixed(6)}`, "Cost"]}
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.5rem",
          }}
        />
        <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
          {chartData.map((_, index) => (
            <Cell key={index} fill={MODEL_COLORS[index % MODEL_COLORS.length]} />
          ))}
        </Bar>
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
