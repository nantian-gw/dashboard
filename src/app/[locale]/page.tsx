import { redirect } from "next/navigation";
import { routing } from "@/i18n/routing";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function LocalePage({ params }: Props) {
  const { locale } = await params;

  // Validate locale - redirect to default if invalid
  if (!routing.locales.includes(locale as "en" | "zh")) {
    redirect(`/${routing.defaultLocale}/login`);
  }

  redirect(`/${locale}/login`);
}
