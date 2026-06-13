import { auth } from "@/lib/auth";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { NextRequest, NextResponse } from "next/server";

const intlMiddleware = createIntlMiddleware(routing);

const I18N_EXCLUDED = ["/api", "/healthz", "/_next", "/_vercel"];
const HSTS_HEADER_VALUE = "max-age=31536000; includeSubDomains";

function isI18nExcluded(pathname: string): boolean {
  return I18N_EXCLUDED.some((path) => pathname.startsWith(path)) || /\.[^/]+$/.test(pathname);
}

function withRuntimeSecurityHeaders(response: NextResponse): NextResponse {
  if (process.env.DASHBOARD_ENABLE_HSTS === "true") {
    response.headers.set("Strict-Transport-Security", HSTS_HEADER_VALUE);
  }

  return response;
}

export default async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (isI18nExcluded(pathname)) {
    return withRuntimeSecurityHeaders(NextResponse.next());
  }

  if (pathname === "/") {
    return withRuntimeSecurityHeaders(
      NextResponse.redirect(new URL(`/${routing.defaultLocale}/login`, request.url))
    );
  }

  const loginMatch = pathname.match(/^\/([a-z]{2})\/login/);
  if (loginMatch) {
    const locale = loginMatch[1];
    const session = await auth();
    if (session) {
      return withRuntimeSecurityHeaders(
        NextResponse.redirect(new URL(`/${locale}/overview`, request.url))
      );
    }
    return withRuntimeSecurityHeaders(intlMiddleware(request));
  }

  const session = await auth();
  if (!session) {
    const locale = pathname.match(/^\/([a-z]{2})/)?.[1] ?? routing.defaultLocale;
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return withRuntimeSecurityHeaders(NextResponse.redirect(loginUrl));
  }

  return withRuntimeSecurityHeaders(intlMiddleware(request));
}

export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)"],
};
