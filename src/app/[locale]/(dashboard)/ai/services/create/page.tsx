"use client";

import { useParams } from "next/navigation";
import { AIServiceForm } from "@/components/resources/aiservice-form";

export default function CreateAIServicePage() {
  const locale = (useParams() as { locale: string }).locale;
  return <AIServiceForm mode="create" onSuccess={() => { window.location.href = `/${locale}/ai/services`; }} />;
}
