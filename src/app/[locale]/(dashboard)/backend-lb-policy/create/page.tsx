"use client";

import { useParams } from "next/navigation";
import { BackendLbPolicyForm } from "@/components/resources/backendlbpolicy-form";

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
