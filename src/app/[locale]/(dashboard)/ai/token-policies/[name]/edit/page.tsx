"use client";

import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { tokenPolicyResourceToFormData } from "@/components/resources/tokenpolicy-form";
import PageSkeleton from "@/components/dashboard/page-skeleton";
import { useTokenPolicies } from "@/hooks/use-api";

const TokenPolicyForm = dynamic(() => import("@/components/resources/tokenpolicy-form").then((mod) => mod.TokenPolicyForm), {
  loading: () => <PageSkeleton />,
});
import { type TokenPolicyRow } from "@/lib/admin-models";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function EditTokenPolicyPage() {
  const params = useParams();
  const name = String(params.name || "");

  const { data, isLoading, error } = useTokenPolicies();

  let resourceData: Record<string, unknown> | null = null;
  if (data) {
    const policies = Array.isArray(data) ? data : data?.policies || [];
    const policy = policies.find(
      (p: TokenPolicyRow) => p.name === name
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
          Failed to load TokenPolicy: {error ? (error as Error).message : `"${name}" not found`}
        </CardContent>
      </Card>
    );
  }

  return (
    <TokenPolicyForm
      mode="edit"
      initialData={tokenPolicyResourceToFormData(resourceData)}
      onSuccess={() => {
        const locale = String(params.locale || "en");
        window.location.href = `/${locale}/ai/token-policies`;
      }}
    />
  );
}
