"use client";

import { useParams } from "next/navigation";
import { TCPRouteForm } from "@/components/resources/tcproute-form";

export default function CreateTCPRoutePage() {
  const locale = (useParams() as { locale: string }).locale;

  return (
    <TCPRouteForm
      mode="create"
      onSuccess={() => {
        window.location.href = `/${locale}/routes`;
      }}
    />
  );
}
