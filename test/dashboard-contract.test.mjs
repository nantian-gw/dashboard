import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readSource(relativePath) {
  return readFileSync(resolve(root, relativePath), "utf8");
}

test("localized overview deep link is routable", () => {
  assert.equal(
    existsSync(resolve(root, "src/app/[locale]/(dashboard)/overview/page.tsx")),
    true,
    "/:locale/overview must resolve because dashboard navigation and login link to it"
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
  for (const routePath of [
    "src/app/api/controlplane/[[...slug]]/route.ts",
    "src/app/api/dataplane/[[...slug]]/route.ts",
  ]) {
    const source = readSource(routePath);
    assert.match(
      source,
      /content-length/i,
      `${routePath} must explicitly handle content-length`
    );
    assert.doesNotMatch(
      source,
      /Object\.fromEntries\(response\.headers\.entries\(\)\)/,
      `${routePath} must not forward upstream response headers blindly`
    );
  }
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

test("feature gate renders a controlled unavailable state", () => {
  const source = readSource("src/components/dashboard/capability-gate.tsx");
  assert.match(source, /FeatureUnavailable/, "capability gate must render the shared unavailable view");
  assert.match(source, /useDashboardCapabilitiesState/, "capability gate must read runtime capabilities");
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
