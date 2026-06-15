# Dashboard Locale-Aware Navigation Fix Design

## Summary

This design fixes a specific source of perceived navigation latency in the
`dashboard` repository: many dashboard links and imperative navigations target
non-localized absolute paths such as `/gateways` instead of locale-aware paths
such as `/en/gateways` or `/zh/gateways`.

Because the dashboard routing model requires a locale prefix, those
non-localized navigations fall through `src/proxy.ts`, trigger extra middleware
and auth work, and then redirect to the final localized route. That adds an
avoidable round trip to a large portion of routine page transitions.

This batch is intentionally narrow. It fixes the navigation contract only. It
does not redesign data fetching, global search fan-out, or route rendering.

## Problem Statement

The dashboard currently mixes localized and non-localized navigation targets
across several navigation surfaces:

- sidebar plugin nav items use absolute paths without locale prefixes
- list/detail page links often use absolute paths without locale prefixes
- several `router.push()` calls after create/delete flows navigate to
  non-localized paths
- global search result items generate non-localized hrefs

The current runtime behavior still works because `src/proxy.ts` rewrites and
redirects these requests. However, the flow is slower than necessary:

1. client navigation targets `/foo`
2. request enters proxy
3. proxy/auth/i18n processing runs
4. user is redirected to `/{locale}/foo`
5. final page loads

That extra redirect chain is especially visible on high-frequency transitions
such as sidebar navigation and post-submit navigation.

## Goals

- Eliminate avoidable non-localized dashboard navigations.
- Keep all dashboard in-app navigation locale-aware by construction.
- Preserve the current route structure and auth behavior.
- Keep the change small, auditable, and easy to verify.
- Add regression coverage so non-localized dashboard links do not creep back in.

## Non-Goals

- No changes to `proxy.ts` authentication or i18n exclusion behavior.
- No React Query tuning, prefetching, hydration, or server-rendering changes.
- No global-search backend/API redesign.
- No route reorganization or locale model changes.
- No modifications outside the `dashboard` repository.

## Root Cause Findings

Static inspection identified three main classes of avoidable navigation drift:

1. **Plugin navigation drift**
   `dashboard/src/plugins/registry.ts` stores dashboard nav hrefs as
   non-localized absolute paths, and `SidebarNav` forwards them directly into
   `Link`.

2. **Page-level direct navigation drift**
   Multiple pages and forms call `router.push("/foo")` or render
   `Link href="/foo"` even though the live route space is nested under
   `/{locale}/...`.

3. **Generated navigation drift**
   `src/lib/global-search.ts` generates search result hrefs without locale
   prefixes, which means global-search navigation repeats the same redirect
   pattern.

## Proposed Approach

Introduce a single locale-aware navigation utility layer and route all touched
dashboard navigation through it.

### 1. Add Locale-Aware Path Helpers

Create a small helper module responsible for:

- normalizing relative dashboard paths
- prefixing them with a locale
- preserving already localized paths

The helper should be deterministic and string-based so it can be used from:

- client components
- contract tests
- generated navigation sources such as global search item builders

The helper should treat dashboard-internal paths as route-relative inputs such
as:

- `/overview`
- `/gateways/ns/name`
- `/ai/services`

and return:

- `/en/overview`
- `/zh/gateways/ns/name`

### 2. Keep Plugin Registry Locale-Neutral

`src/plugins/registry.ts` should continue expressing dashboard routes in a
locale-neutral form such as `/overview` and `/gateways`.

The registry is configuration, not a runtime router. Locale application should
happen at render time in `SidebarNav`, where the current locale is already
available from the pathname.

This keeps the plugin registry simple and avoids duplicating locale logic in
configuration files.

### 3. Update Navigation Call Sites

Update the touched high-frequency navigation surfaces to build localized paths
before calling `Link` or `router.push()`:

- sidebar navigation
- global search result opening
- list/detail/create/edit page links for touched core dashboard resources
- imperative create/delete success redirects in touched pages

The implementation should prefer reusing the same helper rather than open-coded
string concatenation in each page.

### 4. Preserve External or Non-Locale Assets

Do not rewrite links that should remain non-localized, such as:

- downloadable static assets like `/grafana-dashboard.json`
- API paths
- other non-app route targets

This batch only changes dashboard in-app page navigation.

## Files In Scope

Expected primary files:

- `src/lib/` locale-aware navigation helper module
- `src/components/dashboard/sidebar-nav.tsx`
- `src/components/dashboard/global-search.tsx`
- `src/lib/global-search.ts`
- selected pages/forms under `src/app/[locale]/(dashboard)/`
- selected resource form components under `src/components/resources/`
- `test/dashboard-contract.test.mjs`

Supporting workflow docs:

- `docs/superpowers/specs/2026-06-16-dashboard-locale-navigation-fix-design.md`
- matching implementation plan under `docs/superpowers/plans/`

## Testing Strategy

Use source-level contract tests and the repository check command.

### Targeted Regression Coverage

Add or update tests to verify:

- sidebar navigation no longer emits non-localized dashboard hrefs
- global search builds locale-aware result hrefs
- representative create/delete/detail flows no longer hard-code non-localized
  dashboard routes

### Full Verification

Run:

```bash
npm run check
```

This remains the final acceptance gate for dashboard work.

## Risks and Mitigations

### Risk: Mixed Relative/Localized Inputs Produce Double Prefixes

Mitigation:

- helper must detect already localized paths and return them unchanged
- tests should cover both locale-neutral and already localized inputs

### Risk: Missed Navigation Call Sites Leave User-Visible Inconsistency

Mitigation:

- add contract-test coverage for representative high-frequency navigation paths
- explicitly scan `Link` and `router.push()` call sites during implementation

### Risk: Changing Registry Behavior Breaks Active-State Matching

Mitigation:

- keep registry hrefs locale-neutral
- compute localized hrefs only where rendering or navigation occurs
- preserve current pathname-based active-state logic

## Success Criteria

This design is successful when all of the following are true:

- dashboard sidebar navigation targets locale-aware routes
- global search opens locale-aware routes
- touched create/delete flows no longer navigate through non-localized
  dashboard paths
- no new redirect is required just to add a locale prefix for touched in-app
  dashboard navigation
- `npm run check` passes in the dashboard worktree
- no files outside the `dashboard` repository are modified
