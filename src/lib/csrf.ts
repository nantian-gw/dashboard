import { randomBytes } from "node:crypto";

/**
 * CSRF token protection for state-changing API requests.
 *
 * Uses a double-submit cookie pattern:
 * 1. A random token is set as a cookie on every page response
 * 2. The client reads the cookie and sends it as a header on POST/PUT/DELETE
 * 3. The server compares the header value against the cookie value
 */

const CSRF_COOKIE_NAME = "x-csrf-token";
const CSRF_HEADER_NAME = "x-csrf-token";
const CSRF_COOKIE_OPTIONS = "Path=/; SameSite=Strict; HttpOnly; Secure";

export function generateCsrfToken(): string {
  return randomBytes(32).toString("base64url");
}

export function getCsrfCookieHeader(token: string): string {
  return `${CSRF_COOKIE_NAME}=${token}; ${CSRF_COOKIE_OPTIONS}`;
}

/**
 * Validate a CSRF token by comparing the cookie value against the header value.
 * Returns true if the token is valid, false otherwise.
 */
export function validateCsrfToken(
  cookieToken: string | undefined,
  headerToken: string | null
): boolean {
  if (!cookieToken || !headerToken) return false;
  // Constant-time comparison to prevent timing attacks
  return timingSafeEqual(cookieToken, headerToken);
}

/**
 * Constant-time string comparison.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Extract CSRF token from request cookies.
 */
export function getCsrfTokenFromCookies(cookieHeader: string | null): string | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${CSRF_COOKIE_NAME}=([^;]*)`)
  );
  return match?.[1];
}

export { CSRF_COOKIE_NAME, CSRF_HEADER_NAME };
