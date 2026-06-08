export const CONTROLPLANE_ADMIN_URL =
  process.env.CONTROLPLANE_ADMIN_URL ||
  "http://localhost:18081";

export const DATAPLANE_ADMIN_URL =
  process.env.DATAPLANE_ADMIN_URL ||
  "http://localhost:19080";

export const ADMIN_API_TIMEOUT_MS = 10000;
