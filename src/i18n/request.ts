import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";
import { DEFAULT_TIME_ZONE } from "./time-zone";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as "en" | "zh")) {
    locale = routing.defaultLocale;
  }
  return {
    locale,
    timeZone: DEFAULT_TIME_ZONE,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
