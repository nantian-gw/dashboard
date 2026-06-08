"use client";

import { NextIntlClientProvider } from "next-intl";
import { SessionProvider } from "next-auth/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Provider as JotaiProvider } from "jotai";
import { makeQueryClient } from "@/lib/query-client";
import { DEFAULT_TIME_ZONE } from "@/i18n/time-zone";

let browserQueryClient: ReturnType<typeof makeQueryClient> | undefined = undefined;

function getQueryClient() {
  if (typeof window === "undefined") {
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

interface LocaleLayoutClientProps {
  children: React.ReactNode;
  locale: string;
  messages: Record<string, unknown>;
}

export function LocaleLayoutClient({ children, locale, messages }: LocaleLayoutClientProps) {
  const queryClient = getQueryClient();

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <JotaiProvider>
          <NextIntlClientProvider
            locale={locale}
            messages={messages}
            timeZone={DEFAULT_TIME_ZONE}
          >
            {children}
          </NextIntlClientProvider>
        </JotaiProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
