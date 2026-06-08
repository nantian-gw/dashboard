import { NextIntlClientProvider } from "next-intl";
import { DEFAULT_TIME_ZONE } from "@/i18n/time-zone";

interface LoginLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LoginLayout({ children, params }: LoginLayoutProps) {
  const { locale } = await params;
  const messages = (await import(`@/messages/${locale}.json`)).default;

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      timeZone={DEFAULT_TIME_ZONE}
    >
      {children}
    </NextIntlClientProvider>
  );
}