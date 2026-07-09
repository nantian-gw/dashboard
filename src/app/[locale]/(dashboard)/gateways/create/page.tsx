"use client";

import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import PageSkeleton from "@/components/dashboard/page-skeleton";

const GatewayForm = dynamic(() => import("@/components/resources/gateway-form").then((mod) => mod.GatewayForm), {
  loading: () => <PageSkeleton />,
});

export default function CreateGatewayPage() {
  const locale = (useParams() as { locale: string }).locale;
  return <GatewayForm mode="create" onSuccess={() => { window.location.href = `/${locale}/gateways`; }} />;
}
