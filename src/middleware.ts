import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const handleI18nRouting = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect root directly to the login page to avoid an extra hop through /[locale]
  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(`/${routing.defaultLocale}/login`, request.url),
    );
  }

  return handleI18nRouting(request);
}

export const config = {
  // Match all pathnames except API routes, Next.js internals, and static files
  matcher: "/((?!api|trpc|_next|_vercel|healthz|.*\\..*).*)",
};
