"use client";

import { useTranslations } from "next-intl";
import { Separator } from "@/components/ui/separator";
import { ExportDialog } from "@/components/dashboard/export-dialog";
import { ImportDialog } from "@/components/dashboard/import-dialog";
import { PrometheusCard } from "./prometheus-card";
import { LLMConfigCard } from "./llm-config-card";

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const t = useTranslations();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("settings.title")}</h1>
        <p className="text-muted-foreground">{t("settings.subtitle")}</p>
      </div>
      <div className="flex gap-2">
        <ExportDialog />
        <ImportDialog />
      </div>
      <PrometheusCard />
      <Separator className="my-2" />
      <LLMConfigCard />
    </div>
  );
}
