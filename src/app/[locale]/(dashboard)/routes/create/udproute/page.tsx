"use client";

import { useParams } from "next/navigation";
import { UDPRouteForm } from "@/components/resources/udproute-form";

export default function CreateUDPRoutePage() {
  const locale = (useParams() as { locale: string }).locale;

  return (
    <UDPRouteForm
      mode="create"
      onSuccess={() => {
        window.location.href = `/${locale}/routes`;
      }}
    />
  );
}
