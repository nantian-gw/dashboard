const CONTROLPLANE_BASE = "/api/controlplane";
const DATAPLANE_BASE = "/api/dataplane";

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

async function request<T>(base: string, path: string, options: RequestOptions = {}): Promise<T> {
  const { params, ...fetchOptions } = options;
  let url = `${base}${path}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }
  const response = await fetch(url, {
    ...fetchOptions,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...fetchOptions.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`${base}${path} failed: ${response.status}`);
  }
  return response.json();
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

export const applyResource = (yaml: string, path = "/v1/resources") =>
  fetch(`${CONTROLPLANE_BASE}${path}`, {
    method: path === "/v1/resources" ? "POST" : "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/yaml" },
    body: yaml,
  });

export const deleteResource = (path: string) =>
  fetch(`${CONTROLPLANE_BASE}${path}`, { method: "DELETE", credentials: "include" });