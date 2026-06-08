"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAIServices } from "@/hooks/use-api";
import { ModelCard } from "@/components/ai/model-card";
import { ModelSelector } from "@/components/ai/model-selector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import Link from "next/link";

export default function AIServicesPage() {
  const t = useTranslations();
  const { data, isLoading, error } = useAIServices();
  const [selectedModel, setSelectedModel] = useState("all");

  const services = Array.isArray(data) ? data : [];
  const models = [...new Set(services.map((s) => s.model))].sort();

  const filtered =
    selectedModel === "all"
      ? services
      : services.filter((s) => s.model === selectedModel);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("pages.ai.services.title")}</h1>
        <p className="text-muted-foreground">{t("pages.ai.services.subtitle")}</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t("ai.filter_by_model")}:</span>
          <ModelSelector
            models={models}
            selected={selectedModel}
            onSelect={setSelectedModel}
          />
        </div>
        <Link href="/ai/services/create">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            {t("actions.create_ai_service")}
          </Button>
        </Link>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Failed to load AI services: {(error as Error).message}
          </CardContent>
        </Card>
      )}

      {data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((service) => (
            <ModelCard key={`${service.namespace}-${service.name}`} service={service} />
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full py-8 text-center text-muted-foreground">
              No AI services found.
            </p>
          )}
        </div>
      )}
    </div>
  );
}