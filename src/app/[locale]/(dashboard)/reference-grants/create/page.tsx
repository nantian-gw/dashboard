"use client";

import { useParams } from "next/navigation";
import { ReferenceGrantForm } from "@/components/resources/referencegrant-form";

export default function CreateReferenceGrantPage() {
  const locale = (useParams() as { locale: string }).locale;
  return <ReferenceGrantForm mode="create" onSuccess={() => { window.location.href = `/${locale}/reference-grants`; }} />;
}
