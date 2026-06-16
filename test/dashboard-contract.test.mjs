import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readSource(relativePath) {
  return readFileSync(resolve(root, relativePath), "utf8");
}

test("root app entrypoint redirects straight to the localized login page", () => {
  const source = readSource("src/app/page.tsx");
  assert.match(
    source,
    /redirect\(`\/\$\{routing\.defaultLocale\}\/login`\)/,
    "src/app/page.tsx must redirect directly to the default-locale login page"
  );
});

test("legacy root provider module was removed", () => {
  assert.equal(
    existsSync(resolve(root, "src/app/providers.tsx")),
    false,
    "the legacy duplicate root provider module should be removed"
  );
  assert.equal(
    existsSync(resolve(root, "src/app/[locale]/(dashboard)/locale-layout-client.tsx")),
    true,
    "the dashboard locale provider module should remain after removing the legacy root provider module"
  );
});

test("localized overview deep link is routable", () => {
  assert.equal(
    existsSync(resolve(root, "src/app/[locale]/(dashboard)/overview/page.tsx")),
    true,
    "/:locale/overview must resolve because dashboard navigation and login link to it"
  );
});

test("diagnostics page does not keep dead imports around the issue table", () => {
  const source = readSource("src/app/[locale]/(dashboard)/diagnostics/page.tsx");
  assert.doesNotMatch(
    source,
    /import\s+(?:type\s+)?\{[^}]*\bDiagnosticIssue\b[^}]*\}\s+from\s+"@\/lib\/admin-models";?/,
    'diagnostics page should not import DiagnosticIssue from "@/lib/admin-models"'
  );
});

test("dashboard hooks use the published admin API surface", () => {
  const source = readSource("src/hooks/use-api.ts");
  for (const staleEndpoint of [
    "/v1/gateways",
    "/v1/backend-tls",
    "/v1/diagnostics",
  ]) {
    assert.doesNotMatch(
      source,
      new RegExp(JSON.stringify(staleEndpoint).slice(1, -1).replaceAll("/", "\\/")),
      `${staleEndpoint} is not a published admin endpoint`
    );
  }
});

test("dashboard API proxy strips response headers made invalid by body rewriting", () => {
  // Proxy header stripping is now centralized in src/lib/proxy-headers.ts
  const source = readSource("src/lib/proxy-headers.ts");
  assert.match(
    source,
    /content-length/i,
    "proxy-headers.ts must explicitly handle content-length"
  );
  assert.match(
    source,
    /PROXY_STRIP_HEADERS/,
    "proxy-headers.ts must define a strip list"
  );
  assert.match(
    source,
    /PROXY_FORWARD_HEADERS/,
    "proxy-headers.ts must define a forward whitelist"
  );
});

test("AGENTS documents the current auth and routing behavior", () => {
  const source = readSource("AGENTS.md");
  assert.match(
    source,
    /Proxy \(`src\/proxy\.ts`\) excludes `\/api`, `\/healthz`, `\/_next`, `\/_vercel`, and static files from i18n routing\./,
    "AGENTS must point contributors at the active proxy entry point with the maintained routing guidance"
  );
  assert.match(
    source,
    /Root `\/` redirects to `\/\{defaultLocale\}\/login`\./,
    "AGENTS must describe the root redirect users actually hit"
  );
  assert.match(
    source,
    /Network errors or timeouts during verification deny login\./,
    "AGENTS must describe the current auth verification failure mode"
  );
  assert.match(
    source,
    /Login page lives at `\/\{locale\}\/login` and uses locale-specific messages via the locale-specific layout\./,
    "AGENTS must describe the localized login route contributors should maintain"
  );
  assert.doesNotMatch(
    source,
    /Fail-open/,
    "AGENTS must not describe auth verification as fail-open anymore"
  );
  assert.doesNotMatch(
    source,
    /src\/middleware\.ts/,
    "AGENTS must not refer contributors to the removed middleware entry point"
  );
  assert.doesNotMatch(
    source,
    /Middleware \(`src\/proxy\.ts`\)/,
    "AGENTS must use the current proxy wording rather than stale middleware terminology"
  );
  assert.doesNotMatch(
    source,
    /Login page at `\/login` is \*\*outside\*\* the locale layout/,
    "AGENTS must not describe the login page as non-localized"
  );
});

test("legacy dataplane nodes requests are routed to the published nodes endpoint", () => {
  const source = readSource("src/app/api/dataplane/[[...slug]]/route.ts");
  assert.match(
    source,
    /CONTROLPLANE_TARGET/,
    "legacy /api/dataplane/v1/nodes requests need a controlplane target"
  );
  assert.match(
    source,
    /slug === "\/v1\/nodes"/,
    "legacy /api/dataplane/v1/nodes must be detected explicitly"
  );
  assert.match(
    source,
    /target: CONTROLPLANE_TARGET, path: "\/v1\/nodes"/,
    "legacy /api/dataplane/v1/nodes must proxy to controlplane /v1/nodes"
  );
});

test("dataplane summary auth mismatches degrade through the BFF instead of surfacing a 401", () => {
  const source = readSource("src/app/api/dataplane/[[...slug]]/route.ts");
  assert.match(
    source,
    /slug === "\/v1\/summary"/,
    "dataplane proxy must detect the summary endpoint explicitly"
  );
  assert.match(
    source,
    /response\.status === 401 \|\| response\.status === 403/,
    "dataplane summary compatibility must handle upstream 401/403 responses"
  );
  assert.match(
    source,
    /availability/,
    "dataplane summary compatibility must emit an availability marker"
  );
  assert.match(
    source,
    /degraded/,
    "dataplane summary compatibility must mark the payload as degraded"
  );
});

test("legacy controlplane dashboard endpoints are served by compatibility handlers", () => {
  const source = readSource("src/app/api/controlplane/[[...slug]]/route.ts");
  for (const legacyEndpoint of [
    "/v1/gateways",
    "/v1/backend-tls",
    "/v1/diagnostics",
  ]) {
    assert.match(
      source,
      new RegExp(JSON.stringify(legacyEndpoint).slice(1, -1).replaceAll("/", "\\/")),
      `${legacyEndpoint} must be handled for already-loaded dashboard bundles`
    );
  }
  assert.match(
    source,
    /legacyControlplanePayload/,
    "legacy controlplane endpoints must rewrite published admin payloads"
  );
});

test("dashboard capability hook uses the published controlplane capability endpoint", () => {
  const hookSource = readSource("src/hooks/use-api/use-summary.ts");
  assert.match(
    hookSource,
    /dashboard\/capabilities/,
    "dashboard capability hook must use /v1/dashboard/capabilities"
  );
  const barrelSource = readSource("src/hooks/use-api.ts");
  assert.match(
    barrelSource,
    /useDashboardCapabilities/,
    "dashboard capability hook must be exported from the public hook barrel"
  );
});

test("sidebar navigation is plugin-driven instead of hard-coded optional modules", () => {
  const source = readSource("src/components/dashboard/sidebar-nav.tsx");
  assert.doesNotMatch(
    source,
    /const navItems = \[/,
    "sidebar nav must stop hard-coding optional AI and Wasm entries"
  );
  assert.match(source, /getEnabledNavItems/, "sidebar nav must read plugin nav registrations");
  assert.match(source, /useDashboardCapabilities/, "sidebar nav must filter by runtime capabilities");
});

test("dashboard locale layout installs the capability provider", () => {
  const layoutSource = readSource("src/app/[locale]/(dashboard)/locale-layout-client.tsx");
  assert.match(
    layoutSource,
    /DashboardCapabilitiesProvider/,
    "dashboard locale layout must provide dashboard capabilities"
  );

  const providerSource = readSource("src/components/dashboard/dashboard-capabilities-provider.tsx");
  assert.match(
    providerSource,
    /usePathname/,
    "capability provider must scope capability fetching to dashboard routes"
  );
  assert.match(
    providerSource,
    /enabled:\s*enabled|useDashboardCapabilities\(isDashboardRoute\)/,
    "capability provider must avoid fetching capabilities on non-dashboard routes"
  );
  assert.match(
    providerSource,
    /isDashboardRoute\s*\?\s*query\.data\s*\?\?\s*DEFAULT_DASHBOARD_CAPABILITIES\s*:\s*DEFAULT_DASHBOARD_CAPABILITIES/,
    "capability provider must fall back to default capabilities outside dashboard routes even if query cache is warm"
  );
});

test("representative dashboard pages stop using raw non-localized navigation targets", () => {
  const gatewayListSource = readSource("src/app/[locale]/(dashboard)/gateways/page.tsx");
  const gatewayDetailSource = readSource(
    "src/app/[locale]/(dashboard)/gateways/[namespace]/[name]/page.tsx"
  );
  const routesSource = readSource("src/app/[locale]/(dashboard)/routes/page.tsx");
  const routeDetailSource = readSource(
    "src/app/[locale]/(dashboard)/routes/[kind]/[namespace]/[name]/page.tsx"
  );
  const referenceGrantsSource = readSource("src/app/[locale]/(dashboard)/reference-grants/page.tsx");
  const referenceGrantDetailSource = readSource(
    "src/app/[locale]/(dashboard)/reference-grants/[namespace]/[name]/page.tsx"
  );
  const backendTlsSource = readSource("src/app/[locale]/(dashboard)/backend-tls/page.tsx");
  const backendTlsDetailSource = readSource(
    "src/app/[locale]/(dashboard)/backend-tls/[namespace]/[name]/page.tsx"
  );
  const observabilitySource = readSource("src/app/[locale]/(dashboard)/observability/page.tsx");
  const aiServicesSource = readSource("src/app/[locale]/(dashboard)/ai/services/page.tsx");
  const aiTokenPoliciesSource = readSource("src/app/[locale]/(dashboard)/ai/token-policies/page.tsx");
  const grpcRouteCreateSource = readSource(
    "src/app/[locale]/(dashboard)/routes/create/grpcroute/page.tsx"
  );
  const tcpRouteCreateSource = readSource(
    "src/app/[locale]/(dashboard)/routes/create/tcproute/page.tsx"
  );
  const tlsRouteCreateSource = readSource(
    "src/app/[locale]/(dashboard)/routes/create/tlsroute/page.tsx"
  );
  const udpRouteCreateSource = readSource(
    "src/app/[locale]/(dashboard)/routes/create/udproute/page.tsx"
  );

  function assertUsesLocalizedLink(source, label) {
    assert.match(source, /LocalizedLink/, `${label} must use LocalizedLink`);
    assert.doesNotMatch(
      source,
      /import\s+Link\s+from\s+"next\/link";?/,
      `${label} must not import raw next/link`
    );
  }

  function assertUsesLocalizedRouter(source, label, barePushPattern, barePushMessage) {
    assert.match(
      source,
      /useLocalizedDashboardRouter/,
      `${label} must use the localized router wrapper`
    );
    assert.match(
      source,
      /const \{ push \} = useLocalizedDashboardRouter\(\)/,
      `${label} must destructure push from the localized router wrapper`
    );
    assert.doesNotMatch(source, barePushPattern, barePushMessage);
  }

  assertUsesLocalizedLink(gatewayListSource, "gateway list");
  assertUsesLocalizedLink(gatewayDetailSource, "gateway detail page");
  assertUsesLocalizedRouter(
    gatewayDetailSource,
    "gateway detail page",
    /router\.push\("\/gateways"\)/,
    "gateway delete flow must not push a bare /gateways path"
  );

  assertUsesLocalizedLink(routesSource, "routes list");
  assertUsesLocalizedLink(routeDetailSource, "route detail page");
  assertUsesLocalizedRouter(
    routeDetailSource,
    "route detail page",
    /router\.push\("\/routes"\)/,
    "route delete flow must not push a bare /routes path"
  );

  assertUsesLocalizedLink(referenceGrantsSource, "reference grants list");
  assertUsesLocalizedLink(referenceGrantDetailSource, "reference grant detail page");
  assertUsesLocalizedRouter(
    referenceGrantDetailSource,
    "reference grant detail page",
    /router\.push\("\/reference-grants"\)/,
    "reference grant delete flow must not push a bare /reference-grants path"
  );

  assertUsesLocalizedLink(backendTlsSource, "backend TLS list");
  assertUsesLocalizedLink(backendTlsDetailSource, "backend TLS detail page");
  assertUsesLocalizedRouter(
    backendTlsDetailSource,
    "backend TLS detail page",
    /router\.push\("\/backend-tls"\)/,
    "backend TLS delete flow must not push a bare /backend-tls path"
  );

  assertUsesLocalizedLink(observabilitySource, "observability page");
  assert.match(
    observabilitySource,
    /<a href="\/grafana-dashboard\.json" download>/,
    "observability page must keep the plain /grafana-dashboard.json download anchor"
  );
  assert.doesNotMatch(
    observabilitySource,
    /LocalizedLink href="\/grafana-dashboard\.json"/,
    "observability page must not localize the Grafana dashboard download anchor"
  );

  assertUsesLocalizedLink(aiServicesSource, "AI services page");
  assertUsesLocalizedLink(aiTokenPoliciesSource, "AI token policies page");

  for (const [label, source, routeKind] of [
    ["gRPC route creation", grpcRouteCreateSource, "GRPCRoute"],
    ["TCP route creation", tcpRouteCreateSource, "TCPRoute"],
    ["TLS route creation", tlsRouteCreateSource, "TLSRoute"],
    ["UDP route creation", udpRouteCreateSource, "UDPRoute"],
  ]) {
    assertUsesLocalizedLink(source, label);
    assertUsesLocalizedRouter(
      source,
      label,
      new RegExp("router\\.push\\(\\`\\/routes\\/" + routeKind),
      `${label} must not push a bare /routes/... path`
    );
  }
});

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
  assert.match(
    searchSource,
    /query === typedQuery|deferredSearch\.trim\(\)\s*===\s*search\.trim\(\)/,
    "GlobalSearch must gate result interaction until deferred and typed queries are aligned"
  );
  assert.match(
    searchSource,
    /void prefetch\(href\)|void prefetch\(selectedResult\.href\)/,
    "GlobalSearch must prewarm the active result when keyboard selection opens it"
  );
});

test("optional dashboard feature groups are gated by dedicated layouts", () => {
  for (const routePath of [
    "src/app/[locale]/(dashboard)/ai/overview/layout.tsx",
    "src/app/[locale]/(dashboard)/ai/services/layout.tsx",
    "src/app/[locale]/(dashboard)/ai/token-policies/layout.tsx",
    "src/app/[locale]/(dashboard)/ai/cost/layout.tsx",
    "src/app/[locale]/(dashboard)/ai/traces/layout.tsx",
    "src/app/[locale]/(dashboard)/ai/usage/layout.tsx",
    "src/app/[locale]/(dashboard)/wasm/plugins/layout.tsx",
    "src/app/[locale]/(dashboard)/chatbot/layout.tsx",
  ]) {
    assert.equal(
      existsSync(resolve(root, routePath)),
      true,
      `${routePath} must exist to gate disabled feature routes without 404s`
    );
  }
});

test("backend TLS and reference grant forms adopt the shared shell", () => {
  for (const [routePath, backHref] of [
    ["src/components/resources/backendtls-form.tsx", "/backend-tls"],
    ["src/components/resources/referencegrant-form.tsx", "/reference-grants"],
  ]) {
    const source = readSource(routePath);
    assert.match(source, /ResourceEditorShell/, `${routePath} must use the shared shell`);
    assert.match(
      source,
      new RegExp(`<ResourceEditorShell[\\s\\S]*backHref="${backHref}"`),
      `${routePath} must delegate localized back/cancel links through the shared shell`
    );
    assert.doesNotMatch(
      source,
      /LocalizedLink/,
      `${routePath} should delegate LocalizedLink wiring to the shared shell instead of mentioning it locally`
    );
    assert.doesNotMatch(
      source,
      /window\\.history\\.back\(/,
      `${routePath} must not use window.history.back`
    );
  }
});

test("HTTPRoute form adopts the shared dual-mode editor shell", () => {
  const httpRouteFormSource = readSource("src/components/resources/httproute-form.tsx");

  assert.match(
    httpRouteFormSource,
    /import\s+\{\s*ResourceEditorShell\s*\}\s+from\s+"\.\/resource-editor-shell";?/,
    "HTTPRoute form must import the shared dual-mode editor shell"
  );
  assert.match(
    httpRouteFormSource,
    /<ResourceEditorShell[\s\S]*backHref="\/routes"/,
    "HTTPRoute form must render through the shared dual-mode editor shell"
  );
  assert.doesNotMatch(
    httpRouteFormSource,
    /LocalizedLink/,
    "HTTPRoute form should delegate LocalizedLink wiring to the shared shell instead of mentioning it locally"
  );
  assert.doesNotMatch(
    httpRouteFormSource,
    /window\.history\.back\(/,
    "HTTPRoute form must not depend on window.history.back after shell adoption"
  );
});

test("HTTPRoute form interpolates route kind labels through the translation contract", () => {
  const httpRouteFormSource = readSource("src/components/resources/httproute-form.tsx");

  assert.match(
    httpRouteFormSource,
    /t\("create\.route\.title", \{ kind: "HTTPRoute" \}\)/,
    "HTTPRoute form title must pass the HTTPRoute kind interpolation value"
  );
  assert.match(
    httpRouteFormSource,
    /t\("create\.route\.description", \{ kind: "HTTPRoute" \}\)/,
    "HTTPRoute form description must pass the HTTPRoute kind interpolation value"
  );
  assert.match(
    httpRouteFormSource,
    /t\("create\.route\.(submit|save)", \{ kind: "HTTPRoute" \}\)/,
    "HTTPRoute form submit label must pass the HTTPRoute kind interpolation value"
  );
});

test("feature gate renders a controlled unavailable state", () => {
  const source = readSource("src/components/dashboard/capability-gate.tsx");
  assert.match(source, /FeatureUnavailable/, "capability gate must render the shared unavailable view");
  assert.match(source, /useDashboardCapabilitiesState/, "capability gate must read runtime capabilities");
  assert.match(source, /useDashboardCapabilities/, "capability gate must inspect capability query failures");
  assert.match(source, /404/, "capability gate must only treat missing capability endpoint as unavailable");
  assert.match(
    source,
    /capabilityQuery\.error\s*&&\s*!capabilityQuery\.data/,
    "capability gate must only bypass unavailable handling when there is no usable cached capability state"
  );
});

test("code block keeps Monaco behind explicit operator activation", () => {
  const source = readSource("src/components/dashboard/code-block.tsx");
  const monacoSource = readSource("src/components/dashboard/monaco-editor.tsx");
  const gatewayPage = readSource("src/app/[locale]/(dashboard)/gateways/[namespace]/[name]/page.tsx");
  const routePage = readSource("src/app/[locale]/(dashboard)/routes/[kind]/[namespace]/[name]/page.tsx");

  assert.match(
    source,
    /editorEnabled/,
    "CodeBlock must use explicit activation state before mounting Monaco"
  );
  assert.match(
    source,
    /dynamic\(\(\) => import\("\.\/monaco-editor"\)/,
    "CodeBlock must keep Monaco behind a dynamic client-only import"
  );
  assert.match(
    source,
    /editorEnabled\s*\?/,
    "CodeBlock must branch between preview mode and editor mode"
  );
  assert.match(
    source,
    /setEditorEnabled\(true\)/,
    "CodeBlock must expose an explicit activation path"
  );
  assert.match(
    monacoSource,
    /@monaco-editor\/react/,
    "monaco-editor.tsx must remain the Monaco import boundary"
  );
  assert.match(gatewayPage, /CodeBlock/, "gateway detail page must continue to consume CodeBlock");
  assert.match(routePage, /CodeBlock/, "route detail page must continue to consume CodeBlock");
  assert.doesNotMatch(gatewayPage, /MonacoEditor/, "gateway detail page must not import Monaco directly");
  assert.doesNotMatch(routePage, /MonacoEditor/, "route detail page must not import Monaco directly");
});

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
    routerSource,
    /router\.prefetch\(localizeDashboardPath\(locale, href\), options\)/,
    "useLocalizedDashboardRouter must localize prefetch targets and forward options"
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

test("resource forms use localized dashboard links for operator back navigation", () => {
  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  for (const { routePath, href, navigationOwner } of [
    {
      routePath: "src/components/resources/aiservice-form.tsx",
      href: "/ai/services",
      navigationOwner: "form",
    },
    {
      routePath: "src/components/resources/backendtls-form.tsx",
      href: "/backend-tls",
      navigationOwner: "shell",
    },
    {
      routePath: "src/components/resources/referencegrant-form.tsx",
      href: "/reference-grants",
      navigationOwner: "shell",
    },
    {
      routePath: "src/components/resources/httproute-form.tsx",
      href: "/routes",
      navigationOwner: "shell",
    },
    {
      routePath: "src/components/resources/tokenpolicy-form.tsx",
      href: "/ai/token-policies",
      navigationOwner: "form",
    },
  ]) {
    const source = readSource(routePath);
    const escapedHref = escapeRegExp(href);
    const localizedLinkPattern = new RegExp(`<LocalizedLink\\s+href="${escapedHref}"`, "g");

    if (navigationOwner === "shell") {
      assert.match(
        source,
        new RegExp(`<ResourceEditorShell[\\s\\S]*backHref="${escapedHref}"`),
        `${routePath} must delegate back and cancel navigation to ResourceEditorShell for ${href}`
      );
      assert.doesNotMatch(
        source,
        /LocalizedLink/,
        `${routePath} should not mention LocalizedLink directly after shared-shell adoption`
      );
    } else {
      assert.equal(
        source.match(localizedLinkPattern)?.length ?? 0,
        2,
        `${routePath} must render both back and cancel navigation with LocalizedLink to ${href}`
      );
    }
    assert.doesNotMatch(
      source,
      /import\s+Link\s+from\s+"next\/link";?/,
      `${routePath} must not import raw next/link`
    );

    for (const barePattern of [
      new RegExp(`<Link\\s+href="${escapedHref}"`),
      new RegExp(`<a\\s+href="${escapedHref}"`),
      new RegExp(`router\\.push\\("${escapedHref}"\\)`),
      new RegExp(`router\\.replace\\("${escapedHref}"\\)`),
      new RegExp(`window\\.location\\.href\\s*=\\s*"${escapedHref}"`),
      new RegExp(`window\\.location\\.assign\\("${escapedHref}"\\)`),
      new RegExp(`window\\.location\\.replace\\("${escapedHref}"\\)`),
    ]) {
      assert.doesNotMatch(
        source,
        barePattern,
        `${routePath} must not keep bare in-app navigation to ${href}`
      );
    }
  }
});

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

test("Gateway form adopts the shared dual-mode editor shell", () => {
  const gatewayFormSource = readSource("src/components/resources/gateway-form.tsx");

  assert.match(
    gatewayFormSource,
    /import\s+\{\s*ResourceEditorShell\s*\}\s+from\s+"\.\/resource-editor-shell";?/,
    "Gateway form must import the shared dual-mode editor shell"
  );
  assert.match(
    gatewayFormSource,
    /<ResourceEditorShell[\s\S]*backHref="\/gateways"/,
    "Gateway form must render through the shared dual-mode editor shell"
  );
  assert.doesNotMatch(
    gatewayFormSource,
    /LocalizedLink/,
    "Gateway form should delegate LocalizedLink wiring to the shared shell instead of mentioning it locally"
  );
  assert.doesNotMatch(
    gatewayFormSource,
    /window\.history\.back\(/,
    "Gateway form must not depend on window.history.back after shell adoption"
  );
});
