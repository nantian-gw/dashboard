/**
 * Whitelist of request headers that are safe to forward from the client
 * to the backend admin APIs through the BFF proxy.
 *
 * Only headers explicitly listed here will be forwarded.
 * All other headers are stripped to prevent header injection.
 */
export const PROXY_FORWARD_HEADERS = [
  "accept",
  "accept-encoding",
  "accept-language",
  "authorization",
  "cache-control",
  "content-type",
  "dnt",
  "if-match",
  "if-modified-since",
  "if-none-match",
  "if-unmodified-since",
  "pragma",
  "user-agent",
  "x-request-id",
  "x-correlation-id",
] as const;

export const PROXY_STRIP_HEADERS = [
  "connection",
  "content-encoding",
  "content-length",
  "host",
  "transfer-encoding",
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-real-ip",
  "cf-connecting-ip",
] as const;

/**
 * Build a headers object for proxying, forwarding only whitelisted headers
 * and stripping hop-by-hop / infrastructure headers.
 */
export function buildProxyHeaders(
  requestHeaders: Headers,
  extraHeaders?: Record<string, string>
): Record<string, string> {
  const headers: Record<string, string> = {};

  requestHeaders.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (
      PROXY_FORWARD_HEADERS.includes(lower as (typeof PROXY_FORWARD_HEADERS)[number]) &&
      !PROXY_STRIP_HEADERS.includes(lower as (typeof PROXY_STRIP_HEADERS)[number])
    ) {
      headers[key] = value;
    }
  });

  if (extraHeaders) {
    for (const [key, value] of Object.entries(extraHeaders)) {
      // Injected headers (e.g. Authorization) must win over any client-supplied
      // variant regardless of header-name casing, so a client cannot override
      // the session token by forwarding its own Authorization header.
      for (const existing of Object.keys(headers)) {
        if (existing.toLowerCase() === key.toLowerCase()) {
          delete headers[existing];
        }
      }
      headers[key] = value;
    }
  }

  return headers;
}

/**
 * Strip hop-by-hop headers from upstream response before returning to client.
 */
export function proxyResponseHeaders(response: Response): Headers {
  const headers = new Headers(response.headers);
  for (const key of PROXY_STRIP_HEADERS) {
    headers.delete(key);
  }
  return headers;
}
