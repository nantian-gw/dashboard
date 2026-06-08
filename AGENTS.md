# AGENTS.md — Nantian Gateway Dashboard

Next.js 16 App Router admin console. BFF proxies to controlplane (`:18081`) and dataplane (`:19080`).

## Commands

```bash
npm run dev          # Turbopack dev server on :3000
npm run build        # Production build (standalone output)
npm run check        # Full CI: validate-app-router → test → lint → build
npm run lint         # ESLint only
npm test             # Node.js native test runner (node --test)
```

**Always run `npm run check` before claiming work is done.** The order matters — `validate-app-router` must pass before tests.

## Architecture

```
Browser → Next.js API routes (BFF) → Controlplane (:18081) / Dataplane (:19080)
                ↓
         NextAuth (credentials, token-based)
```

- **`src/lib/api.ts`**: Typed fetch wrappers (`controlplane.get/post/put/delete`, `dataplane.get`). All client data fetching goes through these.
- **`src/lib/auth.ts`**: NextAuth v5 with credentials provider. Token verified against controlplane `/v1/summary`. **Fail-open**: network errors during verification allow login.
- **`src/lib/admin-models.ts`**: Data transformation layer — maps raw API payloads to UI row types (`mapGatewayResource`, `mapRoutesPayload`, `mapControlplaneSummary`, `mapNodePayload`, `mapDiagnostics`).
- **`src/lib/admin-urls.ts`**: Backend URLs and timeout config. Defaults: `CONTROLPLANE_ADMIN_URL=http://localhost:18081`, `DATAPLANE_ADMIN_URL=http://localhost:19080`.
- **`src/hooks/use-api/`**: React Query hooks (`useGateways`, `useNodes`, `useDiagnostics`, etc.). All hooks re-exported from `src/hooks/use-api.ts`.

## API Proxy Rules (critical)

The controlplane/dataplane proxy routes (`src/app/api/controlplane/[[...slug]]/route.ts`, `src/app/api/dataplane/[[...slug]]/route.ts`) have **legacy compatibility handlers**:

- `/api/controlplane/v1/gateways` → aggregates resources + summary + routes, returns transformed payload
- `/api/controlplane/v1/backend-tls` → transforms backend TLS policies
- `/api/controlplane/v1/diagnostics` → aggregates controlplane + dataplane summaries
- `/api/dataplane/v1/nodes` → **redirects to controlplane** `/v1/nodes` (not dataplane)

**Proxy strips these response headers**: `connection`, `content-encoding`, `content-length`, `transfer-encoding`. Never forward upstream headers blindly.

New hooks should use the canonical `/v1/resources?kind=X` endpoints, not the legacy ones.

## Routing & i18n

- Locales: `en`, `zh` (default: `en`). Locale prefix always present (`/en/...`, `/zh/...`).
- Root `/` redirects to `/{defaultLocale}`.
- Login page at `/login` is **outside** the locale layout — hardcoded English messages.
- `next-intl` timezone is fixed to `UTC` everywhere (server + client). This is enforced by `validate-app-router.mjs`.
- Middleware (`src/proxy.ts`) excludes `/api`, `/healthz`, `/_next`, `/_vercel`, and static files from i18n routing.

## State Management

- **Jotai** (`src/lib/store.ts`): Global UI state (search query, locale, modal, refresh toggle)
- **TanStack React Query**: All server data. Default: 10s stale time, 2 retries, 30s refetch interval for live data (gateways, nodes, diagnostics).
- **next-themes**: Dark/light mode via `ThemeProvider` in root layout.

## UI

- shadcn/ui (new-york style, slate base, CSS variables). Components in `src/components/ui/`.
- Tailwind CSS v4 with `@theme` block in `globals.css` (not tailwind.config.ts theme).
- Custom CSS tokens in `src/styles/tokens.css` (AI-specific colors).
- Charts: recharts, wrapped in `src/components/charts/`.

## Contract Tests

Tests live in `test/` as `.mjs` files using Node's native test runner. They verify:
- `dashboard-contract.test.mjs`: Route existence, API proxy behavior (header stripping, legacy routing), hook endpoint usage
- `admin-models.test.mjs`: Data transformation correctness (listener health derivation, node readiness, etc.)
- `global-search.test.mjs`: Search item generation and filtering

Tests transpile TypeScript at runtime using the `typescript` package — no build step needed.

## Conventions

- `@/*` = `./src/*`
- `"use client"` required on files using hooks, context, or browser APIs. Enforced by `validate-app-router.mjs` for `use-api.ts`.
- `server.mjs` is excluded from linting and type checking.
- `dompurify` and `postcss` have pinned versions in `overrides` — do not remove.
- `next.config.ts`: `output: "standalone"`, `transpilePackages: ["recharts"]`, `optimizePackageImports: ["lucide-react"]`.
- Docker: multi-stage build, runs as `node` user, `AUTH_TRUST_HOST=true` required for NextAuth behind reverse proxy.
