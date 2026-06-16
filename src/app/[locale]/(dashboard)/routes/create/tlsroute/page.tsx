"use client";

import { useParams } from "next/navigation";
import { TLSRouteForm } from "@/components/resources/tlsroute-form";

export default function CreateTLSRoutePage() {
  const locale = (useParams() as { locale: string }).locale;

  return (
    <TLSRouteForm
      mode="create"
      onSuccess={() => {
        window.location.href = `/${locale}/routes`;
      }}
    />
  );
}
