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

test("dashboard keeps a single locale-aware provider entry point", () => {
  assert.equal(
    existsSync(resolve(root, "src/app/providers.tsx")),
    false,
    "provider composition should live only under the locale dashboard layout"
  );
  assert.equal(
    existsSync(resolve(root, "src/app/[locale]/(dashboard)/locale-layout-client.tsx")),
    true,
    "dashboard locale layout client must remain the shared provider entry point"
  );
});

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
