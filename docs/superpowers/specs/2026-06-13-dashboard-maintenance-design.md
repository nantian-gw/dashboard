# Dashboard Maintenance Design

## Summary

This design defines a low-risk maintenance batch for the Nantian Gateway Dashboard.
The goal is to remove an active Next.js 16 deprecation warning, eliminate duplicated provider wiring, align root-route behavior, and reconcile repository documentation with the behavior already implemented in code.

This batch is intentionally narrow.
It does not change product-facing dashboard workflows, backend API contracts, or query behavior.
It is a structure-and-consistency pass focused on reducing maintenance noise before larger refactors.

## Problem Statement

The repository currently has several sources of avoidable drift:

- Next.js 16 emits a deprecation warning because runtime request interception still lives in `src/middleware.ts`.
- Provider composition is duplicated in two files, which creates a maintenance fork even though only one path is active.
- The root route behavior is described differently across code and documentation.
- `AGENTS.md` contains implementation details that no longer match the current codebase.
- Lint output still reports at least one avoidable warning.

None of these issues are catastrophic on their own.
Together, they raise the cost of routine changes and make the codebase less trustworthy for future work.

## Goals

- Replace the deprecated middleware file convention with the Next.js 16 `proxy.ts` convention.
- Preserve the existing runtime behavior for auth gating, i18n exclusions, and optional HSTS headers.
- Keep a single shared provider composition entry point for dashboard pages.
- Make the root route resolve consistently to the default-locale login page.
- Update repository documentation so it reflects the current implementation.
- Remove the known lint warning in diagnostics.
- Add or update tests so the maintenance changes are enforced.

## Non-Goals

- No BFF proxy abstraction or route-helper extraction.
- No React Query policy redesign.
- No changes to AI, chatbot, or controlplane/dataplane business flows.
- No large-scale type-system cleanup.
- No changes to locale support, login UX, or authorization semantics beyond aligning existing behavior.

## Recommended Approach

Use a bounded maintenance pass that targets only the files directly responsible for drift.

This is the recommended middle path between a conservative rename-only change and a broader proxy refactor:

- It is safer than a cross-route infrastructure rewrite.
- It fixes the live deprecation signal instead of deferring it.
- It removes duplicated code rather than leaving known dead paths in place.
- It treats documentation mismatch as a defect, not a cleanup task for later.

## Approved Scope

This design covers four changes:

1. Migrate `src/middleware.ts` to `src/proxy.ts`.
2. Deduplicate provider composition and remove the unused duplicate provider file.
3. Clean up the diagnostics-page lint warning and any directly related dead code.
4. Align root-route behavior and documentation to the behavior already enforced at runtime.

## Architecture and File Responsibilities

### Request Interception

`src/proxy.ts` will become the single runtime entry point for:

- i18n path exclusions
- root-path redirect behavior
- login-page authenticated redirect behavior
- authenticated-route protection
- opt-in runtime HSTS injection

The file will preserve the existing logic from `src/middleware.ts`.
This is a convention migration, not a redesign of request flow.

### Root Route

`src/app/page.tsx` will redirect directly to `/${defaultLocale}/login`.

This matches the current runtime behavior in request interception and removes the split between:

- the app-level redirect to `/${defaultLocale}`
- the request-time redirect to `/${defaultLocale}/login`

The chosen canonical behavior is the current runtime entry point: default-locale login.

### Provider Composition

`src/app/[locale]/(dashboard)/locale-layout-client.tsx` will remain the single provider composition module for dashboard pages.

It will continue to own:

- `SessionProvider`
- `QueryClientProvider`
- `JotaiProvider`
- `NextIntlClientProvider`

`src/app/providers.tsx` will be removed because it duplicates the same logic and has no active call sites.

### Diagnostics Page

`src/app/[locale]/(dashboard)/diagnostics/page.tsx` will be cleaned up to remove the unused `DiagnosticIssue` import and any equally local dead code discovered while making that change.

This page is not being redesigned.
The goal is to restore a clean lint result for this area.

### Repository Documentation

`AGENTS.md` will be updated only where it contradicts current implementation.

Expected documentation fixes include:

- auth verification behavior on upstream/network failure
- actual login route/layout structure
- the use of `src/proxy.ts` instead of `src/middleware.ts`

This update is intentionally descriptive rather than normative.
It should reflect the code as shipped after this maintenance batch.

## Behavioral Constraints

The following behaviors must remain unchanged after the migration:

- unauthenticated protected routes redirect to localized login
- authenticated visits to localized login redirect to localized overview
- `/api`, `/healthz`, `/_next`, `/_vercel`, and static files remain excluded from i18n routing
- HSTS remains disabled by default and enabled only when `DASHBOARD_ENABLE_HSTS=true`
- dashboard locale handling remains `en` and `zh` with prefix always present

The following behavior will be made explicit and canonical:

- visiting `/` resolves to `/${defaultLocale}/login`

## Testing Strategy

The maintenance batch will be validated through targeted test updates plus the repository-wide check command.

### Contract and Runtime Tests

Update test coverage so it verifies:

- security-header and HSTS behavior through `src/proxy.ts`
- root-route redirect semantics consistent with the chosen canonical login redirect
- request interception file-path references use the new `proxy.ts` location

### Regression Expectations

The tests should catch:

- accidental behavior changes during middleware-to-proxy migration
- stale test loaders still reading the old file path
- future reintroduction of root-route semantic drift

### Full Verification

Run:

```bash
npm run check
```

This remains the completion gate because it exercises:

- app-router validation
- the Node.js test suite
- ESLint
- production build

## Risks and Mitigations

### Risk: Redirect Loop or Redirect Mismatch

Changing `src/app/page.tsx` could create a loop if it diverges from request interception rules.

Mitigation:

- keep proxy behavior unchanged
- make `src/app/page.tsx` match proxy behavior exactly
- cover root-route semantics in tests

### Risk: Silent Test Gaps After File Migration

Tests that dynamically load `src/middleware.ts` could stop validating the real runtime file if not updated carefully.

Mitigation:

- update all explicit path references from `middleware.ts` to `proxy.ts`
- keep the existing assertions intact where behavior is unchanged

### Risk: Provider Cleanup Removes an Implicit Dependency

Deleting the duplicate provider module could break an unobserved import path if usage was missed.

Mitigation:

- verify there are no call sites before deletion
- run lint, tests, and production build after removal

## Deferred Follow-Up

After this maintenance batch is complete, the next logical infrastructure task is a separate BFF proxy refactor that extracts shared auth/header/timeout/forwarding logic from:

- `src/app/api/controlplane/[[...slug]]/route.ts`
- `src/app/api/dataplane/[[...slug]]/route.ts`
- `src/app/api/chatbot/chat/route.ts`

That work is intentionally deferred so this batch stays low risk and easy to verify.

## Success Criteria

This design is successful when all of the following are true:

- Next.js build no longer reports the middleware-file deprecation warning.
- There is a single provider composition path for dashboard pages.
- Root-route behavior is consistent in code and tests.
- `AGENTS.md` matches the current implementation for the touched areas.
- The diagnostics lint warning is removed.
- `npm run check` passes on the resulting branch.
