"use client";

import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import PageSkeleton from "@/components/dashboard/page-skeleton";

const TLSRouteForm = dynamic(() => import("@/components/resources/tlsroute-form").then((mod) => mod.TLSRouteForm), {
  loading: () => <PageSkeleton />,
});

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
