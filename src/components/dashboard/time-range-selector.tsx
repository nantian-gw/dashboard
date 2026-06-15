"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type TimeRange = "1h" | "6h" | "24h" | "7d" | "30d";

export const TIME_RANGES: { value: TimeRange; hours: number }[] = [
  { value: "1h", hours: 1 },
  { value: "6h", hours: 6 },
  { value: "24h", hours: 24 },
  { value: "7d", hours: 168 },
  { value: "30d", hours: 720 },
];

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
  className?: string;
}

export function TimeRangeSelector({ value, onChange, className }: TimeRangeSelectorProps) {
  const t = useTranslations();

  return (
    <div className={cn("flex items-center gap-1 rounded-lg bg-muted p-1", className)}>
      {TIME_RANGES.map((range) => (
        <Button
          key={range.value}
          variant={value === range.value ? "default" : "ghost"}
          size="sm"
          className="h-7 px-3 text-xs font-medium"
          onClick={() => onChange(range.value)}
        >
          {t(`timeRange.${range.value}`)}
        </Button>
      ))}
    </div>
  );
}
