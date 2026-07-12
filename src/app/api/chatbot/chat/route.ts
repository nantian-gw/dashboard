import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { CONTROLPLANE_ADMIN_URL } from "@/lib/admin-urls";
import { buildProxyHeaders } from "@/lib/proxy-headers";
import {
  validateCsrfToken,
  getCsrfTokenFromCookies,
  CSRF_HEADER_NAME,
} from "@/lib/csrf";

const DEFAULT_TARGET = CONTROLPLANE_ADMIN_URL;

const STREAM_TIMEOUT_MS = 5 * 60 * 1000;

export async function POST(request: NextRequest): Promise<Response> {
  const session = await auth();
  if (!session?.user?.token) {
    return NextResponse.json(
      { error: "unauthorized", message: "Authentication required" },
      { status: 401 }
    );
  }
  // CSRF validation: this POST triggers backend LLM calls, so it must carry the
  // double-submit token like the other state-changing proxy routes.
  const cookieToken = getCsrfTokenFromCookies(request.headers.get("cookie"));
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  if (!validateCsrfToken(cookieToken, headerToken)) {
    return NextResponse.json(
      { error: "csrf_invalid", message: "Invalid or missing CSRF token" },
      { status: 403 }
    );
  }

  const token = session.user.token;

  const targetUrl = new URL("/v1/chatbot/chat", DEFAULT_TARGET);

  // Force the session token; buildProxyHeaders applies the shared allowlist and
  // makes the injected Authorization win over any client-supplied variant.
  const headers = buildProxyHeaders(request.headers, {
    Authorization: `Bearer ${token}`,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS);

  let body: string | undefined;
  try {
    body = await request.text();
  } catch {
    clearTimeout(timeout);
    return NextResponse.json(
      { error: "invalid_body", message: "Failed to read request body" },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(targetUrl.href, {
      method: "POST",
      headers,
      body,
      redirect: "manual",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      return NextResponse.json(
        {
          error: "chatbot_error",
          message: `Chatbot backend returned ${response.status}`,
          detail: errorBody || undefined,
        },
        { status: 502 }
      );
    }

    if (!response.body) {
      return NextResponse.json(
        { error: "no_stream", message: "Backend returned no stream body" },
        { status: 502 }
      );
    }

    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch {
    clearTimeout(timeout);
    return NextResponse.json(
      {
        error: "chatbot_unavailable",
        message: "Chatbot service unavailable",
      },
      { status: 502 }
    );
  }
}