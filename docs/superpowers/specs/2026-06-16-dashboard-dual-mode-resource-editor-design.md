# Dashboard Dual-Mode Resource Editor Design

## Summary

This design fixes two related operator experience problems in the
`dashboard` repository:

1. `HTTPRoute` create surfaces currently render raw translation placeholders
   such as `Create {kind}` because the route-kind interpolation contract is not
   applied consistently.
2. Core resource create and edit pages only expose form-driven editing even
   though operators also need direct YAML control without leaving the page.

The scope is intentionally limited to the dashboard's core Gateway API
resource editors:

- `Gateway`
- `BackendTLSPolicy`
- `ReferenceGrant`
- `HTTPRoute`
- `GRPCRoute`
- `TCPRoute`
- `TLSRoute`
- `UDPRoute`

Both create and edit pages for those resources should support a consistent
`Form` / `YAML` mode switch with round-trip synchronization.

## Problem Statement

The current dashboard resource editors evolved independently. They share the
same high-level pattern:

- local React state models the form
- submit handlers stringify YAML inline
- page-level headers and actions are partially duplicated
- edit pages fetch the resource and pass transformed data into the form

That works for basic form creation, but it has three visible issues:

1. **Broken route-kind interpolation**
   `HTTPRouteForm` renders `t("create.route.title")`,
   `t("create.route.description")`, and `t("create.route.submit")` without the
   required `{ kind }` parameter, so operators can see the raw placeholder text
   instead of a real label.

2. **No YAML editing path on the primary resource pages**
   Operators creating or editing Gateways, Routes, Backend TLS policies, and
   Reference Grants cannot switch to raw YAML on the same screen. That is a
   gap for advanced users who want exact manifest control, copy/paste
   workflows, or parity with Kubernetes-native operations.

3. **No reusable manifest parsing boundary**
   YAML generation is currently embedded inside form components and parsing back
   from YAML to structured form state does not exist. Adding dual-mode editing
   by duplicating ad hoc parsing logic in every page would be brittle and hard
   to test.

## Goals

- Fix route-kind interpolation so route create pages never show raw `{kind}`
  placeholders.
- Add a consistent `Form` / `YAML` editing experience to create and edit pages
  for Gateways, Routes, Backend TLS, and Reference Grants.
- Support round-trip synchronization:
  `formData -> YAML -> formData`
  for the covered resource types.
- Preserve the existing localized routing behavior, submit endpoints, and
  success redirects.
- Keep the implementation isolated to the `dashboard` repository.
- Add regression coverage for parser behavior, mode switching contracts, and
  route-kind interpolation.

## Non-Goals

- No controlplane, dataplane, proto, website, or helm-charts changes.
- No attempt to build a generic editor for arbitrary Kubernetes resources.
- No support for multi-document YAML payloads in these page editors.
- No new create/edit mode for resource types outside this scope, including AI
  services, token policies, or Wasm plugins.
- No silent server-side coercion of invalid YAML back into form state.
- No redesign of dashboard layout, routing, or authentication.

## Scope

### Resources In Scope

- `Gateway`
- `BackendTLSPolicy`
- `ReferenceGrant`
- `HTTPRoute`
- `GRPCRoute`
- `TCPRoute`
- `TLSRoute`
- `UDPRoute`

### Page Flows In Scope

- Create pages for every scoped resource
- Edit pages for every scoped resource

### Behavior In Scope

- Shared mode switch between `Form` and `YAML`
- YAML parsing and form-data reconstruction
- YAML submission from YAML mode
- Form submission through generated YAML in Form mode
- Validation for resource identity drift on edit pages
- Translation interpolation fixes for route create labels

## Root Cause Findings

Static inspection of the current dashboard code shows:

1. Route create pages are inconsistent.
   Dedicated gRPC/TCP/TLS/UDP create pages pass the `{ kind }` interpolation
   value into translations, while `HTTPRouteForm` does not.

2. Gateway, Backend TLS, Reference Grant, and HTTPRoute form components all
   assemble YAML inline inside `handleSubmit`.
   That makes submission work but leaves no reusable `serialize` /
   `deserialize` boundary for round-trip mode switching.

3. Edit pages already have a useful source of structured data.
   They fetch live resources and convert them into resource-specific form data
   with helpers such as `gatewayResourceToFormData`,
   `backendTlsResourceToFormData`, `referenceGrantResourceToFormData`, and
   `httpRouteResourceToFormData`.

4. Route create pages are split across one shared `HTTPRouteForm` and four
   dedicated per-kind pages for the other route kinds.
   Dual-mode support therefore needs one shared experience contract with
   multiple resource-specific codecs rather than a single one-off fix.

## Proposed Approach

### 1. Introduce a Shared Resource Editor Shell

Add a shared client component that owns:

- active mode state: `form` or `yaml`
- current YAML text
- parse/validation errors for YAML mode
- synchronization transitions between form state and YAML text
- shared mode switch UI
- a single submit action surface

The shell should not know resource field details. Instead, it should receive a
resource-specific adapter contract:

- resource label and kind metadata
- initial `formData`
- `formData -> yaml`
- `yaml -> formData`
- submit target behavior
- edit-mode identity validation rules

This keeps the cross-resource behavior consistent while preserving each
resource's form model.

### 2. Split Resource-Specific Manifest Codecs Out of the Form Components

Each scoped resource editor should expose a small codec layer that owns:

- empty create defaults
- resource object to form data
- form data to manifest YAML
- manifest YAML to form data
- resource-kind and apiVersion validation

Expected examples:

- `gateway`
- `backendtlspolicy`
- `referencegrant`
- `httproute`
- `grpcroute`
- `tcproute`
- `tlsroute`
- `udproute`

The codec layer becomes the round-trip boundary used by both tests and UI.

### 3. Narrow the Responsibility of Existing Form Components

Current form components should stop being page controllers.

After the refactor, a scoped resource form component should only be
responsible for:

- rendering and mutating structured `formData`
- emitting structured updates upward
- displaying field-level form controls

It should no longer own:

- page title or page description selection
- direct `applyResource` calls
- full YAML string assembly in `handleSubmit`
- mode switching UI

This boundary keeps mode switching and YAML error handling out of already large
JSX components.

### 4. Define Exact Mode-Switch Behavior

#### Default entry mode

- Create pages open in `Form`
- Edit pages open in `Form`

#### Switching from Form to YAML

- The shell generates fresh YAML from the current structured `formData`
- The YAML editor is replaced with that canonical manifest text
- The switch is allowed even when the resource is partially filled out

This means YAML mode always starts from the current form state, not from a
stale earlier snapshot.

#### Switching from YAML to Form

- The shell parses the current YAML text
- It validates that the manifest is a single document with the expected
  resource type for the page
- It validates the required structural fields needed to rebuild the resource
  form state
- Only after successful parse and validation does the UI switch back to `Form`

If parsing or validation fails:

- remain in `YAML`
- show a clear inline error
- preserve the operator's current YAML text exactly

#### Source of truth rule

- In `Form` mode, the structured form state is authoritative
- In `YAML` mode, the edited YAML text is authoritative
- The latest authoritative source is what powers the next mode switch

This prevents partial merge behavior and keeps synchronization explicit.

### 5. Validate Identity Drift on Edit Pages

Edit pages currently preserve page identity by disabling some fields in form
mode, especially resource name and namespace.

YAML mode must not silently weaken that contract.

For edit pages:

- parsing YAML back into form state may succeed even if name or namespace was
  changed in the text
- submit must perform an identity check against the page's loaded resource
  identity
- if the manifest identity does not match the page identity, submission must be
  blocked with a clear error

The UI must not silently rewrite the operator's YAML.

### 6. Keep Submission Paths Aligned with Existing API Contracts

Submission behavior should remain compatible with the current backend surface:

- Form mode submit:
  serialize current `formData` to YAML, then call `applyResource`
- YAML mode submit:
  submit the current YAML text after resource-type and edit-identity validation

Existing success redirect behavior should remain intact:

- create flows should continue to navigate to the existing list or detail
  destinations already defined for that resource
- edit flows should continue to return to their existing detail pages

This batch changes the editing surface, not the API contract.

### 7. Standardize Route Editor Labels

All route create flows must render interpolated kind labels consistently:

- `Create HTTPRoute`
- `Create GRPCRoute`
- `Create TCPRoute`
- `Create TLSRoute`
- `Create UDPRoute`

The translation contract should remain parameterized. The fix is to ensure that
every route create entry point supplies the required `{ kind }` argument rather
than replacing the translation keys with hard-coded strings.

### 8. Support Route-Kind Coverage Without Over-Generalizing

Route resources should share the same dual-mode interaction model, but they do
not need to share a single form schema.

Planned approach:

- keep resource-specific route form data models where current route pages
  already diverge
- give each route kind its own codec
- reuse the same shared editor shell and error handling behavior across all
  route types

This avoids a risky "one route abstraction to rule them all" rewrite.

## Files In Scope

Expected primary files:

- new shared editor shell under `src/components/resources/`
- new shared YAML/manifest helpers under `src/lib/`
- existing resource editors under `src/components/resources/`
- scoped create/edit pages under `src/app/[locale]/(dashboard)/`
- translation files:
  - `src/messages/en.json`
  - `src/messages/zh.json`
- dashboard contract and unit tests under `test/`

Supporting workflow docs:

- `docs/superpowers/specs/2026-06-16-dashboard-dual-mode-resource-editor-design.md`
- a matching implementation plan under `docs/superpowers/plans/`

## Error Handling

The dual-mode editor must handle failures explicitly.

### YAML parse failures

- invalid YAML syntax should block switching back to `Form`
- the error must be shown inline in YAML mode
- the operator's YAML text must remain untouched

### Wrong resource kind

- a `Gateway` editor must reject `HTTPRoute` YAML
- a `ReferenceGrant` editor must reject `BackendTLSPolicy` YAML
- route-kind-specific editors must reject the wrong route kind

### Missing required structure

If the manifest omits fields required to rebuild form state, the shell should
stay in YAML mode and show a precise error instead of attempting to infer
missing values silently.

### Edit identity mismatch

If an edit page YAML payload changes the resource identity in a way the page is
not allowed to submit, submission must fail locally before the API request is
sent.

## Testing Strategy

Use source-level codec tests, contract tests, and the repository acceptance
command.

### Targeted Regression Coverage

Add or update tests to verify:

- route create labels interpolate `{ kind }` correctly, especially for
  `HTTPRoute`
- every scoped codec supports the expected round-trip shape:
  `formData -> YAML -> formData`
- invalid YAML stays in YAML mode with an error
- wrong-kind YAML is rejected for the current editor
- edit-page identity drift is rejected before submit
- representative create/edit pages for the scoped resources expose the shared
  dual-mode editor contract

### Full Verification

Run:

```bash
npm run check
```

This remains the final acceptance gate for dashboard work.

## Risks and Mitigations

### Risk: Round-trip parsers drop fields or array items

Mitigation:

- add codec-focused round-trip tests per resource kind
- keep parsing logic near the resource-specific form model instead of scattering
  it across UI components

### Risk: Shared shell becomes too generic and hard to reason about

Mitigation:

- keep the shared shell limited to mode switching, YAML state, and submit
  orchestration
- keep resource-specific parsing and serialization in codecs

### Risk: Edit-mode identity validation becomes inconsistent across resources

Mitigation:

- centralize edit identity checks in the resource adapter contract
- cover representative mismatch scenarios in tests

### Risk: Route kinds drift in behavior

Mitigation:

- use one shared interaction contract for all route create/edit pages
- keep explicit tests for each supported route kind

## Success Criteria

This design is successful when all of the following are true:

- `HTTPRoute` create pages no longer render raw `{kind}` placeholders
- create and edit pages for Gateways, Backend TLS, Reference Grants, and all
  supported Routes expose a consistent `Form` / `YAML` mode switch
- operators can edit YAML, switch back to form mode, and recover the matching
  structured form state for supported manifests
- invalid YAML or wrong-kind YAML is blocked locally with explicit inline
  errors
- edit pages prevent submission when YAML mode changes protected identity fields
- the existing localized navigation and submit endpoint behavior remains intact
- `npm run check` passes in the dashboard worktree
- no files outside the `dashboard` repository are modified
