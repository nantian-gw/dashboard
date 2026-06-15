# Dashboard Locale-Aware Navigation Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove avoidable non-localized in-app dashboard navigations so routine page transitions stay inside locale-aware routes and stop paying an extra proxy redirect.

**Architecture:** Add one pure locale-path helper plus one thin client router wrapper and one localized link wrapper. Keep plugin route configuration locale-neutral, then localize only at render/navigation time. Update representative dashboard pages, forms, and shared UI entry points to use the shared wrappers instead of raw `next/link` or raw `router.push("/...")`.

**Tech Stack:** Next.js 16 App Router, `next-intl`, `next/navigation`, Node.js native test runner, TypeScript

---

## File Structure

- Create: `src/lib/dashboard-navigation.ts`
  Pure locale-aware path helpers for dashboard-internal routes.
- Create: `src/lib/use-localized-dashboard-router.ts`
  Thin client wrapper around `next/navigation` router that localizes dashboard paths before `push`, `replace`, and `prefetch`.
- Create: `src/components/dashboard/localized-link.tsx`
  Small client wrapper around `next/link` that localizes dashboard-internal hrefs using the active locale.
- Create: `test/localized-navigation.test.mjs`
  Runtime unit coverage for the pure locale helper.
- Modify: `src/components/dashboard/sidebar-nav.tsx`
  Sidebar must render localized links while keeping plugin config locale-neutral.
- Modify: `src/components/dashboard/select-route-type-dialog.tsx`
  Route-type picker must use localized links.
- Modify: `src/components/dashboard/global-search.tsx`
  Search result opening must use the localized router wrapper.
- Modify: `src/app/[locale]/(dashboard)/gateways/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/gateways/[namespace]/[name]/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/routes/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/routes/[kind]/[namespace]/[name]/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/reference-grants/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/reference-grants/[namespace]/[name]/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/backend-tls/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/backend-tls/[namespace]/[name]/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/observability/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/ai/services/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/ai/token-policies/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/routes/create/grpcroute/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/routes/create/tcproute/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/routes/create/tlsroute/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/routes/create/udproute/page.tsx`
- Modify: `src/components/resources/aiservice-form.tsx`
- Modify: `src/components/resources/backendtls-form.tsx`
- Modify: `src/components/resources/referencegrant-form.tsx`
- Modify: `src/components/resources/tokenpolicy-form.tsx`
- Modify: `test/dashboard-contract.test.mjs`
  Source-level regression checks for shared navigation wrappers and representative localized call sites.

---

### Task 1: Add Locale-Aware Navigation Primitives

**Files:**
- Create: `src/lib/dashboard-navigation.ts`
- Create: `test/localized-navigation.test.mjs`

- [ ] **Step 1: Write the failing helper test**

Create `test/localized-navigation.test.mjs`:

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

function loadDashboardNavigation() {
  const source = readFileSync(resolve(root, "src/lib/dashboard-navigation.ts"), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
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

test("localizeDashboardPath prefixes locale-neutral dashboard paths", () => {
  const { localizeDashboardPath } = loadDashboardNavigation();

  assert.equal(localizeDashboardPath("en", "/gateways"), "/en/gateways");
  assert.equal(
    localizeDashboardPath("zh", "/routes/HTTPRoute/default/edge"),
    "/zh/routes/HTTPRoute/default/edge"
  );
});

test("localizeDashboardPath preserves already localized paths", () => {
  const { localizeDashboardPath } = loadDashboardNavigation();

  assert.equal(localizeDashboardPath("en", "/en/overview"), "/en/overview");
  assert.equal(localizeDashboardPath("zh", "/zh/ai/services"), "/zh/ai/services");
});

test("localizeDashboardPath falls back to the default locale for unknown locale inputs", () => {
  const { localizeDashboardPath } = loadDashboardNavigation();

  assert.equal(localizeDashboardPath("fr", "/gateways"), "/en/gateways");
});

test("localizeDashboardPath rejects non-absolute dashboard hrefs", () => {
  const { localizeDashboardPath } = loadDashboardNavigation();

  assert.throws(
    () => localizeDashboardPath("en", "gateways"),
    /must start with \//
  );
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --test test/localized-navigation.test.mjs
```

Expected: FAIL with `ENOENT` for `src/lib/dashboard-navigation.ts`.

- [ ] **Step 3: Write the minimal helper implementation**

Create `src/lib/dashboard-navigation.ts`:

```ts
import { routing } from "@/i18n/routing";

const localeSet = new Set(routing.locales);

export function isDashboardLocale(value: string): value is (typeof routing.locales)[number] {
  return localeSet.has(value as (typeof routing.locales)[number]);
}

export function normalizeDashboardLocale(locale: string): (typeof routing.locales)[number] {
  return isDashboardLocale(locale) ? locale : routing.defaultLocale;
}

export function localizeDashboardPath(locale: string, href: string): string {
  if (!href.startsWith("/")) {
    throw new Error(`dashboard navigation href must start with /: ${href}`);
  }

  const normalizedLocale = normalizeDashboardLocale(locale);
  const match = href.match(/^([^?#]*)(.*)$/);
  const pathname = match?.[1] ?? href;
  const suffix = match?.[2] ?? "";
  const firstSegment = pathname.split("/").filter(Boolean)[0] ?? "";

  if (isDashboardLocale(firstSegment)) {
    return `${pathname}${suffix}`;
  }

  return `/${normalizedLocale}${pathname}${suffix}`;
}
```

- [ ] **Step 4: Run the helper test to verify it passes**

Run:

```bash
node --test test/localized-navigation.test.mjs
```

Expected: PASS with `4` passing tests and `0` failures.

- [ ] **Step 5: Commit**

```bash
git add test/localized-navigation.test.mjs src/lib/dashboard-navigation.ts
git commit -m "test: add dashboard locale navigation helper coverage"
```

---

### Task 2: Add Shared Localized Link And Router Wrappers

**Files:**
- Create: `src/components/dashboard/localized-link.tsx`
- Create: `src/lib/use-localized-dashboard-router.ts`
- Modify: `src/components/dashboard/sidebar-nav.tsx`
- Modify: `src/components/dashboard/select-route-type-dialog.tsx`
- Modify: `src/components/dashboard/global-search.tsx`

- [ ] **Step 1: Write the failing contract checks for shared navigation wrappers**

Add this test block near the end of `test/dashboard-contract.test.mjs`:

```js
test("dashboard shared navigation wrappers localize in-app routes", () => {
  const linkSource = readSource("src/components/dashboard/localized-link.tsx");
  const routerSource = readSource("src/lib/use-localized-dashboard-router.ts");
  const sidebarSource = readSource("src/components/dashboard/sidebar-nav.tsx");
  const dialogSource = readSource("src/components/dashboard/select-route-type-dialog.tsx");
  const searchSource = readSource("src/components/dashboard/global-search.tsx");

  assert.match(
    linkSource,
    /localizeDashboardPath/,
    "LocalizedLink must localize dashboard hrefs before rendering next/link"
  );
  assert.match(
    routerSource,
    /router\.push\(localizeDashboardPath\(locale, href\)/,
    "useLocalizedDashboardRouter must localize push targets"
  );
  assert.match(
    routerSource,
    /router\.replace\(localizeDashboardPath\(locale, href\)/,
    "useLocalizedDashboardRouter must localize replace targets"
  );
  assert.match(
    sidebarSource,
    /LocalizedLink/,
    "sidebar nav must render localized dashboard links"
  );
  assert.doesNotMatch(
    sidebarSource,
    /<Link key=\{item\.href\} href=\{item\.href\}>/,
    "sidebar nav must not forward locale-neutral plugin hrefs directly into next/link"
  );
  assert.match(
    dialogSource,
    /LocalizedLink/,
    "route-type dialog must render localized create-route links"
  );
  assert.match(
    searchSource,
    /useLocalizedDashboardRouter/,
    "global search must use the localized dashboard router wrapper"
  );
  assert.doesNotMatch(
    searchSource,
    /router\.push\(href\)/,
    "global search must not push locale-neutral hrefs directly"
  );
});
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run:

```bash
node --test test/localized-navigation.test.mjs test/dashboard-contract.test.mjs
```

Expected: FAIL because `src/components/dashboard/localized-link.tsx` and
`src/lib/use-localized-dashboard-router.ts` do not exist yet.

- [ ] **Step 3: Write the shared wrappers and update shared entry points**

Create `src/components/dashboard/localized-link.tsx`:

```tsx
"use client";

import type { ComponentProps } from "react";
import Link, { type LinkProps } from "next/link";
import { useLocale } from "next-intl";
import { localizeDashboardPath } from "@/lib/dashboard-navigation";

type LocalizedLinkProps = Omit<ComponentProps<typeof Link>, "href"> &
  Pick<LinkProps, "replace" | "scroll" | "prefetch"> & {
    href: string;
  };

export function LocalizedLink({ href, ...props }: LocalizedLinkProps) {
  const locale = useLocale();
  return <Link href={localizeDashboardPath(locale, href)} {...props} />;
}
```

Create `src/lib/use-localized-dashboard-router.ts`:

```ts
"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { localizeDashboardPath } from "@/lib/dashboard-navigation";

export function useLocalizedDashboardRouter() {
  const locale = useLocale();
  const router = useRouter();

  return {
    push(href: string, options?: Parameters<typeof router.push>[1]) {
      router.push(localizeDashboardPath(locale, href), options);
    },
    replace(href: string, options?: Parameters<typeof router.replace>[1]) {
      router.replace(localizeDashboardPath(locale, href), options);
    },
    prefetch(href: string) {
      return router.prefetch(localizeDashboardPath(locale, href));
    },
  };
}
```

Update `src/components/dashboard/sidebar-nav.tsx`:

```tsx
import { LocalizedLink } from "@/components/dashboard/localized-link";
```

and replace the raw link render:

```tsx
        return (
          <LocalizedLink key={item.href} href={item.href}>
            <Button
              variant={isActive ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-2",
                isActive && "bg-muted font-medium"
              )}
            >
              <Icon className="h-4 w-4" />
              {t(item.labelKey)}
            </Button>
          </LocalizedLink>
        );
```

Update `src/components/dashboard/select-route-type-dialog.tsx`:

```tsx
import { LocalizedLink } from "@/components/dashboard/localized-link";
```

and replace the raw link:

```tsx
            <LocalizedLink
              key={kind}
              href={`/routes/create/${kind.toLowerCase()}`}
              className="block"
            >
              <Button
                variant="outline"
                className="w-full justify-between h-auto py-3 px-4"
              >
                <div className="text-left">
                  <div className="font-medium">{t(`route_types.${kind.toLowerCase()}.name`)}</div>
                  <div className="text-sm text-muted-foreground">{t(`route_types.${kind.toLowerCase()}.description`)}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Button>
            </LocalizedLink>
```

Update `src/components/dashboard/global-search.tsx`:

```tsx
import { useLocalizedDashboardRouter } from "@/lib/use-localized-dashboard-router";
```

replace the router line:

```tsx
  const { push } = useLocalizedDashboardRouter();
```

and keep `openResult` as:

```tsx
  function openResult(href: string) {
    setOpen(false);
    setSearch("");
    push(href);
  }
```

- [ ] **Step 4: Run the focused tests to verify they pass**

Run:

```bash
node --test test/localized-navigation.test.mjs test/dashboard-contract.test.mjs
```

Expected: PASS for the new helper tests and the new shared-wrapper contract test.

- [ ] **Step 5: Commit**

```bash
git add \
  test/dashboard-contract.test.mjs \
  src/components/dashboard/localized-link.tsx \
  src/lib/use-localized-dashboard-router.ts \
  src/components/dashboard/sidebar-nav.tsx \
  src/components/dashboard/select-route-type-dialog.tsx \
  src/components/dashboard/global-search.tsx
git commit -m "fix: localize shared dashboard navigation"
```

---

### Task 3: Update Dashboard Page Links And Imperative Redirects

**Files:**
- Modify: `src/app/[locale]/(dashboard)/gateways/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/gateways/[namespace]/[name]/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/routes/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/routes/[kind]/[namespace]/[name]/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/reference-grants/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/reference-grants/[namespace]/[name]/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/backend-tls/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/backend-tls/[namespace]/[name]/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/observability/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/ai/services/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/ai/token-policies/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/routes/create/grpcroute/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/routes/create/tcproute/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/routes/create/tlsroute/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/routes/create/udproute/page.tsx`

- [ ] **Step 1: Add the failing source-level regression checks for representative pages**

Append this block to `test/dashboard-contract.test.mjs`:

```js
test("representative dashboard pages stop using raw non-localized navigation targets", () => {
  const gatewayListSource = readSource("src/app/[locale]/(dashboard)/gateways/page.tsx");
  const gatewayDetailSource = readSource("src/app/[locale]/(dashboard)/gateways/[namespace]/[name]/page.tsx");
  const routesSource = readSource("src/app/[locale]/(dashboard)/routes/page.tsx");
  const routeCreateSource = readSource("src/app/[locale]/(dashboard)/routes/create/grpcroute/page.tsx");
  const backendTlsDetailSource = readSource("src/app/[locale]/(dashboard)/backend-tls/[namespace]/[name]/page.tsx");

  assert.match(gatewayListSource, /LocalizedLink/, "gateway list must use LocalizedLink");
  assert.doesNotMatch(gatewayListSource, /<Link href="\/gateways\/create">/, "gateway list must not link to a bare /gateways/create path");

  assert.match(gatewayDetailSource, /useLocalizedDashboardRouter/, "gateway detail must use the localized router wrapper");
  assert.match(gatewayDetailSource, /const \{ push \} = useLocalizedDashboardRouter\(\)/, "gateway detail must destructure push from the localized router wrapper");
  assert.doesNotMatch(gatewayDetailSource, /router\.push\("\/gateways"\)/, "gateway delete flow must not push a bare /gateways path");
  assert.doesNotMatch(gatewayDetailSource, /<Link href="\/gateways">/, "gateway detail back link must not point at bare /gateways");

  assert.match(routesSource, /LocalizedLink/, "routes list must use LocalizedLink for route detail links");
  assert.doesNotMatch(routesSource, /href=\{`\/routes\//, "routes list must not emit bare /routes/... hrefs");

  assert.match(routeCreateSource, /useLocalizedDashboardRouter/, "gRPC route creation must use the localized router wrapper");
  assert.match(routeCreateSource, /const \{ push \} = useLocalizedDashboardRouter\(\)/, "gRPC route creation must destructure push from the localized router wrapper");
  assert.doesNotMatch(routeCreateSource, /router\.push\(`\/routes\/GRPCRoute/, "gRPC route creation must not push a bare /routes/... path");

  assert.match(backendTlsDetailSource, /LocalizedLink/, "backend TLS detail page must use LocalizedLink");
  assert.match(backendTlsDetailSource, /const \{ push \} = useLocalizedDashboardRouter\(\)/, "backend TLS detail page must destructure push from the localized router wrapper");
  assert.doesNotMatch(backendTlsDetailSource, /router\.push\("\/backend-tls"\)/, "backend TLS delete flow must not push a bare /backend-tls path");
});
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run:

```bash
node --test test/localized-navigation.test.mjs test/dashboard-contract.test.mjs
```

Expected: FAIL because the representative pages still use raw `Link` and raw
`router.push("/...")`.

- [ ] **Step 3: Replace representative page call sites with the shared wrappers**

Update `src/app/[locale]/(dashboard)/gateways/page.tsx`:

```tsx
import { LocalizedLink } from "@/components/dashboard/localized-link";
```

and replace both link sites:

```tsx
          <LocalizedLink href="/gateways/create">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              {t("actions.create_gateway")}
            </Button>
          </LocalizedLink>
```

```tsx
                    <LocalizedLink
                      href={`/gateways/${gateway.namespace}/${gateway.name}`}
                      className="font-medium hover:underline"
                    >
                      <ClampText value={gateway.name} head={18} tail={8} />
                    </LocalizedLink>
```

Update `src/app/[locale]/(dashboard)/gateways/[namespace]/[name]/page.tsx`:

```tsx
import { useLocalizedDashboardRouter } from "@/lib/use-localized-dashboard-router";
import { LocalizedLink } from "@/components/dashboard/localized-link";
```

```tsx
  const { push } = useLocalizedDashboardRouter();
```

```tsx
      push("/gateways");
```

```tsx
        <LocalizedLink href="/gateways">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </LocalizedLink>
```

```tsx
          <LocalizedLink href={`/gateways/${namespace}/${name}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
            </Button>
          </LocalizedLink>
```

```tsx
                        <LocalizedLink
                          href={`/routes/${route.kind}/${route.namespace}/${route.name}`}
                          className="font-medium hover:underline"
                        >
                          <ClampText value={route.name} head={18} tail={8} />
                        </LocalizedLink>
```

Update `src/app/[locale]/(dashboard)/routes/page.tsx`:

```tsx
import { LocalizedLink } from "@/components/dashboard/localized-link";
```

```tsx
                    <LocalizedLink
                      href={`/routes/${route.kind}/${route.namespace}/${route.name}`}
                      className="hover:underline"
                    >
                      <ClampText value={route.name || "—"} head={18} tail={8} />
                    </LocalizedLink>
```

Update `src/app/[locale]/(dashboard)/routes/[kind]/[namespace]/[name]/page.tsx`:

```tsx
import { useLocalizedDashboardRouter } from "@/lib/use-localized-dashboard-router";
import { LocalizedLink } from "@/components/dashboard/localized-link";
```

```tsx
  const { push } = useLocalizedDashboardRouter();
```

```tsx
      push("/routes");
```

```tsx
        <LocalizedLink href="/routes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </LocalizedLink>
```

```tsx
          <LocalizedLink href={`/routes/${kind.toLowerCase()}/${namespace}/${name}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
            </Button>
          </LocalizedLink>
```

```tsx
                    <LocalizedLink
                      href={`/gateways/${parent.namespace || "default"}/${parent.name}`}
                      className="hover:underline"
                    >
                      {parent.name}
                    </LocalizedLink>
```

Update `src/app/[locale]/(dashboard)/reference-grants/page.tsx`:

```tsx
import { LocalizedLink } from "@/components/dashboard/localized-link";
```

```tsx
        <LocalizedLink href="/reference-grants/create">
```

```tsx
                    <LocalizedLink
                      href={`/reference-grants/${grant.namespace}/${grant.name}`}
                      className="hover:underline"
                    >
```

Update `src/app/[locale]/(dashboard)/reference-grants/[namespace]/[name]/page.tsx`:

```tsx
import { useLocalizedDashboardRouter } from "@/lib/use-localized-dashboard-router";
import { LocalizedLink } from "@/components/dashboard/localized-link";
```

```tsx
  const { push } = useLocalizedDashboardRouter();
```

```tsx
      push("/reference-grants");
```

```tsx
        <LocalizedLink href="/reference-grants">
```

```tsx
          <LocalizedLink href={`/reference-grants/${namespace}/${name}/edit`}>
```

Update `src/app/[locale]/(dashboard)/backend-tls/page.tsx`:

```tsx
import { LocalizedLink } from "@/components/dashboard/localized-link";
```

```tsx
        <LocalizedLink href="/backend-tls/create">
```

```tsx
                  <LocalizedLink
                    href={`/backend-tls/${policy.namespace}/${policy.name}`}
                    className="hover:underline text-primary"
                  >
```

Update `src/app/[locale]/(dashboard)/backend-tls/[namespace]/[name]/page.tsx`:

```tsx
import { useLocalizedDashboardRouter } from "@/lib/use-localized-dashboard-router";
import { LocalizedLink } from "@/components/dashboard/localized-link";
```

```tsx
  const { push } = useLocalizedDashboardRouter();
```

```tsx
      push("/backend-tls");
```

```tsx
        <LocalizedLink href="/backend-tls">
```

```tsx
          <LocalizedLink href={`/backend-tls/${namespace}/${name}/edit`}>
```

Update `src/app/[locale]/(dashboard)/observability/page.tsx`:

```tsx
import { LocalizedLink } from "@/components/dashboard/localized-link";
```

Replace only the dashboard page links and leave the download anchor unchanged:

```tsx
        <LocalizedLink href="/settings">
```

```tsx
        <LocalizedLink href="/settings">
```

Update `src/app/[locale]/(dashboard)/ai/services/page.tsx`:

```tsx
import { LocalizedLink } from "@/components/dashboard/localized-link";
```

```tsx
        <LocalizedLink href="/ai/services/create">
```

Update `src/app/[locale]/(dashboard)/ai/token-policies/page.tsx`:

```tsx
import { LocalizedLink } from "@/components/dashboard/localized-link";
```

```tsx
        <LocalizedLink href="/ai/token-policies/create">
```

```tsx
                    <LocalizedLink href={`/ai/token-policies/${policy.name}`}>
```

Update `src/app/[locale]/(dashboard)/routes/create/grpcroute/page.tsx`:

```tsx
import { useLocalizedDashboardRouter } from "@/lib/use-localized-dashboard-router";
import { LocalizedLink } from "@/components/dashboard/localized-link";
```

```tsx
  const { push } = useLocalizedDashboardRouter();
```

```tsx
      push(`/routes/GRPCRoute/${namespace}/${name}`);
```

```tsx
          <LocalizedLink href="/routes">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </LocalizedLink>
```

Update `src/app/[locale]/(dashboard)/routes/create/tcproute/page.tsx`,
`src/app/[locale]/(dashboard)/routes/create/tlsroute/page.tsx`, and
`src/app/[locale]/(dashboard)/routes/create/udproute/page.tsx` with the same
import pattern and localized back link, then localize each success target:

```tsx
      push(`/routes/TCPRoute/${namespace}/${name}`);
```

```tsx
      push(`/routes/TLSRoute/${namespace}/${name}`);
```

```tsx
      push(`/routes/UDPRoute/${namespace}/${name}`);
```

- [ ] **Step 4: Run the focused tests to verify they pass**

Run:

```bash
node --test test/localized-navigation.test.mjs test/dashboard-contract.test.mjs
```

Expected: PASS for the representative page-level navigation assertions.

- [ ] **Step 5: Commit**

```bash
git add \
  src/app/[locale]/(dashboard)/gateways/page.tsx \
  src/app/[locale]/(dashboard)/gateways/[namespace]/[name]/page.tsx \
  src/app/[locale]/(dashboard)/routes/page.tsx \
  src/app/[locale]/(dashboard)/routes/[kind]/[namespace]/[name]/page.tsx \
  src/app/[locale]/(dashboard)/reference-grants/page.tsx \
  src/app/[locale]/(dashboard)/reference-grants/[namespace]/[name]/page.tsx \
  src/app/[locale]/(dashboard)/backend-tls/page.tsx \
  src/app/[locale]/(dashboard)/backend-tls/[namespace]/[name]/page.tsx \
  src/app/[locale]/(dashboard)/observability/page.tsx \
  src/app/[locale]/(dashboard)/ai/services/page.tsx \
  src/app/[locale]/(dashboard)/ai/token-policies/page.tsx \
  src/app/[locale]/(dashboard)/routes/create/grpcroute/page.tsx \
  src/app/[locale]/(dashboard)/routes/create/tcproute/page.tsx \
  src/app/[locale]/(dashboard)/routes/create/tlsroute/page.tsx \
  src/app/[locale]/(dashboard)/routes/create/udproute/page.tsx \
  test/dashboard-contract.test.mjs
git commit -m "fix: localize dashboard page navigation"
```

---

### Task 4: Update Resource Forms And Remaining In-App Resource Links

**Files:**
- Modify: `src/components/resources/aiservice-form.tsx`
- Modify: `src/components/resources/backendtls-form.tsx`
- Modify: `src/components/resources/referencegrant-form.tsx`
- Modify: `src/components/resources/tokenpolicy-form.tsx`

- [ ] **Step 1: Add the failing source-level regression checks for resource-form back links**

Append this block to `test/dashboard-contract.test.mjs`:

```js
test("resource forms use localized dashboard links for operator back navigation", () => {
  for (const routePath of [
    "src/components/resources/aiservice-form.tsx",
    "src/components/resources/backendtls-form.tsx",
    "src/components/resources/referencegrant-form.tsx",
    "src/components/resources/tokenpolicy-form.tsx",
  ]) {
    const source = readSource(routePath);
    assert.match(source, /LocalizedLink/, `${routePath} must use LocalizedLink for in-app back navigation`);
    assert.doesNotMatch(source, /<Link href="\/(ai\/services|backend-tls|reference-grants|ai\/token-policies)"/, `${routePath} must not point at bare dashboard hrefs`);
  }
});
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run:

```bash
node --test test/localized-navigation.test.mjs test/dashboard-contract.test.mjs
```

Expected: FAIL because the resource-form files still use raw `next/link`.

- [ ] **Step 3: Update each form to use the shared localized link wrapper**

Update each of the four resource form files to replace:

```tsx
import Link from "next/link";
```

with:

```tsx
import { LocalizedLink } from "@/components/dashboard/localized-link";
```

Then replace the in-app back links:

`src/components/resources/tokenpolicy-form.tsx`

```tsx
          <LocalizedLink href="/ai/token-policies">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </LocalizedLink>
```

```tsx
              <LocalizedLink href="/ai/token-policies">
                <Button variant="outline" type="button">
                  {t("actions.cancel")}
                </Button>
              </LocalizedLink>
```

`src/components/resources/backendtls-form.tsx`

```tsx
          <LocalizedLink href="/backend-tls">
```

```tsx
              <LocalizedLink href="/backend-tls">
```

`src/components/resources/referencegrant-form.tsx`

```tsx
          <LocalizedLink href="/reference-grants">
```

```tsx
              <LocalizedLink href="/reference-grants">
```

`src/components/resources/aiservice-form.tsx`

```tsx
          <LocalizedLink href="/ai/services">
```

```tsx
              <LocalizedLink href="/ai/services">
```

- [ ] **Step 4: Run the focused tests to verify they pass**

Run:

```bash
node --test test/localized-navigation.test.mjs test/dashboard-contract.test.mjs
```

Expected: PASS for the resource-form navigation contract checks.

- [ ] **Step 5: Commit**

```bash
git add \
  src/components/resources/aiservice-form.tsx \
  src/components/resources/backendtls-form.tsx \
  src/components/resources/referencegrant-form.tsx \
  src/components/resources/tokenpolicy-form.tsx \
  test/dashboard-contract.test.mjs
git commit -m "fix: localize dashboard resource form navigation"
```

---

### Task 5: Full Verification And Repository Boundary Check

**Files:**
- Modify: none

- [ ] **Step 1: Run the targeted navigation regression suite**

Run:

```bash
node --test test/localized-navigation.test.mjs test/global-search.test.mjs test/dashboard-contract.test.mjs
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

Expected: no whitespace or conflict-marker errors.

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

- no new changes are introduced into unrelated component repositories by this
  dashboard-only worktree task
- any pre-existing unrelated dirt remains unchanged and is reported as such

- [ ] **Step 5: Report exact commands and results**

Include the exact output status for:

- targeted Node tests
- `npm run check`
- `git diff --check`
- unrelated repository `git status --short --branch`
