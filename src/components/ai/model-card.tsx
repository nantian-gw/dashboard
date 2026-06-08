"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FormatBadge } from "./format-badge";
import type { AIServiceSummary } from "@/hooks/use-api";

interface ModelCardProps {
  service: AIServiceSummary;
}

const STATUS_MAP: Record<string, { labelKey: string; dotClass: string }> = {
  active: { labelKey: "ai.status_active", dotClass: "bg-emerald-500" },
  ready: { labelKey: "ai.status_active", dotClass: "bg-emerald-500" },
  inactive: { labelKey: "ai.status_inactive", dotClass: "bg-red-500" },
  unknown: { labelKey: "ai.status_inactive", dotClass: "bg-gray-400" },
};

export function ModelCard({ service }: ModelCardProps) {
  const t = useTranslations();
  const status = STATUS_MAP[service.status.toLowerCase()] ?? STATUS_MAP.unknown;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="font-semibold leading-none">{service.name}</p>
            <p className="text-xs text-muted-foreground">{service.namespace}</p>
          </div>
          <FormatBadge format={service.format} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <span className={status.dotClass + " inline-block h-2 w-2 rounded-full"} />
          <span className="text-sm text-muted-foreground">{t(status.labelKey)}</span>
        </div>
        <p className="mt-2 text-sm">
          <span className="text-muted-foreground">{t("ai.model")}: </span>
          <span className="font-mono text-xs">{service.model}</span>
        </p>
      </CardContent>
    </Card>
  );
}