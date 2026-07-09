"use client";

import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import PageSkeleton from "@/components/dashboard/page-skeleton";

const TokenPolicyForm = dynamic(() => import("@/components/resources/tokenpolicy-form").then((mod) => mod.TokenPolicyForm), {
  loading: () => <PageSkeleton />,
});

export default function CreateTokenPolicyPage() {
  const locale = (useParams() as { locale: string }).locale;
  return <TokenPolicyForm mode="create" onSuccess={() => { window.location.href = `/${locale}/ai/token-policies`; }} />;
}
