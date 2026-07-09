"use client";

import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import PageSkeleton from "@/components/dashboard/page-skeleton";

const GRPCRouteForm = dynamic(() => import("@/components/resources/grpcroute-form").then((mod) => mod.GRPCRouteForm), {
  loading: () => <PageSkeleton />,
});

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
