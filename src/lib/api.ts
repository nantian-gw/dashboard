const CONTROLPLANE_BASE = "/api/controlplane";
const DATAPLANE_BASE = "/api/dataplane";

const CSRF_COOKIE_NAME = "x-csrf-token";
const CSRF_HEADER_NAME = "x-csrf-token";

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

/**
 * Read the CSRF token from the cookie set by the middleware (proxy.ts).
 * Uses the double-submit cookie pattern: the cookie value is sent as a
 * request header so the server can verify they match.
 */
function readCsrfTokenFromCookies(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${CSRF_COOKIE_NAME}=([^;]*)`)
  );
  return match?.[1];
}

/**
 * Build headers for a state-changing request, including the CSRF token
 * extracted from the cookie.
 */
function writeRequestHeaders(
  baseHeaders: Record<string, string>
): Record<string, string> {
  const csrfToken = readCsrfTokenFromCookies();
  if (csrfToken) {
    return { ...baseHeaders, [CSRF_HEADER_NAME]: csrfToken };
  }
  return baseHeaders;
}

async function request<T>(base: string, path: string, options: RequestOptions = {}): Promise<T> {
  const { params, ...fetchOptions } = options;
  let url = `${base}${path}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const isRead = fetchOptions.method === "GET" || fetchOptions.method === "HEAD";
  const baseHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...((fetchOptions.headers as Record<string, string>) || {}),
  };
  const headers = isRead ? baseHeaders : writeRequestHeaders(baseHeaders);

  const response = await fetch(url, {
    ...fetchOptions,
    credentials: "include",
    headers,
  });
  if (!response.ok) {
    throw new Error(`${base}${path} failed: ${response.status}`);
  }

  const data = await response.json();
  // Defend against null/undefined responses — common when the backend
  // returns an empty 200 or the JSON body is literally `null`.
  return data ?? ([] as T);
}

export const controlplane = {
  get: <T>(path: string, params?: Record<string, string>) =>
    request<T>(CONTROLPLANE_BASE, path, { method: "GET", params }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(CONTROLPLANE_BASE, path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(CONTROLPLANE_BASE, path, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(path: string) =>
    request<T>(CONTROLPLANE_BASE, path, { method: "DELETE" }),
};

export const dataplane = {
  get: <T>(path: string, params?: Record<string, string>) =>
    request<T>(DATAPLANE_BASE, path, { method: "GET", params }),
};

export const applyResource = (yaml: string, path = "/v1/resources") => {
  const csrfToken = readCsrfTokenFromCookies();
  const headers: Record<string, string> = { "Content-Type": "application/yaml" };
  if (csrfToken) {
    headers[CSRF_HEADER_NAME] = csrfToken;
  }
  return fetch(`${CONTROLPLANE_BASE}${path}`, {
    method: path === "/v1/resources" ? "POST" : "PUT",
    credentials: "include",
    headers,
    body: yaml,
  });
};

export const deleteResource = (path: string) => {
  const csrfToken = readCsrfTokenFromCookies();
  const headers: Record<string, string> = {};
  if (csrfToken) {
    headers[CSRF_HEADER_NAME] = csrfToken;
  }
  return fetch(`${CONTROLPLANE_BASE}${path}`, {
    method: "DELETE",
    credentials: "include",
    headers,
  });
};
