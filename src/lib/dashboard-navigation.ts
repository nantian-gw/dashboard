import { routing } from "@/i18n/routing";

const localeSet = new Set(routing.locales);

export function isDashboardLocale(value: string): value is (typeof routing.locales)[number] {
  return localeSet.has(value as (typeof routing.locales)[number]);
}

export function normalizeDashboardLocale(locale: string): (typeof routing.locales)[number] {
  return isDashboardLocale(locale) ? locale : routing.defaultLocale;
}

export function localizeDashboardPath(locale: string, href: string): string {
  if (!href.startsWith("/")) {
    throw new Error(`dashboard navigation href must start with /: ${href}`);
  }

  const normalizedLocale = normalizeDashboardLocale(locale);
  for (const dashboardLocale of routing.locales) {
    if (href === `/${dashboardLocale}` || href.startsWith(`/${dashboardLocale}/`)) {
      return href;
    }
  }

  return `/${normalizedLocale}${href}`;
}
