"use client";

import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import PageSkeleton from "@/components/dashboard/page-skeleton";

const ReferenceGrantForm = dynamic(() => import("@/components/resources/referencegrant-form").then((mod) => mod.ReferenceGrantForm), {
  loading: () => <PageSkeleton />,
});

export default function CreateReferenceGrantPage() {
  const locale = (useParams() as { locale: string }).locale;
  return <ReferenceGrantForm mode="create" onSuccess={() => { window.location.href = `/${locale}/reference-grants`; }} />;
}
