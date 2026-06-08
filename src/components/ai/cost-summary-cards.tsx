"use client";

import { useTranslations } from "next-intl";
import { KpiCard } from "@/components/dashboard/kpi-card";

interface CostSummaryCardsProps {
  totalCost: number;
  todayCost: number;
  monthCost: number;
}

function formatCost(value: number): string {
  return `$${value.toFixed(4)}`;
}

export function CostSummaryCards({ totalCost, todayCost, monthCost }: CostSummaryCardsProps) {
  const t = useTranslations();

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <KpiCard
        label={t("ai.cost.total_cost")}
        value={formatCost(totalCost)}
        className="border-l-4 border-l-emerald-500"
      />
      <KpiCard
        label={t("ai.cost.today_cost")}
        value={formatCost(todayCost)}
        className="border-l-4 border-l-blue-500"
      />
      <KpiCard
        label={t("ai.cost.month_cost")}
        value={formatCost(monthCost)}
        className="border-l-4 border-l-violet-500"
      />
    </div>
  );
}
