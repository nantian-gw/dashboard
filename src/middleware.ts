import { auth } from "@/lib/auth";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { NextRequest, NextResponse } from "next/server";

const intlMiddleware = createIntlMiddleware(routing);

const I18N_EXCLUDED = ["/api", "/healthz", "/_next", "/_vercel"];

function isI18nExcluded(pathname: string): boolean {
  return I18N_EXCLUDED.some((p) => pathname.startsWith(p)) || /\.[^/]+$/.test(pathname);
}

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Passthrough: API routes, static files, health checks
  if (isI18nExcluded(pathname)) {
    return NextResponse.next();
  }

  // Root "/" — redirect to login under default locale
  if (pathname === "/") {
    return NextResponse.redirect(new URL(`/${routing.defaultLocale}/login`, request.url));
  }

  // Login page: redirect to overview if already authenticated
  const loginMatch = pathname.match(/^\/([a-z]{2})\/login/);
  if (loginMatch) {
    const locale = loginMatch[1];
    const session = await auth();
    if (session) {
      return NextResponse.redirect(new URL(`/${locale}/overview`, request.url));
    }
    return intlMiddleware(request);
  }

  // Auth check for protected routes
  const session = await auth();
  if (!session) {
    const locale = pathname.match(/^\/([a-z]{2})/)?.[1] ?? routing.defaultLocale;
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)"],
};