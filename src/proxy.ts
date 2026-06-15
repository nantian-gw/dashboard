import { auth } from "@/lib/auth";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { generateCsrfToken, getCsrfCookieHeader } from "@/lib/csrf";

const intlMiddleware = createIntlMiddleware(routing);

const I18N_EXCLUDED = ["/api", "/healthz", "/_next", "/_vercel"];
const HSTS_HEADER_VALUE = "max-age=31536000; includeSubDomains";

function generateNonce(): string {
  return randomBytes(16).toString("base64url");
}

function isI18nExcluded(pathname: string): boolean {
  return I18N_EXCLUDED.some((path) => pathname.startsWith(path)) || /\.[^/]+$/.test(pathname);
}

function cspWithNonce(nonce: string): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "worker-src 'self' blob:",
    "connect-src 'self'",
  ].join("; ");
}

function withRuntimeSecurityHeaders(response: NextResponse, nonce?: string): NextResponse {
  if (nonce) {
    response.headers.set("Content-Security-Policy", cspWithNonce(nonce));
  }

  // Set CSRF token cookie on page responses (not API routes)
  const csrfToken = generateCsrfToken();
  response.headers.set("Set-Cookie", getCsrfCookieHeader(csrfToken));

  if (process.env.DASHBOARD_ENABLE_HSTS === "true") {
    response.headers.set("Strict-Transport-Security", HSTS_HEADER_VALUE);
  }

  return response;
}

export default async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const nonce = generateNonce();

  if (isI18nExcluded(pathname)) {
    return withRuntimeSecurityHeaders(NextResponse.next(), nonce);
  }

  if (pathname === "/") {
    return withRuntimeSecurityHeaders(
      NextResponse.redirect(new URL(`/${routing.defaultLocale}/login`, request.url)),
      nonce
    );
  }

  const loginMatch = pathname.match(/^\/([a-z]{2})\/login/);
  if (loginMatch) {
    const locale = loginMatch[1];
    const session = await auth();
    if (session) {
      return withRuntimeSecurityHeaders(
        NextResponse.redirect(new URL(`/${locale}/overview`, request.url)),
        nonce
      );
    }
    return withRuntimeSecurityHeaders(intlMiddleware(request), nonce);
  }

  const session = await auth();
  if (!session) {
    const locale = pathname.match(/^\/([a-z]{2})/)?.[1] ?? routing.defaultLocale;
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return withRuntimeSecurityHeaders(NextResponse.redirect(loginUrl), nonce);
  }

  return withRuntimeSecurityHeaders(intlMiddleware(request), nonce);
}

export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)"],
};
