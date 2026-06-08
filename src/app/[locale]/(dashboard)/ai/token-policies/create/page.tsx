"use client";

import { useParams } from "next/navigation";
import { TokenPolicyForm } from "@/components/resources/tokenpolicy-form";

export default function CreateTokenPolicyPage() {
  const locale = (useParams() as { locale: string }).locale;
  return <TokenPolicyForm mode="create" onSuccess={() => { window.location.href = `/${locale}/ai/token-policies`; }} />;
}
