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
