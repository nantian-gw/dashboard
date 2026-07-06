import { memo } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface KpiCardProps {
  label: string;
  value: number | string;
  foot?: string;
  className?: string;
}

export const KpiCard = memo(function KpiCard({ label, value, foot, className }: KpiCardProps) {
  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tabular-nums">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        {foot && <p className="mt-1 text-xs text-muted-foreground">{foot}</p>}
      </CardContent>
    </Card>
  );
});