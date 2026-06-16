# Dashboard Navigation Runtime Optimization Design

## Summary

This design addresses the next visible source of navigation latency in the
`dashboard` repository after the locale-aware navigation fix landed.

The remaining delay is now mostly client-side runtime cost during page
transitions:

- cold route bundle loading on first navigation into frequently used pages
- cold React Query fetch setup for high-traffic resource views
- avoidable dashboard shell re-renders when the pathname changes

This batch stays intentionally narrow. It improves perceived transition speed
for approved dashboard hotspots by adding a small navigation prewarm layer and
by isolating pathname-sensitive shell rendering. It does not change the
controlplane, dataplane, or BFF APIs.

## Problem Statement

Dashboard page transitions are functionally correct, but they can still feel
sticky after a click even when locale redirects are gone.

Static inspection of the current dashboard points to two main sources of
runtime overhead:

1. **Cold transition work**
   Shared navigation surfaces such as `LocalizedLink`,
   `useLocalizedDashboardRouter`, `SidebarNav`, and `GlobalSearch` currently
   navigate directly to the next page. For hotspot pages, the route code and
   first data query both start cold at click time.

2. **Shell re-render pressure**
   `TopBar` currently combines pathname-derived title logic with interactive
   widgets such as `GlobalSearch`, the refresh toggle, and the theme toggle.
   When the route changes, those unrelated controls re-render with the shell.

The result is not a correctness bug. It is a responsiveness issue: clicks are
accepted immediately, but the next screen can take longer than necessary to
become visually stable.

## Goals

- Reduce perceived latency for dashboard page transitions in approved hotspot
  routes.
- Warm route code and a small set of matching React Query caches before or at
  navigation entry points when there is a high probability the user is going to
  navigate.
- Reduce unnecessary shell re-render work caused by pathname churn.
- Preserve current route behavior, locale behavior, and data correctness.
- Keep the change small, explicit, and testable inside the `dashboard`
  repository only.

## Non-Goals

- No controlplane, dataplane, or Next.js API route changes.
- No broad React Query architecture rewrite.
- No global default query option changes in `src/lib/query-client.ts`.
- No provider-tree surgery or dashboard layout redesign.
- No attempt to prewarm every dashboard route or every query.
- No modifications outside the `dashboard` repository.

## Approved Hotspot Scope

Only the following dashboard areas are eligible for targeted prewarm work in
this batch:

- `gateways` list and detail flows
- `routes` list and detail flows
- `backend-tls` list and detail flows
- `reference-grants` list and detail flows
- `ai/services`
- `ai/token-policies`

Pages outside this list may continue to use existing navigation behavior unless
they receive incidental benefits from smaller shell re-renders.

## Current Findings

The current codebase already has the right shared navigation seams for a narrow
optimization:

- `LocalizedLink` centralizes many in-app page links.
- `useLocalizedDashboardRouter` centralizes imperative localized navigation.
- `GlobalSearch` already uses a backend-powered search API instead of loading a
  large client-side corpus.
- `SidebarNav` is a high-frequency navigation surface that already routes
  through `LocalizedLink`.

The current query layer also makes scoped prewarming feasible without changing
backend contracts:

- hotspot resources already have stable hooks such as `useGateways`,
  `useRoutes`, `useRoute`, `useBackendTls`, `useReferenceGrants`,
  `useReferenceGrant`, `useAIServices`, and `useTokenPolicies`
- those hooks already express the canonical client fetch behavior and should
  remain the single source of truth for cache keys and fetch functions

## Proposed Approach

### 1. Add a Shared Navigation Prewarm Layer

Create a small client-side helper that can perform best-effort route prewarm
for a target dashboard href.

The helper should support two kinds of work:

- **route prefetch**
  Ask the App Router to prefetch the target route code for eligible internal
  dashboard pages.
- **query cache prewarm**
  For explicitly approved hotspot routes only, trigger the same React Query
  fetch logic those pages will soon need so the destination page can reuse warm
  cache state.

This helper must stay explicit and allowlisted. It should not infer behavior
from arbitrary URLs and it should not attempt to prewarm the full dashboard.

### 2. Keep Prewarm Best-Effort and Non-Blocking

Prewarm is an optimization, not part of the correctness path.

That means:

- navigation must still succeed if prewarm is skipped
- navigation must still succeed if prewarm throws or a fetch fails
- prewarm failures should be swallowed or downgraded to non-user-visible
  diagnostics
- imperative navigation should not wait on a full successful prewarm round-trip
  before starting the route transition

The primary goal is to overlap work earlier, not to add a new reliability
dependency.

### 3. Integrate Prewarm at Shared Navigation Entry Points

Wire the prewarm helper into the existing navigation seams instead of adding
one-off page logic everywhere.

Primary integration points:

- `src/components/dashboard/localized-link.tsx`
  Use hover/focus or equivalent early-intent signals to prewarm eligible
  localized dashboard targets.
- `src/lib/use-localized-dashboard-router.ts`
  Expose a shared imperative path that can trigger the same best-effort
  prewarm logic for programmatic navigation.
- `src/components/dashboard/global-search.tsx`
  Prewarm selected results before pushing to the destination route.
- `src/components/dashboard/sidebar-nav.tsx`
  Benefit automatically through `LocalizedLink` rather than introducing sidebar
  specific prewarm logic.

This keeps route warming behavior centralized and auditable.

### 4. Restrict Query Prewarm to Explicit Hotspots

Only the approved hotspot routes should receive query cache prewarming, and
each mapping should reuse existing hook semantics rather than inventing a new
fetch stack.

Planned scope:

- gateway list/detail transitions
- route list/detail transitions
- backend TLS list/detail transitions
- reference grant list/detail transitions
- AI services list/detail transitions where detail pages currently derive from
  the shared list data
- AI token policy list transitions only in the current route tree; detail
  prewarm stays out of scope until a real detail page exists

This design intentionally avoids:

- prewarming unrelated pages from generic links
- prewarming hidden tabs or entire route families
- changing stale time or retry policy to fake performance gains

### 5. Isolate Pathname-Sensitive Shell Rendering

Refactor `TopBar` into smaller client components so pathname-dependent work does
not force unrelated controls to re-render on every transition.

The split should preserve the current visual behavior while separating:

- the route title or breadcrumb logic that depends on pathname
- `GlobalSearch`
- the refresh toggle
- the theme toggle

The important outcome is narrower rendering boundaries, not a cosmetic redesign.

### 6. Defer Search Churn and Transition Navigation Work

`GlobalSearch` should remain responsive even while the shell is changing routes
or new results are flowing in.

Use:

- `useDeferredValue` for the search input path so keystroke handling is less
  sensitive to concurrent render pressure
- `startTransition` for navigation-triggering UI flows where marking the route
  update as a transition reduces visible UI contention

This should be applied conservatively. The goal is to reduce interaction jitter,
not to wrap every state change in transitions.

## Files In Scope

Expected primary files:

- `src/components/dashboard/localized-link.tsx`
- `src/components/dashboard/global-search.tsx`
- `src/components/dashboard/sidebar-nav.tsx`
- `src/components/dashboard/top-bar.tsx`
- `src/lib/use-localized-dashboard-router.ts`
- a new navigation prewarm helper under `src/lib/`
- supporting dashboard tests under `test/`

Supporting workflow docs:

- `docs/superpowers/specs/2026-06-16-dashboard-navigation-runtime-optimization-design.md`
- a matching implementation plan under `docs/superpowers/plans/`

## Error Handling

Prewarm behavior should follow these rules:

- Only internal localized dashboard routes are eligible.
- External URLs, API routes, static assets, and unsupported dashboard targets
  should bypass prewarm.
- Failures to prefetch route code or warm queries must not show user-facing
  error states by themselves.
- The destination page remains responsible for its own loading and error UI if
  the eventual live fetch still fails.

## Testing Strategy

Use source-level regression tests plus the repository acceptance command.

### Targeted Coverage

Add or update tests to verify:

- the prewarm matcher only targets the approved hotspot route set
- unsupported or non-dashboard routes do not trigger query prewarm
- shared navigation helpers preserve existing locale-aware navigation behavior
  while adding prewarm hooks
- pathname-sensitive `TopBar` logic is isolated from unrelated control behavior
  at the component boundary

Where pure route-matching or prewarm-selection logic is extracted into helpers,
test that logic directly with Node's native test runner.

### Final Acceptance

Run:

```bash
npm run check
```

This remains the final verification gate before claiming the dashboard
optimization is complete.

## Risks and Mitigations

### Risk: Prewarm Scope Expands Into Wasteful Background Traffic

Mitigation:

- keep an explicit allowlist of hotspot routes
- do not add blanket prewarm for every `LocalizedLink`
- reuse existing query hooks rather than inventing parallel fetch paths

### Risk: Prewarm Introduces Navigation Coupling or Regressions

Mitigation:

- treat prewarm as best-effort only
- avoid blocking navigation on prewarm completion
- preserve the existing router and link contracts

### Risk: Query Prewarm Causes Stale-Data or Double-Fetch Confusion

Mitigation:

- keep current query defaults unchanged
- warm the same cache keys the destination pages already use
- limit scope to hotspots where the likely next query is well understood

### Risk: TopBar Refactor Accidentally Changes Visible Behavior

Mitigation:

- keep the same user-facing controls and ordering
- isolate component boundaries without redesigning layout
- verify existing dashboard checks still pass

## Success Criteria

This design is successful when all of the following are true:

- approved hotspot navigations can prewarm route code and only their targeted
  query data
- shared navigation entry points remain locale-aware and keep current behavior
  if prewarm is skipped or fails
- dashboard shell transitions no longer force unnecessary re-render work across
  unrelated top-bar controls
- no backend or API contracts are changed
- `npm run check` passes in the dashboard worktree
- the resulting branch modifies only the `dashboard` repository, and unrelated
  repositories in the workspace remain unchanged
