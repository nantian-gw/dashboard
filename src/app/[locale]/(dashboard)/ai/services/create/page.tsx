"use client";

import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import PageSkeleton from "@/components/dashboard/page-skeleton";

const AIServiceForm = dynamic(() => import("@/components/resources/aiservice-form").then((mod) => mod.AIServiceForm), {
  loading: () => <PageSkeleton />,
});

export default function CreateAIServicePage() {
  const locale = (useParams() as { locale: string }).locale;
  return <AIServiceForm mode="create" onSuccess={() => { window.location.href = `/${locale}/ai/services`; }} />;
}
