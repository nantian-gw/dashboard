import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { CONTROLPLANE_ADMIN_URL, ADMIN_API_TIMEOUT_MS } from "@/lib/admin-urls";
import {
  buildGlobalSearchItems,
  filterGlobalSearchItems,
} from "@/lib/global-search";

export async function GET(request: NextRequest): Promise<Response> {
  const session = await auth();
  if (!session?.user?.token) {
    return NextResponse.json(
      { error: "unauthorized", message: "Authentication required" },
      { status: 401 }
    );
  }

  const token = session.user.token;
  const query = request.nextUrl.searchParams.get("q") || "";

  if (!query.trim()) {
    return NextResponse.json([]);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ADMIN_API_TIMEOUT_MS);

  try {
    const headers = { Authorization: `Bearer ${token}` };

    const [gatewaysRes, routesRes, referenceGrantsRes, backendTlsRes, nodesRes, diagnosticsRes] =
      await Promise.all([
        fetch(`${CONTROLPLANE_ADMIN_URL}/v1/resources?kind=Gateway`, {
          headers,
          signal: controller.signal,
        }).then((r) => (r.ok ? r.json() : null)),
        fetch(`${CONTROLPLANE_ADMIN_URL}/v1/routes`, {
          headers,
          signal: controller.signal,
        }).then((r) => (r.ok ? r.json() : null)),
        fetch(`${CONTROLPLANE_ADMIN_URL}/v1/resources?kind=ReferenceGrant`, {
          headers,
          signal: controller.signal,
        }).then((r) => (r.ok ? r.json() : null)),
        fetch(`${CONTROLPLANE_ADMIN_URL}/v1/resources?kind=BackendTLSPolicy`, {
          headers,
          signal: controller.signal,
        }).then((r) => (r.ok ? r.json() : null)),
        fetch(`${CONTROLPLANE_ADMIN_URL}/v1/nodes`, {
          headers,
          signal: controller.signal,
        }).then((r) => (r.ok ? r.json() : null)),
        fetch(`${CONTROLPLANE_ADMIN_URL}/v1/summary`, {
          headers,
          signal: controller.signal,
        }).then((r) => (r.ok ? r.json() : null)),
      ]);

    clearTimeout(timeout);

    const items = buildGlobalSearchItems({
      gateways: gatewaysRes,
      routes: routesRes,
      referenceGrants: referenceGrantsRes,
      backendTlsPolicies: backendTlsRes,
      nodes: nodesRes,
      diagnostics: diagnosticsRes,
    });

    const filtered = filterGlobalSearchItems(items, query, 12);

    return NextResponse.json(filtered);
  } catch {
    clearTimeout(timeout);
    return NextResponse.json(
      { error: "search_unavailable", message: "Search service temporarily unavailable" },
      { status: 502 }
    );
  }
}
