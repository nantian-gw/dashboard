export const CONTROLPLANE_ADMIN_URL =
  process.env.CONTROLPLANE_ADMIN_URL ||
  "http://localhost:18081";

export const DATAPLANE_ADMIN_URL =
  process.env.DATAPLANE_ADMIN_URL ||
  "http://localhost:19080";

export const ADMIN_API_TIMEOUT_MS = 10000;

/**
 * Optional bearer token used when proxying to the dataplane admin API.
 *
 * The dataplane admin may be secured with a different bearer token than the
 * controlplane admin (which is what the dashboard session authenticates with).
 * When set, this token is sent as the Authorization header on dataplane
 * requests instead of the controlplane session token. When unset, the
 * controlplane session token is reused (legacy behavior).
 */
export const DATAPLANE_BEARER_TOKEN =
  process.env.DATAPLANE_BEARER_TOKEN?.trim() || "";
