"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { controlplane } from "@/lib/api";
import { HTTPRouteForm, httpRouteResourceToFormData } from "@/components/resources/httproute-form";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditRoutePage() {
  const params = useParams();
  const namespace = String(params.namespace || "");
  const name = String(params.name || "");
  const kind = String(params.kind || "HTTPRoute");

  const { data, isLoading, error } = useQuery({
    queryKey: ["route", "edit", kind, namespace, name],
    queryFn: () => controlplane.get(`/v1/resources/${kind.toLowerCase()}/${namespace}/${name}`),
    enabled: !!namespace && !!name,
  });

  if (isLoading) {
    return (
      <div className="space-y-4 p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex justify-center py-8">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Failed to load {kind}: {error instanceof Error ? error.message : "not found"}
          </CardContent>
        </Card>
      </div>
    );
  }

  const formData = httpRouteResourceToFormData(data as Record<string, any>);

  return (
    <HTTPRouteForm
      initialData={formData}
      mode="edit"
      onSuccess={() => {
        const locale = (params as { locale: string }).locale;
        window.location.href = `/${locale}/routes/${kind.toLowerCase()}/${namespace}/${name}`;
      }}
    />
  );
}
