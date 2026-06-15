import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  mapNodePayload,
} from "@/lib/admin-models";
import {
  CONTROLPLANE_ADMIN_URL,
  DATAPLANE_ADMIN_URL,
  ADMIN_API_TIMEOUT_MS,
} from "@/lib/admin-urls";
import { buildProxyHeaders, proxyResponseHeaders } from "@/lib/proxy-headers";
import {
  validateCsrfToken,
  getCsrfTokenFromCookies,
  CSRF_HEADER_NAME,
} from "@/lib/csrf";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const DEFAULT_TARGET = DATAPLANE_ADMIN_URL;
const CONTROLPLANE_TARGET = CONTROLPLANE_ADMIN_URL;
const TIMEOUT_MS = ADMIN_API_TIMEOUT_MS;

type LegacyTarget = {
  target: string;
  path: string;
};

function legacyDataplaneTarget(slug: string): LegacyTarget | null {
  if (slug === "/v1/nodes") {
    return { target: CONTROLPLANE_TARGET, path: "/v1/nodes" };
  }
  return null;
}

function legacyDataplanePayload(slug: string, data: unknown): unknown {
  if (slug === "/v1/nodes") return mapNodePayload(data);
  return data;
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
  const slug = pathname.replace("/api/dataplane", "") || "/";
  const legacyTarget = request.method === "GET" ? legacyDataplaneTarget(slug) : null;
  let targetUrl: URL;
  try {
    targetUrl = legacyTarget
      ? new URL(legacyTarget.path, legacyTarget.target)
      : new URL(slug, DEFAULT_TARGET);
  } catch {
    targetUrl = new URL(DEFAULT_TARGET);
  }
  targetUrl.search = request.nextUrl.search;

  const headers = buildProxyHeaders(request.headers, token ? { Authorization: `Bearer ${token}` } : {});

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
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

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await response.json();
      const payload = legacyTarget ? legacyDataplanePayload(slug, data) : data;
      return new NextResponse(JSON.stringify(payload), {
        status: response.status,
        headers: proxyResponseHeaders(response),
      });
    } else {
      const data = await response.text();
      return new NextResponse(data, {
        status: response.status,
        headers: proxyResponseHeaders(response),
      });
    }
  } catch {
    clearTimeout(timeout);
    return NextResponse.json(
      {
        error: "admin_proxy_unavailable",
        message: "dataplane admin unavailable",
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
