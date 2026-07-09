"use client";

import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import PageSkeleton from "@/components/dashboard/page-skeleton";

const HTTPRouteForm = dynamic(() => import("@/components/resources/httproute-form").then((mod) => mod.HTTPRouteForm), {
  loading: () => <PageSkeleton />,
});

export default function CreateRoutePage() {
  const locale = (useParams() as { locale: string }).locale;
  return <HTTPRouteForm mode="create" onSuccess={() => { window.location.href = `/${locale}/routes`; }} />;
}
