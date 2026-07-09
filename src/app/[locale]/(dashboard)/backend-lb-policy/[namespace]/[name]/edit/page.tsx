"use client";

import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import PageSkeleton from "@/components/dashboard/page-skeleton";
import { backendLbPolicyResourceToFormData } from "@/components/resources/backendlbpolicy-form-codec";
import { useBackendLb } from "@/hooks/use-api";
import { type BackendLbPolicyRow } from "@/lib/admin-models";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

const BackendLbPolicyForm = dynamic(() => import("@/components/resources/backendlbpolicy-form").then((mod) => mod.BackendLbPolicyForm), {
  loading: () => <PageSkeleton />,
});

export default function EditBackendLbPolicyPage() {
  const params = useParams();
  const namespace = String(params.namespace || "");
  const name = String(params.name || "");

  const { data, isLoading, error } = useBackendLb();

  let resourceData: Record<string, unknown> | null = null;
  if (data) {
    const policies = Array.isArray(data) ? data : data?.policies || [];
    const policy = policies.find(
      (p: BackendLbPolicyRow) => p.name === name && p.namespace === namespace
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
          Failed to load BackendLBPolicy:{" "}
          {error
            ? (error as Error).message
            : `"${namespace}/${name}" not found`}
        </CardContent>
      </Card>
    );
  }

  return (
    <BackendLbPolicyForm
      mode="edit"
      initialData={backendLbPolicyResourceToFormData(resourceData)}
      onSuccess={() => {
        const locale = String(params.locale || "en");
        window.location.href = `/${locale}/backend-lb-policy/${namespace}/${name}`;
      }}
    />
  );
}
