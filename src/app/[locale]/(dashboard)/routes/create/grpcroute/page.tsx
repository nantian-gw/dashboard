"use client";

import { useParams } from "next/navigation";
import { GRPCRouteForm } from "@/components/resources/grpcroute-form";

export default function CreateGRPCRoutePage() {
  const locale = (useParams() as { locale: string }).locale;

  return (
    <GRPCRouteForm
      mode="create"
      onSuccess={() => {
        window.location.href = `/${locale}/routes`;
      }}
    />
  );
}
