"use client";

import { useParams } from "next/navigation";
import { HTTPRouteForm } from "@/components/resources/httproute-form";

export default function CreateRoutePage() {
  const locale = (useParams() as { locale: string }).locale;
  return <HTTPRouteForm mode="create" onSuccess={() => { window.location.href = `/${locale}/routes`; }} />;
}
