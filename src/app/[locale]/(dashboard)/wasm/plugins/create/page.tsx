"use client";

import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import PageSkeleton from "@/components/dashboard/page-skeleton";

const WasmPluginForm = dynamic(() => import("@/components/resources/wasmplugin-form").then((mod) => mod.WasmPluginForm), {
  loading: () => <PageSkeleton />,
});

export default function CreateWasmPluginPage() {
  const locale = (useParams() as { locale: string }).locale;
  return (
    <WasmPluginForm
      mode="create"
      onSuccess={() => { window.location.href = `/${locale}/wasm/plugins`; }}
    />
  );
}
