"use client";

import { useParams } from "next/navigation";
import { WasmPluginForm } from "@/components/resources/wasmplugin-form";

export default function CreateWasmPluginPage() {
  const locale = (useParams() as { locale: string }).locale;
  return (
    <WasmPluginForm
      mode="create"
      onSuccess={() => { window.location.href = `/${locale}/wasm/plugins`; }}
    />
  );
}
