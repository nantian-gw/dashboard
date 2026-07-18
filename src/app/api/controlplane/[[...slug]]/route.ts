import { NextRequest, NextResponse } from "next/server";
import { trace, Span } from "@opentelemetry/api";
import { auth } from "@/lib/auth";
import {
  asManagedResourceArray,
  mapBackendTlsPolicyResource,
  mapBackendLbPolicyResource,
  mapDiagnostics,
  mapGatewayResource,
  mapRoutesPayload,
  type ManagedResource,
} from "@/lib/admin-models";
import {
  CONTROLPLANE_ADMIN_URL,
  DATAPLANE_ADMIN_URL,
  DATAPLANE_BEARER_TOKEN,
  ADMIN_API_TIMEOUT_MS,
} from "@/lib/admin-urls";
import { buildProxyHeaders, proxyResponseHeaders, withProxyCacheControl, PROXY_CACHE_CONTROL } from "@/lib/proxy-headers";
import {
  validateCsrfToken,
  getCsrfTokenFromCookies,
  CSRF_HEADER_NAME,
} from "@/lib/csrf";
import { getCached, setCache, buildCacheKey } from "@/lib/bff-cache";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const DEFAULT_TARGET = CONTROLPLANE_ADMIN_URL;
const DATAPLANE_TARGET = DATAPLANE_ADMIN_URL;
const TIMEOUT_MS = ADMIN_API_TIMEOUT_MS;

type LegacyPayload =
  | { matched: false }
  | { matched: true; payload: unknown };

function asObject(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function numericField(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

async function fetchAdminJson(
  target: string,
  path: string,
  headers: Record<string, string>,
  signal: AbortSignal
): Promise<unknown> {
  const response = await fetch(new URL(path, target).href, {
    method: "GET",
    headers,
    redirect: "manual",
    signal,
  });
  if (!response.ok) {
    throw new Error(`${path} failed: ${response.status}`);
  }
  return response.json();
}

async function legacyControlplanePayload(
  slug: string,
  headers: Record<string, string>,
  sessionToken: string,
  signal: AbortSignal
): Promise<LegacyPayload> {
  if (slug === "/v1/gateways") {
    const [resources, summary, routesPayload] = await Promise.all([
      fetchAdminJson(DEFAULT_TARGET, "/v1/resources?kind=Gateway", headers, signal),
      fetchAdminJson(DEFAULT_TARGET, "/v1/summary", headers, signal),
      fetchAdminJson(DEFAULT_TARGET, "/v1/routes", headers, signal),
    ]);
    const routes = mapRoutesPayload(routesPayload);
    const summaryObject = asObject(summary);
    return {
      matched: true,
      payload: {
        gateways: asManagedResourceArray(resources).map((resource) =>
          mapGatewayResource(resource, routes)
        ),
        httpRouteCount: numericField(summaryObject.httpRouteCount),
        grpcRouteCount: numericField(summaryObject.grpcRouteCount),
      },
    };
  }

  const gatewayMatch = slug.match(/^\/v1\/gateways\/([^/]+)\/([^/]+)$/);
  if (gatewayMatch) {
    const [, namespace, name] = gatewayMatch;
    const [resource, routesPayload] = await Promise.all([
      fetchAdminJson(
        DEFAULT_TARGET,
        `/v1/resources/gateway/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`,
        headers,
        signal
      ),
      fetchAdminJson(DEFAULT_TARGET, "/v1/routes", headers, signal),
    ]);
    return {
      matched: true,
      payload: mapGatewayResource(resource as ManagedResource, mapRoutesPayload(routesPayload)),
    };
  }

  if (slug === "/v1/backend-tls") {
    const resources = await fetchAdminJson(
      DEFAULT_TARGET,
      "/v1/resources?kind=BackendTLSPolicy",
      headers,
      signal
    );
    return {
      matched: true,
      payload: {
        policies: asManagedResourceArray(resources).map(mapBackendTlsPolicyResource),
      },
    };
  }

  if (slug === "/v1/backend-lb") {
    const resources = await fetchAdminJson(
      DEFAULT_TARGET,
      "/v1/resources?kind=BackendLBPolicy",
      headers,
      signal
    );
    return {
      matched: true,
      payload: {
        policies: asManagedResourceArray(resources).map(mapBackendLbPolicyResource),
      },
    };
  }

  if (slug === "/v1/diagnostics") {
    // The dataplane admin may use a different bearer token than the controlplane.
    // Build a dataplane-specific header set that prefers DATAPLANE_BEARER_TOKEN.
    const dataplaneToken = DATAPLANE_BEARER_TOKEN || sessionToken;
    const dataplaneHeaders = buildProxyHeaders(
      new Headers(headers as Record<string, string>),
      dataplaneToken ? { Authorization: `Bearer ${dataplaneToken}` } : {}
    );
    const [controlplaneSummary, infrastructure, dataplaneSummary] = await Promise.all([
      fetchAdminJson(DEFAULT_TARGET, "/v1/summary", headers, signal),
      fetchAdminJson(DEFAULT_TARGET, "/v1/infrastructure", headers, signal),
      fetchAdminJson(DATAPLANE_TARGET, "/v1/summary", dataplaneHeaders, signal),
    ]);
    return {
      matched: true,
      payload: {
        issues: mapDiagnostics(controlplaneSummary, infrastructure, dataplaneSummary),
      },
    };
  }

  return { matched: false };
}

export async function handler(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.token) {
    return NextResponse.json(
      { error: "unauthorized", message: "Authentication required" },
      { status: 401 }
    );
  }

  // CSRF validation for state-changing methods
  if (!SAFE_METHODS.has(request.method)) {
    const cookieToken = getCsrfTokenFromCookies(request.headers.get("cookie"));
    const headerToken = request.headers.get(CSRF_HEADER_NAME);
    if (!validateCsrfToken(cookieToken, headerToken)) {
      return NextResponse.json(
        { error: "csrf_invalid", message: "Invalid or missing CSRF token" },
        { status: 403 }
      );
    }
  }

  const token = session.user.token;

  const pathname = request.nextUrl.pathname;
  const slug = pathname.replace("/api/controlplane", "") || "/";
  let targetUrl: URL;
  try {
    targetUrl = new URL(slug, DEFAULT_TARGET);
  } catch {
    targetUrl = new URL(DEFAULT_TARGET);
  }
  targetUrl.search = request.nextUrl.search;

  const headers = buildProxyHeaders(request.headers, token ? { Authorization: `Bearer ${token}` } : {});

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let getSpan: Span | undefined;

  try {
    if (request.method === "GET") {
      getSpan = trace.getTracer("nantian-gw-dashboard").startSpan("proxy.controlplane.GET");
      getSpan.setAttribute("http.url", request.nextUrl.pathname);

      const cacheKey = buildCacheKey(request.nextUrl.pathname, request.nextUrl.search);
      const cached = getCached(cacheKey);
      if (cached) {
        clearTimeout(timeout);
        getSpan.setAttribute("http.cache", "hit");
        getSpan.end();
        // Rebuild Cache-Control header from cached data so browsers also benefit.
        const respHeaders = new Headers(cached.headers);
        respHeaders.set("Cache-Control", PROXY_CACHE_CONTROL);
        return new NextResponse(cached.body, {
          status: cached.status,
          headers: respHeaders,
        });
      }

      const legacyPayload = await legacyControlplanePayload(slug, headers, token, controller.signal);
      if (legacyPayload.matched) {
        clearTimeout(timeout);
        const body = JSON.stringify(legacyPayload.payload);
        setCache(cacheKey, {
          body,
          status: 200,
          headers: { "content-type": "application/json" },
        });
        getSpan.setAttribute("http.cache", "miss");
        getSpan.end();
        return new NextResponse(body, {
          headers: { "content-type": "application/json", "Cache-Control": PROXY_CACHE_CONTROL },
        });
      }
    }

    const body =
      request.method === "GET" || request.method === "HEAD"
        ? undefined
        : await request.text();

    const response = await fetch(targetUrl.href, {
      method: request.method,
      headers,
      body,
      redirect: "manual",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (getSpan) {
      getSpan.setAttribute("http.status_code", response.status);
    }

    if (request.method === "GET" && response.ok) {
      // Buffer the upstream body so we can cache it.
      const bodyText = await response.text();
      const cacheKey = buildCacheKey(request.nextUrl.pathname, request.nextUrl.search);
      setCache(cacheKey, {
        body: bodyText,
        status: response.status,
        headers: Object.fromEntries(proxyResponseHeaders(response).entries()),
      });
      getSpan?.end();
      return new NextResponse(bodyText, {
        status: response.status,
        headers: withProxyCacheControl(proxyResponseHeaders(response)),
      });
    }

    getSpan?.end();
    return new NextResponse(response.body, {
      status: response.status,
      headers: withProxyCacheControl(proxyResponseHeaders(response)),
    });
  } catch {
    clearTimeout(timeout);
    getSpan?.end();
    return NextResponse.json(
      {
        error: "admin_proxy_unavailable",
        message: "controlplane admin unavailable",
      },
      { status: 502 }
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
export const HEAD = handler;
