# Dashboard Navigation Runtime Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce dashboard page-transition latency by prewarming approved hotspot routes and isolating pathname-sensitive shell rendering without changing backend or API behavior.

**Architecture:** Add one pure hotspot matcher plus one thin query-prewarm layer that reuse the existing React Query hooks' cache keys and fetch logic. Integrate that layer into shared dashboard navigation seams (`LocalizedLink`, `useLocalizedDashboardRouter`, and `GlobalSearch`), then split `TopBar` so pathname changes only rerender the title and locale switcher instead of the entire shell control cluster.

**Tech Stack:** Next.js 16 App Router, `next-intl`, TanStack React Query, Jotai, `next-themes`, Node.js native test runner, TypeScript

---

## File Structure

- Create: `src/lib/dashboard-prewarm-targets.ts`
  Pure route matcher for approved hotspot hrefs. Converts localized dashboard
  paths into explicit query-prewarm targets.
- Create: `src/lib/dashboard-query-prewarm.ts`
  Best-effort React Query prewarm helper that maps approved targets to existing
  query option factories and runs `queryClient.prefetchQuery`.
- Create: `src/lib/dashboard-page-title.ts`
  Pure pathname-to-title helper so pathname logic can be tested without
  rendering React components.
- Create: `src/components/dashboard/top-bar-page-title.tsx`
  Small pathname-aware title component.
- Create: `src/components/dashboard/top-bar-actions.tsx`
  Search, refresh toggle, and theme toggle cluster with no pathname dependency.
- Create: `src/components/dashboard/top-bar-locale-switcher.tsx`
  Locale switcher isolated from the rest of the shell controls.
- Create: `test/dashboard-prewarm-targets.test.mjs`
  Pure unit coverage for hotspot route matching.
- Create: `test/dashboard-page-title.test.mjs`
  Pure unit coverage for top-bar title derivation.
- Modify: `src/hooks/use-api/use-gateways.ts`
  Export reusable query option factories for gateway, route, backend TLS, and
  token policy data.
- Modify: `src/hooks/use-api/use-resources.ts`
  Export reusable query option factories for reference grant list/detail data.
- Modify: `src/hooks/use-api/use-ai.ts`
  Export reusable query option factory for AI services data.
- Modify: `src/components/dashboard/localized-link.tsx`
  Trigger best-effort route and query prewarm on early-intent events while
  preserving existing localized navigation behavior.
- Modify: `src/lib/use-localized-dashboard-router.ts`
  Reuse the shared prewarm layer for imperative navigation and preserve
  `router.prefetch(..., options)` support.
- Modify: `src/components/dashboard/global-search.tsx`
  Use deferred search input, trigger explicit result prewarm, and wrap result
  navigation in `startTransition`.
- Modify: `src/components/dashboard/top-bar.tsx`
  Reduce it to a structural shell that composes isolated child components.
- Modify: `test/dashboard-contract.test.mjs`
  Source-level regression checks for shared prewarm wiring and TopBar boundary
  isolation.

---

### Task 1: Add Pure Hotspot Matching And Reusable Query Option Factories

**Files:**
- Create: `test/dashboard-prewarm-targets.test.mjs`
- Create: `src/lib/dashboard-prewarm-targets.ts`
- Modify: `src/hooks/use-api/use-gateways.ts`
- Modify: `src/hooks/use-api/use-resources.ts`
- Modify: `src/hooks/use-api/use-ai.ts`

- [ ] **Step 1: Write the failing hotspot matcher test**

Create `test/dashboard-prewarm-targets.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const ts = require("typescript");

function loadDashboardPrewarmTargets() {
  const source = readFileSync(resolve(root, "src/lib/dashboard-prewarm-targets.ts"), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      paths: {
        "@/*": ["./src/*"],
      },
    },
  });

  const cjsModule = { exports: {} };
  vm.runInNewContext(outputText, {
    exports: cjsModule.exports,
    module: cjsModule,
    require: (specifier) => {
      if (specifier === "@/i18n/routing") {
        return {
          routing: {
            locales: ["en", "zh"],
            defaultLocale: "en",
          },
        };
      }
      return require(specifier);
    },
  });

  return cjsModule.exports;
}

test("approved gateway and route pages resolve to explicit prewarm targets", () => {
  const { getDashboardQueryPrewarmTargets } = loadDashboardPrewarmTargets();

  assert.equal(
    JSON.stringify(getDashboardQueryPrewarmTargets("/en/gateways")),
    JSON.stringify([{ kind: "gateways-list" }])
  );
  assert.equal(
    JSON.stringify(getDashboardQueryPrewarmTargets("/zh/gateways/platform/edge")),
    JSON.stringify([{ kind: "gateway-detail", namespace: "platform", name: "edge" }])
  );
  assert.equal(
    JSON.stringify(getDashboardQueryPrewarmTargets("/en/routes")),
    JSON.stringify([{ kind: "routes-list" }])
  );
  assert.equal(
    JSON.stringify(getDashboardQueryPrewarmTargets("/zh/routes/HTTPRoute/shop/checkout")),
    JSON.stringify([
      {
        kind: "route-detail",
        routeKind: "HTTPRoute",
        namespace: "shop",
        name: "checkout",
      },
    ])
  );
});

test("approved backend TLS and reference grant pages resolve to explicit prewarm targets", () => {
  const { getDashboardQueryPrewarmTargets } = loadDashboardPrewarmTargets();

  assert.equal(
    JSON.stringify(getDashboardQueryPrewarmTargets("/en/backend-tls")),
    JSON.stringify([{ kind: "backend-tls-list" }])
  );
  assert.equal(
    JSON.stringify(getDashboardQueryPrewarmTargets("/zh/backend-tls/default/mtls")),
    JSON.stringify([{ kind: "backend-tls-list" }])
  );
  assert.equal(
    JSON.stringify(getDashboardQueryPrewarmTargets("/en/reference-grants")),
    JSON.stringify([{ kind: "reference-grants-list" }])
  );
  assert.equal(
    JSON.stringify(
      getDashboardQueryPrewarmTargets("/zh/reference-grants/shared/allow-shop?tab=manifest")
    ),
    JSON.stringify([
      { kind: "reference-grant-detail", namespace: "shared", name: "allow-shop" },
    ])
  );
});

test("approved AI pages resolve to list-backed prewarm targets", () => {
  const { getDashboardQueryPrewarmTargets } = loadDashboardPrewarmTargets();

  assert.equal(
    JSON.stringify(getDashboardQueryPrewarmTargets("/en/ai/services")),
    JSON.stringify([{ kind: "ai-services-list" }])
  );
  assert.equal(
    JSON.stringify(getDashboardQueryPrewarmTargets("/zh/ai/services/openai-gpt4")),
    JSON.stringify([{ kind: "ai-services-list" }])
  );
  assert.equal(
    JSON.stringify(getDashboardQueryPrewarmTargets("/en/ai/token-policies")),
    JSON.stringify([{ kind: "token-policies-list" }])
  );
  assert.equal(
    JSON.stringify(getDashboardQueryPrewarmTargets("/zh/ai/token-policies/default-limit")),
    JSON.stringify([{ kind: "token-policies-list" }])
  );
});

test("unsupported and create routes do not trigger query prewarm", () => {
  const { getDashboardQueryPrewarmTargets } = loadDashboardPrewarmTargets();

  assert.equal(
    JSON.stringify(getDashboardQueryPrewarmTargets("/en/overview")),
    JSON.stringify([])
  );
  assert.equal(
    JSON.stringify(getDashboardQueryPrewarmTargets("/zh/routes/create/grpcroute")),
    JSON.stringify([])
  );
  assert.equal(
    JSON.stringify(getDashboardQueryPrewarmTargets("/en/ai/token-policies/create")),
    JSON.stringify([])
  );
  assert.equal(
    JSON.stringify(getDashboardQueryPrewarmTargets("/zh/settings#metrics")),
    JSON.stringify([])
  );
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```bash
node --test test/dashboard-prewarm-targets.test.mjs
```

Expected: FAIL with `ENOENT` for `src/lib/dashboard-prewarm-targets.ts`.

- [ ] **Step 3: Implement the pure matcher and extract reusable query option factories**

Create `src/lib/dashboard-prewarm-targets.ts`:

```ts
import { routing } from "@/i18n/routing";

export type DashboardQueryPrewarmTarget =
  | { kind: "gateways-list" }
  | { kind: "gateway-detail"; namespace: string; name: string }
  | { kind: "routes-list" }
  | { kind: "route-detail"; routeKind: string; namespace: string; name: string }
  | { kind: "backend-tls-list" }
  | { kind: "reference-grants-list" }
  | { kind: "reference-grant-detail"; namespace: string; name: string }
  | { kind: "ai-services-list" }
  | { kind: "token-policies-list" };

const localeSet = new Set(routing.locales);

function stripSearchAndHash(href: string): string {
  return href.split(/[?#]/, 1)[0] || href;
}

function stripLocalePrefix(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return "/";

  const [first, ...rest] = segments;
  if (localeSet.has(first as (typeof routing.locales)[number])) {
    return `/${rest.join("/")}`;
  }

  return pathname;
}

export function getDashboardQueryPrewarmTargets(href: string): DashboardQueryPrewarmTarget[] {
  const dashboardPath = stripLocalePrefix(stripSearchAndHash(href));
  const segments = dashboardPath.split("/").filter(Boolean);

  if (segments[0] === "gateways") {
    if (segments.length === 1) return [{ kind: "gateways-list" }];
    if (segments.length >= 3 && segments[1] !== "create") {
      return [{ kind: "gateway-detail", namespace: segments[1], name: segments[2] }];
    }
    return [];
  }

  if (segments[0] === "routes") {
    if (segments.length === 1) return [{ kind: "routes-list" }];
    if (segments[1] === "create") return [];
    if (segments.length >= 4) {
      return [
        {
          kind: "route-detail",
          routeKind: segments[1],
          namespace: segments[2],
          name: segments[3],
        },
      ];
    }
    return [];
  }

  if (segments[0] === "backend-tls") {
    if (segments.length === 1) return [{ kind: "backend-tls-list" }];
    if (segments[1] === "create") return [];
    if (segments.length >= 3) return [{ kind: "backend-tls-list" }];
    return [];
  }

  if (segments[0] === "reference-grants") {
    if (segments.length === 1) return [{ kind: "reference-grants-list" }];
    if (segments[1] === "create") return [];
    if (segments.length >= 3) {
      return [{ kind: "reference-grant-detail", namespace: segments[1], name: segments[2] }];
    }
    return [];
  }

  if (segments[0] === "ai" && segments[1] === "services") {
    if (segments.length === 2) return [{ kind: "ai-services-list" }];
    if (segments[2] === "create") return [];
    return [{ kind: "ai-services-list" }];
  }

  if (segments[0] === "ai" && segments[1] === "token-policies") {
    if (segments.length === 2) return [{ kind: "token-policies-list" }];
    if (segments[2] === "create") return [];
    return [{ kind: "token-policies-list" }];
  }

  return [];
}
```

Update `src/hooks/use-api/use-gateways.ts` so the query logic is reusable outside
React components:

```ts
export function gatewaysQueryOptions() {
  return {
    queryKey: ["gateways"] as const,
    queryFn: async () => {
      const [resources, summary, routesPayload] = await Promise.all([
        controlplane.get<ManagedResource[]>("/v1/resources", { kind: "Gateway" }),
        controlplane.get<Record<string, unknown>>("/v1/summary"),
        controlplane.get("/v1/routes"),
      ]);
      const routes = mapRoutesPayload(routesPayload);
      return {
        gateways: resources.map((resource) => mapGatewayResource(resource, routes)),
        httpRouteCount: (summary.httpRouteCount as number) ?? 0,
        grpcRouteCount: (summary.grpcRouteCount as number) ?? 0,
      };
    },
    refetchInterval: REFETCH_INTERVAL,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  };
}

export function gatewayQueryOptions(namespace: string, name: string) {
  return {
    queryKey: ["gateway", namespace, name] as const,
    queryFn: async () => {
      const [resource, routesPayload] = await Promise.all([
        controlplane.get<ManagedResource>(`/v1/resources/gateway/${namespace}/${name}`),
        controlplane.get("/v1/routes"),
      ]);
      return mapGatewayResource(resource, mapRoutesPayload(routesPayload));
    },
    refetchInterval: REFETCH_INTERVAL,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  };
}

export function routeQueryOptions(namespace: string, name: string, kind: string) {
  return {
    queryKey: ["route", namespace, name, kind] as const,
    queryFn: async () => {
      const r = await controlplane.get<ManagedResource>(
        `/v1/resources/${kind.toLowerCase()}/${namespace}/${name}`
      );
      const rawSpec = (r.resource?.spec || {}) as Record<string, unknown>;
      const rules = (rawSpec.rules as unknown[]) || [];
      const backends: unknown[] = [];
      const pathMatches: string[] = [];

      rules.forEach((rule: any) => {
        if (rule.matches) {
          rule.matches.forEach((m: any) => {
            if (m.path) pathMatches.push(`${m.path.type || "PathPrefix"}: ${m.path.value || "/"}`);
            if (m.headers) pathMatches.push(`Headers: ${m.headers.length}`);
            if (m.method) pathMatches.push(`Method: ${m.method}`);
          });
        }
        if (rule.backendRefs) {
          rule.backendRefs.forEach((br: any) => {
            backends.push({
              name: br.name,
              namespace: br.namespace || namespace,
              port: br.port,
              weight: br.weight || 0,
            });
          });
        }
      });

      return {
        route: {
          kind,
          name: r.name || name,
          namespace: r.namespace || namespace,
          status: "Accepted",
          hostnames: rawSpec.hostnames || [],
          parentRefs: rawSpec.parentRefs || [],
          rules,
          pathMatches,
          backends,
          filters: rules.flatMap((rule: any) => rule.filters || []),
          timeouts: (rules[0] as Record<string, unknown> | undefined)?.timeouts,
          manifest: toYaml(r.resource || r),
        },
      };
    },
    refetchInterval: REFETCH_INTERVAL,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  };
}

export function routesQueryOptions() {
  return {
    queryKey: ["routes"] as const,
    queryFn: async () => {
      const payload = await controlplane.get("/v1/routes");
      return { routes: mapRoutesPayload(payload) };
    },
    refetchInterval: REFETCH_INTERVAL,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  };
}

export function tokenPoliciesQueryOptions() {
  return {
    queryKey: ["token-policies"] as const,
    queryFn: async () => {
      const resources = await controlplane.get<ManagedResource[]>("/v1/resources", {
        kind: "TokenPolicy",
      });
      return { policies: resources.map(mapTokenPolicyResource) };
    },
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  };
}

export function backendTlsQueryOptions() {
  return {
    queryKey: ["backend-tls"] as const,
    queryFn: async () => {
      const resources = await controlplane.get<ManagedResource[]>("/v1/resources", {
        kind: "BackendTLSPolicy",
      });
      return { policies: resources.map(mapBackendTlsPolicyResource) };
    },
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  };
}

export function useGateways(enabled = true) {
  return useQuery({
    ...gatewaysQueryOptions(),
    enabled,
  }) as UseQueryResult<{
    gateways: ReturnType<typeof mapGatewayResource>[];
    httpRouteCount: number;
    grpcRouteCount: number;
  }>;
}

export function useGateway(namespace: string, name: string) {
  return useQuery({
    ...gatewayQueryOptions(namespace, name),
    enabled: !!namespace && !!name,
  }) as UseQueryResult<ReturnType<typeof mapGatewayResource>>;
}

export function useRoute(namespace: string, name: string, kind: string) {
  return useQuery({
    ...routeQueryOptions(namespace, name, kind),
    enabled: !!namespace && !!name && !!kind,
  }) as UseQueryResult<{ route: Record<string, unknown> }>;
}

export function useRoutes(enabled = true) {
  return useQuery({
    ...routesQueryOptions(),
    enabled,
  }) as UseQueryResult<{ routes: ReturnType<typeof mapRoutesPayload> }>;
}

export function useTokenPolicies(enabled = true) {
  return useQuery({
    ...tokenPoliciesQueryOptions(),
    enabled,
  }) as UseQueryResult<{ policies: ReturnType<typeof mapTokenPolicyResource>[] }>;
}

export function useBackendTls(enabled = true) {
  return useQuery({
    ...backendTlsQueryOptions(),
    enabled,
  }) as UseQueryResult<{ policies: ReturnType<typeof mapBackendTlsPolicyResource>[] }>;
}
```

Update `src/hooks/use-api/use-resources.ts` with reusable reference grant
options:

```ts
export function referenceGrantsQueryOptions() {
  return {
    queryKey: ["referencegrants"] as const,
    queryFn: async () => {
      const resources = await controlplane.get<ManagedResource[]>("/v1/resources", {
        kind: "ReferenceGrant",
      });
      return { grants: resources };
    },
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  };
}

export function referenceGrantQueryOptions(namespace: string, name: string) {
  return {
    queryKey: ["referencegrant", namespace, name] as const,
    queryFn: () =>
      controlplane.get<ManagedResource>(`/v1/resources/referencegrant/${namespace}/${name}`),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  };
}

export function useReferenceGrants(enabled = true) {
  return useQuery({
    ...referenceGrantsQueryOptions(),
    enabled,
  }) as UseQueryResult<{ grants: ManagedResource[] }>;
}

export function useReferenceGrant(namespace: string, name: string) {
  return useQuery({
    ...referenceGrantQueryOptions(namespace, name),
    enabled: !!namespace && !!name,
  }) as UseQueryResult<ManagedResource>;
}
```

Update `src/hooks/use-api/use-ai.ts` with reusable AI services options:

```ts
export function aiServicesQueryOptions() {
  return {
    queryKey: ["ai", "services"] as const,
    queryFn: () => controlplane.get<AIServiceSummary[]>("/v1/ai/services"),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  };
}

export function useAIServices() {
  return useQuery(aiServicesQueryOptions()) as UseQueryResult<AIServiceSummary[]>;
}
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run:

```bash
node --test test/dashboard-prewarm-targets.test.mjs
```

Expected: PASS with `4` passing tests and `0` failures.

- [ ] **Step 5: Commit**

```bash
git add \
  test/dashboard-prewarm-targets.test.mjs \
  src/lib/dashboard-prewarm-targets.ts \
  src/hooks/use-api/use-gateways.ts \
  src/hooks/use-api/use-resources.ts \
  src/hooks/use-api/use-ai.ts
git commit -m "test(dashboard): add navigation hotspot matcher coverage"
```

---

### Task 2: Wire Shared Navigation Prewarm Into Links, Router, And Global Search

**Files:**
- Create: `src/lib/dashboard-query-prewarm.ts`
- Modify: `src/components/dashboard/localized-link.tsx`
- Modify: `src/lib/use-localized-dashboard-router.ts`
- Modify: `src/components/dashboard/global-search.tsx`
- Modify: `test/dashboard-contract.test.mjs`

- [ ] **Step 1: Write the failing source-level contract checks for shared prewarm wiring**

Append this block to `test/dashboard-contract.test.mjs`:

```js
test("shared dashboard navigation surfaces prewarm approved hotspots without changing navigation contracts", () => {
  const prewarmSource = readSource("src/lib/dashboard-query-prewarm.ts");
  const linkSource = readSource("src/components/dashboard/localized-link.tsx");
  const routerSource = readSource("src/lib/use-localized-dashboard-router.ts");
  const searchSource = readSource("src/components/dashboard/global-search.tsx");

  assert.match(
    prewarmSource,
    /getDashboardQueryPrewarmTargets/,
    "dashboard query prewarm helper must consume the explicit hotspot matcher"
  );
  assert.match(
    prewarmSource,
    /queryClient\.prefetchQuery/,
    "dashboard query prewarm helper must warm the existing React Query cache"
  );

  assert.match(
    linkSource,
    /useQueryClient/,
    "LocalizedLink must have access to the shared query client for prewarm"
  );
  assert.match(
    linkSource,
    /prewarmDashboardQueries/,
    "LocalizedLink must trigger best-effort query prewarm on early-intent events"
  );
  assert.match(
    linkSource,
    /router\.prefetch\(localizedHref\)/,
    "LocalizedLink must prefetch route code for localized dashboard hrefs"
  );
  assert.match(
    linkSource,
    /onMouseEnter/,
    "LocalizedLink must wire a hover prewarm entry point"
  );
  assert.match(
    linkSource,
    /onFocus/,
    "LocalizedLink must wire a focus prewarm entry point"
  );

  assert.match(
    routerSource,
    /useQueryClient/,
    "useLocalizedDashboardRouter must reuse the shared query client"
  );
  assert.match(
    routerSource,
    /prewarmDashboardQueries/,
    "useLocalizedDashboardRouter must trigger best-effort query prewarm for imperative navigation"
  );
  assert.match(
    routerSource,
    /prefetch\(href: string, options\?: Parameters<typeof router\.prefetch>\[1\]\)/,
    "useLocalizedDashboardRouter must preserve the typed prefetch options signature"
  );
  assert.match(
    routerSource,
    /router\.prefetch\(localizedHref, options\)/,
    "useLocalizedDashboardRouter must still forward localized prefetch options into Next.js"
  );

  assert.match(
    searchSource,
    /useDeferredValue/,
    "GlobalSearch must defer typed input before issuing fetch-heavy result updates"
  );
  assert.match(
    searchSource,
    /startTransition/,
    "GlobalSearch must wrap result navigation in a transition"
  );
  assert.match(
    searchSource,
    /const \{ push, prefetch \} = useLocalizedDashboardRouter\(\)/,
    "GlobalSearch must reuse the shared localized router wrapper for both navigation and prewarm"
  );
  assert.match(
    searchSource,
    /void prefetch\(item\.href\)/,
    "GlobalSearch must prewarm explicit result targets before click navigation"
  );
});
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run:

```bash
node --test test/dashboard-prewarm-targets.test.mjs test/dashboard-contract.test.mjs
```

Expected: FAIL because `src/lib/dashboard-query-prewarm.ts` does not exist and
the shared navigation sources do not yet contain the new prewarm wiring.

- [ ] **Step 3: Implement best-effort query prewarm and integrate it into shared navigation**

Create `src/lib/dashboard-query-prewarm.ts`:

```ts
import type { QueryClient } from "@tanstack/react-query";
import { aiServicesQueryOptions } from "@/hooks/use-api/use-ai";
import {
  backendTlsQueryOptions,
  gatewayQueryOptions,
  gatewaysQueryOptions,
  routeQueryOptions,
  routesQueryOptions,
  tokenPoliciesQueryOptions,
} from "@/hooks/use-api/use-gateways";
import {
  referenceGrantQueryOptions,
  referenceGrantsQueryOptions,
} from "@/hooks/use-api/use-resources";
import {
  getDashboardQueryPrewarmTargets,
  type DashboardQueryPrewarmTarget,
} from "@/lib/dashboard-prewarm-targets";

function prefetchTarget(queryClient: QueryClient, target: DashboardQueryPrewarmTarget) {
  switch (target.kind) {
    case "gateways-list":
      return queryClient.prefetchQuery(gatewaysQueryOptions());
    case "gateway-detail":
      return queryClient.prefetchQuery(gatewayQueryOptions(target.namespace, target.name));
    case "routes-list":
      return queryClient.prefetchQuery(routesQueryOptions());
    case "route-detail":
      return queryClient.prefetchQuery(
        routeQueryOptions(target.namespace, target.name, target.routeKind)
      );
    case "backend-tls-list":
      return queryClient.prefetchQuery(backendTlsQueryOptions());
    case "reference-grants-list":
      return queryClient.prefetchQuery(referenceGrantsQueryOptions());
    case "reference-grant-detail":
      return queryClient.prefetchQuery(
        referenceGrantQueryOptions(target.namespace, target.name)
      );
    case "ai-services-list":
      return queryClient.prefetchQuery(aiServicesQueryOptions());
    case "token-policies-list":
      return queryClient.prefetchQuery(tokenPoliciesQueryOptions());
  }
}

export function prewarmDashboardQueries(queryClient: QueryClient, localizedHref: string) {
  for (const target of getDashboardQueryPrewarmTargets(localizedHref)) {
    try {
      void prefetchTarget(queryClient, target);
    } catch {
      // Best-effort optimization only.
    }
  }
}
```

Update `src/components/dashboard/localized-link.tsx`:

```tsx
"use client";

import type { ComponentProps } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link, { type LinkProps } from "next/link";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { localizeDashboardPath } from "@/lib/dashboard-navigation";
import { prewarmDashboardQueries } from "@/lib/dashboard-query-prewarm";

type LocalizedLinkProps = Omit<ComponentProps<typeof Link>, "href"> &
  Pick<LinkProps, "replace" | "scroll" | "prefetch"> & {
    href: string;
  };

export function LocalizedLink({
  href,
  onMouseEnter,
  onFocus,
  prefetch,
  ...props
}: LocalizedLinkProps) {
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const localizedHref = localizeDashboardPath(locale, href);

  function handlePrewarm() {
    if (prefetch === false) return;
    try {
      void router.prefetch(localizedHref);
    } catch {
      // Best-effort optimization only.
    }
    prewarmDashboardQueries(queryClient, localizedHref);
  }

  return (
    <Link
      href={localizedHref}
      prefetch={prefetch}
      onMouseEnter={(event) => {
        handlePrewarm();
        onMouseEnter?.(event);
      }}
      onFocus={(event) => {
        handlePrewarm();
        onFocus?.(event);
      }}
      {...props}
    />
  );
}
```

Update `src/lib/use-localized-dashboard-router.ts`:

```ts
"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { localizeDashboardPath } from "@/lib/dashboard-navigation";
import { prewarmDashboardQueries } from "@/lib/dashboard-query-prewarm";

export function useLocalizedDashboardRouter() {
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();

  return {
    push(href: string, options?: Parameters<typeof router.push>[1]) {
      const localizedHref = localizeDashboardPath(locale, href);
      prewarmDashboardQueries(queryClient, localizedHref);
      router.push(localizedHref, options);
    },
    replace(href: string, options?: Parameters<typeof router.replace>[1]) {
      const localizedHref = localizeDashboardPath(locale, href);
      prewarmDashboardQueries(queryClient, localizedHref);
      router.replace(localizedHref, options);
    },
    prefetch(href: string, options?: Parameters<typeof router.prefetch>[1]) {
      const localizedHref = localizeDashboardPath(locale, href);
      prewarmDashboardQueries(queryClient, localizedHref);
      return router.prefetch(localizedHref, options);
    },
  };
}
```

Update `src/components/dashboard/global-search.tsx`:

```tsx
"use client";

import {
  startTransition,
  useDeferredValue,
  useId,
  useMemo,
  useState,
  type KeyboardEvent,
} from "react";
import { useAtom } from "jotai";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { useGlobalSearch } from "@/hooks/use-api/use-global-search";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useLocalizedDashboardRouter } from "@/lib/use-localized-dashboard-router";
import { searchAtom } from "@/lib/store";
import {
  type GlobalSearchItem,
  type GlobalSearchKind,
} from "@/lib/global-search";

const kindOrder: GlobalSearchKind[] = [
  "gateway",
  "route",
  "referenceGrant",
  "backendTls",
  "node",
  "diagnostic",
];

type IndexedSearchItem = {
  item: GlobalSearchItem;
  index: number;
};

function groupResults(items: IndexedSearchItem[]): Record<GlobalSearchKind, IndexedSearchItem[]> {
  return kindOrder.reduce<Record<GlobalSearchKind, IndexedSearchItem[]>>(
    (groups, kind) => {
      groups[kind] = items.filter(({ item }) => item.kind === kind);
      return groups;
    },
    {
      gateway: [],
      route: [],
      referenceGrant: [],
      backendTls: [],
      node: [],
      diagnostic: [],
    }
  );
}

export function GlobalSearch() {
  const t = useTranslations();
  const { push, prefetch } = useLocalizedDashboardRouter();
  const listboxId = useId();
  const [search, setSearch] = useAtom(searchAtom);
  const deferredSearch = useDeferredValue(search);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const query = deferredSearch.trim();
  const typedQuery = search.trim();
  const shouldFetch = open && typedQuery.length > 0;

  const { data: results = [], isLoading } = useGlobalSearch(query, shouldFetch);

  const indexedResults = useMemo(
    () => results.map((item, index) => ({ item, index })),
    [results]
  );
  const grouped = useMemo(() => groupResults(indexedResults), [indexedResults]);
  const showPanel = open && typedQuery.length > 0;
  const selectedIndex = results.length === 0 ? 0 : Math.min(activeIndex, results.length - 1);

  function openResult(href: string) {
    setOpen(false);
    setSearch("");
    startTransition(() => {
      push(href);
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (results.length === 0 ? 0 : Math.min(index + 1, results.length - 1)));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(Math.max(results.length - 1, 0));
      return;
    }
    if (event.key === "Enter" && results[0]) {
      event.preventDefault();
      openResult(results[selectedIndex]?.href ?? results[0].href);
    }
  }

  return (
    <div
      className="relative w-72"
      onBlur={(event) => {
        const nextTarget = event.relatedTarget;
        if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;
        setOpen(false);
      }}
    >
      <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        aria-controls="global-search-results"
        aria-activedescendant={showPanel && results[selectedIndex] ? `${listboxId}-${selectedIndex}` : undefined}
        aria-expanded={showPanel}
        aria-label={t("topbar.search_label")}
        className="pl-8"
        placeholder={t("topbar.search_placeholder")}
        role="combobox"
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setActiveIndex(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {showPanel && (
        <div
          id="global-search-results"
          role="listbox"
          className="absolute right-0 top-11 z-50 max-h-[28rem] w-[28rem] overflow-y-auto rounded-lg border bg-popover p-2 text-popover-foreground shadow-xl"
        >
          {isLoading ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              {t("topbar.search_loading")}
            </div>
          ) : results.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              {t("topbar.search_empty")}
            </div>
          ) : (
            kindOrder.map((kind) => {
              const group = grouped[kind];
              if (group.length === 0) return null;
              return (
                <section key={kind} className="py-1">
                  <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t(`topbar.search_groups.${kind}`)}
                  </div>
                  <div className="space-y-1">
                    {group.map(({ item, index }) => (
                      <button
                        key={`${item.kind}-${item.href}-${item.title}-${index}`}
                        id={`${listboxId}-${index}`}
                        aria-selected={index === selectedIndex}
                        role="option"
                        type="button"
                        className="flex w-full items-start gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring aria-selected:bg-accent"
                        onClick={() => openResult(item.href)}
                        onMouseDown={(event) => event.preventDefault()}
                        onMouseEnter={() => {
                          setActiveIndex(index);
                          void prefetch(item.href);
                        }}
                        onFocus={() => {
                          setActiveIndex(index);
                          void prefetch(item.href);
                        }}
                      >
                        <Badge variant="outline" className="mt-0.5 shrink-0">
                          {t(`topbar.search_badges.${item.kind}`)}
                        </Badge>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{item.title}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {item.subtitle || item.href}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run the focused tests to verify they pass**

Run:

```bash
node --test test/dashboard-prewarm-targets.test.mjs test/dashboard-contract.test.mjs
```

Expected: PASS with `0` failures, including the new shared-prewarm contract
test.

- [ ] **Step 5: Commit**

```bash
git add \
  src/lib/dashboard-query-prewarm.ts \
  src/components/dashboard/localized-link.tsx \
  src/lib/use-localized-dashboard-router.ts \
  src/components/dashboard/global-search.tsx \
  test/dashboard-contract.test.mjs
git commit -m "feat(dashboard): prewarm hotspot navigation paths"
```

---

### Task 3: Isolate Pathname-Sensitive TopBar Rendering

**Files:**
- Create: `src/lib/dashboard-page-title.ts`
- Create: `src/components/dashboard/top-bar-page-title.tsx`
- Create: `src/components/dashboard/top-bar-actions.tsx`
- Create: `src/components/dashboard/top-bar-locale-switcher.tsx`
- Create: `test/dashboard-page-title.test.mjs`
- Modify: `src/components/dashboard/top-bar.tsx`
- Modify: `test/dashboard-contract.test.mjs`

- [ ] **Step 1: Write the failing title helper test and TopBar boundary contract**

Create `test/dashboard-page-title.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const ts = require("typescript");

function loadDashboardPageTitle() {
  const source = readFileSync(resolve(root, "src/lib/dashboard-page-title.ts"), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  });

  const cjsModule = { exports: {} };
  vm.runInNewContext(outputText, {
    exports: cjsModule.exports,
    module: cjsModule,
    require,
  });

  return cjsModule.exports;
}

test("dashboard page title keeps overview as the default dashboard shell label", () => {
  const { getDashboardPageTitle } = loadDashboardPageTitle();
  assert.equal(getDashboardPageTitle("/en/overview"), "overview");
  assert.equal(getDashboardPageTitle("/zh"), "overview");
});

test("dashboard page title preserves the visible leaf segment used by the current shell", () => {
  const { getDashboardPageTitle } = loadDashboardPageTitle();
  assert.equal(getDashboardPageTitle("/en/gateways"), "gateways");
  assert.equal(getDashboardPageTitle("/zh/gateways/default/edge"), "edge");
  assert.equal(getDashboardPageTitle("/en/routes/HTTPRoute/shop/checkout"), "checkout");
});

test("dashboard page title ignores query strings and hashes", () => {
  const { getDashboardPageTitle } = loadDashboardPageTitle();
  assert.equal(getDashboardPageTitle("/en/reference-grants/shared/allow-shop?tab=yaml"), "allow-shop");
  assert.equal(getDashboardPageTitle("/zh/backend-tls/default/mtls#spec"), "mtls");
});
```

Append this block to `test/dashboard-contract.test.mjs`:

```js
test("top bar isolates pathname-sensitive rendering from unrelated shell controls", () => {
  const topBarSource = readSource("src/components/dashboard/top-bar.tsx");
  const titleSource = readSource("src/components/dashboard/top-bar-page-title.tsx");
  const actionsSource = readSource("src/components/dashboard/top-bar-actions.tsx");
  const localeSource = readSource("src/components/dashboard/top-bar-locale-switcher.tsx");

  assert.match(
    topBarSource,
    /TopBarPageTitle/,
    "TopBar must delegate pathname-derived title rendering into a focused child component"
  );
  assert.match(
    topBarSource,
    /TopBarActions/,
    "TopBar must delegate non-pathname shell controls into a separate child component"
  );
  assert.match(
    topBarSource,
    /TopBarLocaleSwitcher/,
    "TopBar must delegate locale path switching into its own child component"
  );
  assert.doesNotMatch(
    topBarSource,
    /usePathname/,
    "TopBar shell must stop subscribing the entire header to pathname changes"
  );
  assert.doesNotMatch(
    topBarSource,
    /useTheme/,
    "TopBar shell must stop owning theme state directly"
  );
  assert.doesNotMatch(
    topBarSource,
    /useAtom/,
    "TopBar shell must stop owning refresh atom state directly"
  );

  assert.match(
    titleSource,
    /usePathname/,
    "TopBarPageTitle must be the pathname-aware rendering boundary"
  );
  assert.match(
    actionsSource,
    /GlobalSearch/,
    "TopBarActions must host the search box outside the pathname boundary"
  );
  assert.match(
    localeSource,
    /usePathname/,
    "TopBarLocaleSwitcher must own locale route replacement logic"
  );
});
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run:

```bash
node --test test/dashboard-page-title.test.mjs test/dashboard-contract.test.mjs
```

Expected: FAIL with `ENOENT` for `src/lib/dashboard-page-title.ts` and missing
TopBar split components.

- [ ] **Step 3: Implement the pure title helper and split the TopBar shell**

Create `src/lib/dashboard-page-title.ts`:

```ts
export function getDashboardPageTitle(pathname: string): string {
  const pathOnly = pathname.split(/[?#]/, 1)[0] || pathname;
  const segments = pathOnly.split("/").filter(Boolean);
  const dashboardSegments =
    segments[0] === "en" || segments[0] === "zh" ? segments.slice(1) : segments;

  return dashboardSegments.at(-1) || "overview";
}
```

Create `src/components/dashboard/top-bar-page-title.tsx`:

```tsx
"use client";

import { usePathname } from "next/navigation";
import { getDashboardPageTitle } from "@/lib/dashboard-page-title";

export function TopBarPageTitle() {
  const pathname = usePathname();
  const pageTitle = getDashboardPageTitle(pathname);

  return <h2 className="font-semibold capitalize">{pageTitle}</h2>;
}
```

Create `src/components/dashboard/top-bar-actions.tsx`:

```tsx
"use client";

import { useAtom } from "jotai";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { RefreshCw, Sun, Moon } from "lucide-react";
import { GlobalSearch } from "@/components/dashboard/global-search";
import { Button } from "@/components/ui/button";
import { refreshEnabledAtom } from "@/lib/store";

export function TopBarActions() {
  const t = useTranslations();
  const [refreshEnabled, setRefreshEnabled] = useAtom(refreshEnabledAtom);
  const { theme, setTheme } = useTheme();

  return (
    <>
      <GlobalSearch />
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setRefreshEnabled(!refreshEnabled)}
        title={refreshEnabled ? t("control.auto_refresh_on") : t("control.auto_refresh_off")}
      >
        <RefreshCw className={`h-4 w-4 ${refreshEnabled ? "animate-spin-slow" : ""}`} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      >
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </Button>
    </>
  );
}
```

Create `src/components/dashboard/top-bar-locale-switcher.tsx`:

```tsx
"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function TopBarLocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function changeLocale(nextLocale: string) {
    if (nextLocale === locale) return;
    const pathWithoutLocale = pathname.replace(/^\/(en|zh)/, "");
    router.push(`/${nextLocale}${pathWithoutLocale || "/overview"}`);
  }

  return (
    <Select value={locale} onValueChange={changeLocale}>
      <SelectTrigger className="w-24">
        <Languages className="mr-1 h-4 w-4" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">English</SelectItem>
        <SelectItem value="zh">中文</SelectItem>
      </SelectContent>
    </Select>
  );
}
```

Update `src/components/dashboard/top-bar.tsx`:

```tsx
"use client";

import { TopBarActions } from "@/components/dashboard/top-bar-actions";
import { TopBarLocaleSwitcher } from "@/components/dashboard/top-bar-locale-switcher";
import { TopBarPageTitle } from "@/components/dashboard/top-bar-page-title";

export function TopBar() {
  return (
    <header className="flex h-14 items-center gap-4 border-b bg-card px-6">
      <TopBarPageTitle />
      <div className="flex-1" />
      <TopBarActions />
      <TopBarLocaleSwitcher />
    </header>
  );
}
```

- [ ] **Step 4: Run the focused tests to verify they pass**

Run:

```bash
node --test test/dashboard-page-title.test.mjs test/dashboard-contract.test.mjs
```

Expected: PASS with `3` passing tests from `dashboard-page-title.test.mjs` and
`0` failures across both files.

- [ ] **Step 5: Commit**

```bash
git add \
  src/lib/dashboard-page-title.ts \
  src/components/dashboard/top-bar-page-title.tsx \
  src/components/dashboard/top-bar-actions.tsx \
  src/components/dashboard/top-bar-locale-switcher.tsx \
  src/components/dashboard/top-bar.tsx \
  test/dashboard-page-title.test.mjs \
  test/dashboard-contract.test.mjs
git commit -m "refactor(dashboard): isolate top bar navigation churn"
```

---

### Task 4: Full Verification And Repository Boundary Check

**Files:**
- Modify: none

- [ ] **Step 1: Run the targeted navigation regression suite**

Run:

```bash
node --test \
  test/dashboard-prewarm-targets.test.mjs \
  test/dashboard-page-title.test.mjs \
  test/global-search.test.mjs \
  test/dashboard-contract.test.mjs
```

Expected: PASS with `0` failures.

- [ ] **Step 2: Run the full dashboard acceptance command**

Run:

```bash
npm run check
```

Expected:

- `validate:app-router` passes
- Node test suite passes
- ESLint passes
- production build passes

- [ ] **Step 3: Run diff hygiene**

Run:

```bash
git diff --check
```

Expected: no whitespace errors and no conflict markers.

- [ ] **Step 4: Confirm unrelated component repositories remain unchanged**

Run:

```bash
git -C /root/nantian-gw/gateway status --short --branch
git -C /root/nantian-gw/dataplane status --short --branch
git -C /root/nantian-gw/proto status --short --branch
git -C /root/nantian-gw/helm-charts status --short --branch
git -C /root/nantian-gw/website status --short --branch
```

Expected:

- this worktree task introduces no new changes into unrelated component
  repositories
- any pre-existing unrelated dirt, if present, is reported unchanged rather
  than silently modified

- [ ] **Step 5: Report exact commands and results**

Capture the exact result summary for:

- targeted Node regression tests
- `npm run check`
- `git diff --check`
- unrelated repository `git status --short --branch`
