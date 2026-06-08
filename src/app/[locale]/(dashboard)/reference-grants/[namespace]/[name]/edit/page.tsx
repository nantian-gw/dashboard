"use client";

import { useParams } from "next/navigation";
import { ReferenceGrantForm, referenceGrantResourceToFormData } from "@/components/resources/referencegrant-form";
import { useReferenceGrant } from "@/hooks/use-api";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function EditReferenceGrantPage() {
  const params = useParams();
  const namespace = params.namespace as string;
  const name = params.name as string;

  const { data: grant, isLoading, error } = useReferenceGrant(namespace, name);

  if (isLoading) {
    return (
      <div className="space-y-4 p-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !grant) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Failed to load ReferenceGrant: {error ? (error as Error).message : `"${namespace}/${name}" not found`}
        </CardContent>
      </Card>
    );
  }

  return (
    <ReferenceGrantForm
      mode="edit"
      initialData={referenceGrantResourceToFormData(grant)}
      onSuccess={() => {
        const locale = (params as { locale: string }).locale;
        window.location.href = `/${locale}/reference-grants/${namespace}/${name}`;
      }}
    />
  );
}
