"use client";

import { useParams } from "next/navigation";
import { GatewayForm } from "@/components/resources/gateway-form";

export default function CreateGatewayPage() {
  const locale = (useParams() as { locale: string }).locale;
  return <GatewayForm mode="create" onSuccess={() => { window.location.href = `/${locale}/gateways`; }} />;
}
