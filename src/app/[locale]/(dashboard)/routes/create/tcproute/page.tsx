"use client";

import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import PageSkeleton from "@/components/dashboard/page-skeleton";

const TCPRouteForm = dynamic(() => import("@/components/resources/tcproute-form").then((mod) => mod.TCPRouteForm), {
  loading: () => <PageSkeleton />,
});

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
