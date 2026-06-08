"use client";

import { useParams } from "next/navigation";
import { AIServiceForm, aiserviceResourceToFormData } from "@/components/resources/aiservice-form";
import { useAIServices } from "@/hooks/use-api";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function EditAIServicePage() {
  const params = useParams();
  const namespace = String(params.namespace || "");
  const name = String(params.name || "");

  const { data, isLoading, error } = useAIServices();

  let resourceData: Record<string, any> | null = null;
  if (data) {
    const services = Array.isArray(data) ? data : [];
    const service = services.find(
      (s: any) => s.name === name && (!namespace || s.namespace === namespace)
    );
    resourceData = service || null;
  }

  if (isLoading) {
    return (
      <div className="space-y-4 p-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !resourceData) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Failed to load AIService: {error ? (error as Error).message : `"${name}" not found`}
        </CardContent>
      </Card>
    );
  }

  return (
    <AIServiceForm
      mode="edit"
      initialData={aiserviceResourceToFormData(resourceData)}
      onSuccess={() => {
        const locale = String(params.locale || "en");
        window.location.href = `/${locale}/ai/services`;
      }}
    />
  );
}
