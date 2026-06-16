"use client";

import { useParams } from "next/navigation";
import { BackendTlsForm } from "@/components/resources/backendtls-form";
import { backendTlsResourceToFormData } from "@/components/resources/backendtls-form-codec";
import { useBackendTls } from "@/hooks/use-api";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function EditBackendTlsPage() {
  const params = useParams();
  const namespace = String(params.namespace || "");
  const name = String(params.name || "");

  const { data, isLoading, error } = useBackendTls();

  let resourceData: Record<string, any> | null = null;
  if (data) {
    const policies = Array.isArray(data) ? data : data?.policies || [];
    const policy = policies.find(
      (p: any) => p.name === name && p.namespace === namespace
    );
    resourceData = policy || null;
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
          Failed to load BackendTLSPolicy: {error ? (error as Error).message : `"${namespace}/${name}" not found`}
        </CardContent>
      </Card>
    );
  }

  return (
    <BackendTlsForm
      mode="edit"
      initialData={backendTlsResourceToFormData(resourceData)}
      onSuccess={() => {
        const locale = String(params.locale || "en");
        window.location.href = `/${locale}/backend-tls/${namespace}/${name}`;
      }}
    />
  );
}
