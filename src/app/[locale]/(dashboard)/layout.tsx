import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { routing } from "@/i18n/routing";
import { LocaleLayoutClient } from "./locale-layout-client";
import { DashboardCapabilitiesProvider } from "@/components/dashboard/dashboard-capabilities-provider";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { TopBar } from "@/components/dashboard/top-bar";
import PageSkeleton from "@/components/dashboard/page-skeleton";

interface DashboardLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function DashboardLayout({
  children,
  params,
}: DashboardLayoutProps) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as "en" | "zh")) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <LocaleLayoutClient locale={locale} messages={messages}>
      <DashboardCapabilitiesProvider>
        <link rel="preconnect" href="/api/controlplane" />
        <link rel="preconnect" href="/api/dataplane" />
        <div className="flex h-full">
          <SidebarNav />
          <div className="flex flex-1 flex-col overflow-hidden">
            <TopBar />
            <main className="flex-1 overflow-auto p-6 min-h-0">
              <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
            </main>
          </div>
        </div>
      </DashboardCapabilitiesProvider>
    </LocaleLayoutClient>
  );
}
