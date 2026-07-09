"use client";

import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import PageSkeleton from "@/components/dashboard/page-skeleton";

const UDPRouteForm = dynamic(() => import("@/components/resources/udproute-form").then((mod) => mod.UDPRouteForm), {
  loading: () => <PageSkeleton />,
});

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
