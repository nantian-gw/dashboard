"use client";

import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import PageSkeleton from "@/components/dashboard/page-skeleton";

const BackendTlsForm = dynamic(() => import("@/components/resources/backendtls-form").then((mod) => mod.BackendTlsForm), {
  loading: () => <PageSkeleton />,
});

export default function CreateBackendTlsPage() {
  const locale = (useParams() as { locale: string }).locale;
  return <BackendTlsForm mode="create" onSuccess={() => { window.location.href = `/${locale}/backend-tls`; }} />;
}
