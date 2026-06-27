"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { gatewayResourceToFormData } from "@/components/resources/gateway-form-codec";
import { controlplane } from "@/lib/api";
import { GatewayForm } from "@/components/resources/gateway-form";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditGatewayPage() {
  const params = useParams();
  const namespace = String(params.namespace || "");
  const name = String(params.name || "");

  const { data, isLoading, error } = useQuery({
    queryKey: ["gateway", "edit", namespace, name],
    queryFn: () => controlplane.get(`/v1/resources/gateway/${namespace}/${name}`),
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
            Failed to load gateway: {error instanceof Error ? error.message : "not found"}
          </CardContent>
        </Card>
      </div>
    );
  }

  const formData = gatewayResourceToFormData(data as Record<string, unknown>);

  return (
    <GatewayForm
      initialData={formData}
      mode="edit"
      onSuccess={() => {
        const locale = (params as { locale: string }).locale;
        window.location.href = `/${locale}/gateways/${namespace}/${name}`;
      }}
    />
  );
}
