"use client";

import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import PageSkeleton from "@/components/dashboard/page-skeleton";

const BackendLbPolicyForm = dynamic(() => import("@/components/resources/backendlbpolicy-form").then((mod) => mod.BackendLbPolicyForm), {
  loading: () => <PageSkeleton />,
});

export default function CreateBackendLbPolicyPage() {
  const locale = (useParams() as { locale: string }).locale;
  return (
    <BackendLbPolicyForm
      mode="create"
      onSuccess={() => {
        window.location.href = `/${locale}/backend-lb-policy`;
      }}
    />
  );
}
