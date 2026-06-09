import { auth } from "@/lib/auth";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { NextRequest, NextResponse } from "next/server";

const intlMiddleware = createIntlMiddleware(routing);

const I18N_EXCLUDED = ["/api", "/healthz", "/_next", "/_vercel"];
const HSTS_HEADER_VALUE = "max-age=31536000; includeSubDomains";

function isI18nExcluded(pathname: string): boolean {
  return I18N_EXCLUDED.some((p) => pathname.startsWith(p)) || /\.[^/]+$/.test(pathname);
}

function withRuntimeSecurityHeaders(response: NextResponse): NextResponse {
  if (process.env.DASHBOARD_ENABLE_HSTS === "true") {
    response.headers.set("Strict-Transport-Security", HSTS_HEADER_VALUE);
  }

  return response;
}

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Passthrough: API routes, static files, health checks
  if (isI18nExcluded(pathname)) {
    return withRuntimeSecurityHeaders(NextResponse.next());
  }

  // Root "/" — redirect to login under default locale
  if (pathname === "/") {
    return withRuntimeSecurityHeaders(
      NextResponse.redirect(new URL(`/${routing.defaultLocale}/login`, request.url))
    );
  }

  // Login page: redirect to overview if already authenticated
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

  // Auth check for protected routes
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
