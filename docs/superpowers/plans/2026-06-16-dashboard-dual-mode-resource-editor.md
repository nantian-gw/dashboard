# Dashboard Dual-Mode Resource Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add form/YAML dual-mode create and edit flows for Gateway, BackendTLSPolicy, ReferenceGrant, and all supported Route resources, while fixing the raw `{kind}` placeholder bug on HTTPRoute create screens.

**Architecture:** Introduce one shared dual-mode editor shell plus a pure YAML manifest helper and a pure editor-state helper. Each resource gets a codec boundary for `formData <-> YAML`, while existing resource forms are narrowed to controlled field editors; non-HTTP route create pages are converted from page-local forms into reusable resource editor components so the generic route edit page can dispatch by route kind.

**Tech Stack:** Next.js 16 App Router, React client components, `next-intl`, `js-yaml`, TanStack React Query, Node.js native test runner, TypeScript

---

## File Structure

- Create: `src/lib/resource-manifest.ts`
  Shared single-document YAML parsing, manifest validation, and identity extraction helpers.
- Create: `src/components/resources/resource-editor-types.ts`
  Shared editor mode, identity, and codec contracts.
- Create: `src/components/resources/resource-editor-state.ts`
  Pure helper functions for `form -> yaml`, `yaml -> form`, and edit-identity validation.
- Create: `src/components/resources/resource-editor-shell.tsx`
  Shared `Form` / `YAML` shell that uses the pure state helpers and renders a YAML textarea plus shared actions.
- Create: `src/components/resources/gateway-form-codec.ts`
  Gateway manifest round-trip helpers.
- Create: `src/components/resources/backendtls-form-codec.ts`
  BackendTLSPolicy manifest round-trip helpers.
- Create: `src/components/resources/referencegrant-form-codec.ts`
  ReferenceGrant manifest round-trip helpers.
- Create: `src/components/resources/httproute-form-codec.ts`
  HTTPRoute manifest round-trip helpers.
- Create: `src/components/resources/grpcroute-form.tsx`
  Reusable GRPCRoute editor component for create and edit flows.
- Create: `src/components/resources/grpcroute-form-codec.ts`
  GRPCRoute manifest round-trip helpers.
- Create: `src/components/resources/tcproute-form.tsx`
  Reusable TCPRoute editor component for create and edit flows.
- Create: `src/components/resources/tcproute-form-codec.ts`
  TCPRoute manifest round-trip helpers.
- Create: `src/components/resources/tlsroute-form.tsx`
  Reusable TLSRoute editor component for create and edit flows.
- Create: `src/components/resources/tlsroute-form-codec.ts`
  TLSRoute manifest round-trip helpers.
- Create: `src/components/resources/udproute-form.tsx`
  Reusable UDPRoute editor component for create and edit flows.
- Create: `src/components/resources/udproute-form-codec.ts`
  UDPRoute manifest round-trip helpers.
- Create: `test/resource-editor-state.test.mjs`
  Pure unit coverage for YAML parsing, wrong-kind rejection, and edit-identity checks.
- Create: `test/resource-editor-codecs.test.mjs`
  Round-trip coverage for all scoped resource codecs.
- Modify: `src/components/resources/gateway-form.tsx`
  Convert to a shell-backed Gateway editor with controlled form data and localized back/cancel links.
- Modify: `src/components/resources/backendtls-form.tsx`
  Convert to a shell-backed BackendTLSPolicy editor with controlled form data.
- Modify: `src/components/resources/referencegrant-form.tsx`
  Convert to a shell-backed ReferenceGrant editor with controlled form data.
- Modify: `src/components/resources/httproute-form.tsx`
  Convert to a shell-backed HTTPRoute editor and fix route-kind interpolation.
- Modify: `src/app/[locale]/(dashboard)/gateways/[namespace]/[name]/edit/page.tsx`
  Import Gateway form-data conversion from the new codec file.
- Modify: `src/app/[locale]/(dashboard)/backend-tls/[namespace]/[name]/edit/page.tsx`
  Import Backend TLS form-data conversion from the new codec file.
- Modify: `src/app/[locale]/(dashboard)/reference-grants/[namespace]/[name]/edit/page.tsx`
  Import ReferenceGrant form-data conversion from the new codec file.
- Modify: `src/app/[locale]/(dashboard)/routes/[kind]/[namespace]/[name]/edit/page.tsx`
  Dispatch route editors by kind instead of hardcoding `HTTPRouteForm`.
- Modify: `src/app/[locale]/(dashboard)/routes/create/grpcroute/page.tsx`
  Reduce to a thin page wrapper around the new reusable GRPCRoute editor component.
- Modify: `src/app/[locale]/(dashboard)/routes/create/tcproute/page.tsx`
  Reduce to a thin page wrapper around the new reusable TCPRoute editor component.
- Modify: `src/app/[locale]/(dashboard)/routes/create/tlsroute/page.tsx`
  Reduce to a thin page wrapper around the new reusable TLSRoute editor component.
- Modify: `src/app/[locale]/(dashboard)/routes/create/udproute/page.tsx`
  Reduce to a thin page wrapper around the new reusable UDPRoute editor component.
- Modify: `src/messages/en.json`
  Add shared dual-mode shell labels and route edit strings.
- Modify: `src/messages/zh.json`
  Add shared dual-mode shell labels and route edit strings.
- Modify: `test/dashboard-contract.test.mjs`
  Add source-level regression checks for shared shell adoption, localized back navigation, route editor dispatch, and route create page delegation.

---

### Task 1: Capture Repo Baselines And Build The Shared Dual-Mode Editor Foundation

**Files:**
- Create: `test/resource-editor-state.test.mjs`
- Create: `src/lib/resource-manifest.ts`
- Create: `src/components/resources/resource-editor-types.ts`
- Create: `src/components/resources/resource-editor-state.ts`
- Create: `src/components/resources/resource-editor-shell.tsx`
- Modify: `src/messages/en.json`
- Modify: `src/messages/zh.json`

- [ ] **Step 1: Capture unrelated-repository baselines before editing code**

Run:

```bash
mkdir -p /tmp/dashboard-dual-mode-baseline
git -C /root/nantian-gw/gateway status --porcelain=v1 > /tmp/dashboard-dual-mode-baseline/gateway.status
git -C /root/nantian-gw/dataplane status --porcelain=v1 > /tmp/dashboard-dual-mode-baseline/dataplane.status
git -C /root/nantian-gw/proto status --porcelain=v1 > /tmp/dashboard-dual-mode-baseline/proto.status
git -C /root/nantian-gw/website status --porcelain=v1 > /tmp/dashboard-dual-mode-baseline/website.status
git -C /root/nantian-gw/helm-charts status --porcelain=v1 > /tmp/dashboard-dual-mode-baseline/helm-charts.status
```

Expected: command exits `0` and writes five status snapshot files under `/tmp/dashboard-dual-mode-baseline`.

- [ ] **Step 2: Write the failing pure editor-state test**

Create `test/resource-editor-state.test.mjs`:

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

function loadTsModule(relativePath, stubs = {}) {
  const source = readFileSync(resolve(root, relativePath), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
    fileName: relativePath,
  });

  const cjsModule = { exports: {} };
  vm.runInNewContext(outputText, {
    exports: cjsModule.exports,
    module: cjsModule,
    require: (specifier) => {
      if (specifier in stubs) return stubs[specifier];
      return require(specifier);
    },
    console,
  });

  return cjsModule.exports;
}

test("buildYamlDraft serializes the current form data without mutating it", () => {
  const { buildYamlDraft } = loadTsModule("src/components/resources/resource-editor-state.ts");
  const formData = { name: "edge", namespace: "platform" };
  const codec = {
    kind: "Gateway",
    apiVersion: "gateway.networking.k8s.io/v1",
    toYaml: (value) =>
      `apiVersion: gateway.networking.k8s.io/v1\nkind: Gateway\nmetadata:\n  name: ${value.name}\n  namespace: ${value.namespace}\n`,
    fromYaml: () => {
      throw new Error("not used");
    },
    getIdentity: (value) => ({ name: value.name, namespace: value.namespace }),
  };

  const yamlText = buildYamlDraft(codec, formData);

  assert.match(yamlText, /kind: Gateway/);
  assert.deepEqual(formData, { name: "edge", namespace: "platform" });
});

test("parseFormDraftFromYaml keeps YAML mode on invalid YAML", () => {
  const { parseFormDraftFromYaml } = loadTsModule("src/components/resources/resource-editor-state.ts");
  const codec = {
    kind: "Gateway",
    apiVersion: "gateway.networking.k8s.io/v1",
    toYaml: () => "",
    fromYaml: () => {
      throw new Error("Invalid YAML: unexpected end of stream");
    },
    getIdentity: () => ({ name: "edge", namespace: "platform" }),
  };

  const result = parseFormDraftFromYaml(codec, "apiVersion: gateway.networking.k8s.io/v1\nkind:");

  assert.equal(result.ok, false);
  assert.match(result.error, /unexpected end of stream/);
});

test("parseFormDraftFromYaml returns form data when the manifest kind matches", () => {
  const { parseFormDraftFromYaml } = loadTsModule("src/components/resources/resource-editor-state.ts");
  const codec = {
    kind: "ReferenceGrant",
    apiVersion: "gateway.networking.k8s.io/v1beta1",
    toYaml: () => "",
    fromYaml: () => ({
      name: "allow-shop",
      namespace: "shared",
      froms: [{ group: "gateway.networking.k8s.io", kind: "HTTPRoute", namespace: "shop" }],
      tos: [{ group: "", kind: "Service", name: "store" }],
    }),
    getIdentity: (value) => ({ name: value.name, namespace: value.namespace }),
  };

  const result = parseFormDraftFromYaml(codec, "kind: ReferenceGrant");

  assert.equal(result.ok, true);
  assert.deepEqual(result.formData, {
    name: "allow-shop",
    namespace: "shared",
    froms: [{ group: "gateway.networking.k8s.io", kind: "HTTPRoute", namespace: "shop" }],
    tos: [{ group: "", kind: "Service", name: "store" }],
  });
});

test("assertEditIdentityMatch rejects YAML identity drift on edit pages", () => {
  const { assertEditIdentityMatch } = loadTsModule("src/components/resources/resource-editor-state.ts");

  assert.equal(
    assertEditIdentityMatch(
      { name: "edge", namespace: "platform" },
      { name: "edge", namespace: "platform" }
    ),
    null
  );

  assert.match(
    assertEditIdentityMatch(
      { name: "edge", namespace: "platform" },
      { name: "edge-copy", namespace: "platform" }
    ),
    /must stay on platform\/edge/
  );
});
```

- [ ] **Step 3: Run the focused test to verify it fails**

Run:

```bash
node --test test/resource-editor-state.test.mjs
```

Expected: FAIL with `ENOENT` for `src/components/resources/resource-editor-state.ts`.

- [ ] **Step 4: Implement the shared manifest and editor-state foundation**

Create `src/lib/resource-manifest.ts`:

```ts
import yaml from "js-yaml";

export class ResourceManifestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResourceManifestError";
  }
}

export type ManifestRecord = Record<string, unknown>;

export function parseSingleManifest(yamlText: string): ManifestRecord {
  const docs = yaml.loadAll(yamlText);
  if (docs.length !== 1) {
    throw new ResourceManifestError("Expected exactly one YAML document.");
  }

  const [doc] = docs;
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) {
    throw new ResourceManifestError("Expected a YAML object document.");
  }

  return doc as ManifestRecord;
}

export function assertManifestKind(
  manifest: ManifestRecord,
  expectedApiVersion: string,
  expectedKind: string
): void {
  if (manifest.apiVersion !== expectedApiVersion) {
    throw new ResourceManifestError(`Expected apiVersion ${expectedApiVersion}.`);
  }

  if (manifest.kind !== expectedKind) {
    throw new ResourceManifestError(`Expected kind ${expectedKind}.`);
  }
}

export function readManifestIdentity(manifest: ManifestRecord): {
  name: string;
  namespace: string;
} {
  const metadata = (manifest.metadata ?? {}) as Record<string, unknown>;
  const name = String(metadata.name ?? "");
  const namespace = String(metadata.namespace ?? "");

  if (!name.trim()) {
    throw new ResourceManifestError("Manifest metadata.name is required.");
  }

  if (!namespace.trim()) {
    throw new ResourceManifestError("Manifest metadata.namespace is required.");
  }

  return { name, namespace };
}
```

Create `src/components/resources/resource-editor-types.ts`:

```ts
export type ResourceEditorMode = "form" | "yaml";

export interface ResourceIdentity {
  name: string;
  namespace: string;
}

export interface ResourceEditorCodec<TFormData> {
  apiVersion: string;
  kind: string;
  toYaml(formData: TFormData): string;
  fromYaml(yamlText: string): TFormData;
  getIdentity(formData: TFormData): ResourceIdentity;
}
```

Create `src/components/resources/resource-editor-state.ts`:

```ts
import type { ResourceEditorCodec, ResourceIdentity } from "./resource-editor-types";

export function buildYamlDraft<TFormData>(
  codec: ResourceEditorCodec<TFormData>,
  formData: TFormData
): string {
  return codec.toYaml(formData);
}

export function parseFormDraftFromYaml<TFormData>(
  codec: ResourceEditorCodec<TFormData>,
  yamlText: string
): { ok: true; formData: TFormData } | { ok: false; error: string } {
  try {
    return { ok: true, formData: codec.fromYaml(yamlText) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invalid YAML.",
    };
  }
}

export function assertEditIdentityMatch(
  expectedIdentity: ResourceIdentity | null,
  actualIdentity: ResourceIdentity
): string | null {
  if (!expectedIdentity) return null;
  if (
    expectedIdentity.name === actualIdentity.name &&
    expectedIdentity.namespace === actualIdentity.namespace
  ) {
    return null;
  }

  return `YAML identity must stay on ${expectedIdentity.namespace}/${expectedIdentity.name} while editing this resource.`;
}
```

Create `src/components/resources/resource-editor-shell.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { LocalizedLink } from "@/components/dashboard/localized-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { ResourceEditorCodec, ResourceIdentity, ResourceEditorMode } from "./resource-editor-types";
import {
  assertEditIdentityMatch,
  buildYamlDraft,
  parseFormDraftFromYaml,
} from "./resource-editor-state";

interface ResourceEditorShellProps<TFormData> {
  title: string;
  description: string;
  backHref: string;
  submitLabel: string;
  submittingLabel: string;
  formData: TFormData;
  onFormDataChange: (next: TFormData) => void;
  codec: ResourceEditorCodec<TFormData>;
  expectedEditIdentity: ResourceIdentity | null;
  isSubmitting: boolean;
  submitError: string;
  onSubmitManifest: (yamlText: string) => Promise<void>;
  renderForm: (props: {
    value: TFormData;
    onChange: (next: TFormData) => void;
  }) => React.ReactNode;
}

export function ResourceEditorShell<TFormData>({
  title,
  description,
  backHref,
  submitLabel,
  submittingLabel,
  formData,
  onFormDataChange,
  codec,
  expectedEditIdentity,
  isSubmitting,
  submitError,
  onSubmitManifest,
  renderForm,
}: ResourceEditorShellProps<TFormData>) {
  const t = useTranslations("resource_editor");
  const [mode, setMode] = useState<ResourceEditorMode>("form");
  const [yamlText, setYamlText] = useState(() => buildYamlDraft(codec, formData));
  const [yamlError, setYamlError] = useState("");

  const switchMode = (nextMode: string) => {
    if (nextMode === "yaml") {
      setYamlText(buildYamlDraft(codec, formData));
      setYamlError("");
      setMode("yaml");
      return;
    }

    const parsed = parseFormDraftFromYaml(codec, yamlText);
    if (!parsed.ok) {
      setYamlError(parsed.error);
      return;
    }

    onFormDataChange(parsed.formData);
    setYamlError("");
    setMode("form");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (mode === "form") {
      await onSubmitManifest(buildYamlDraft(codec, formData));
      return;
    }

    const parsed = parseFormDraftFromYaml(codec, yamlText);
    if (!parsed.ok) {
      setYamlError(parsed.error);
      return;
    }

    const identityError = assertEditIdentityMatch(
      expectedEditIdentity,
      codec.getIdentity(parsed.formData)
    );
    if (identityError) {
      setYamlError(identityError);
      return;
    }

    await onSubmitManifest(yamlText);
  };

  return (
    <div className="flex justify-center py-8">
      <div className="w-full max-w-5xl px-4">
        <div className="mb-8 flex items-center gap-4">
          <LocalizedLink href={backHref}>
            <Button variant="ghost" size="icon">
              <span className="h-4 w-4">&#8592;</span>
            </Button>
          </LocalizedLink>
          <div>
            <h1 className="text-3xl font-bold">{title}</h1>
            <p className="text-muted-foreground">{description}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6">
          <Tabs value={mode} onValueChange={switchMode}>
            <TabsList>
              <TabsTrigger value="form">{t("form_tab")}</TabsTrigger>
              <TabsTrigger value="yaml">{t("yaml_tab")}</TabsTrigger>
            </TabsList>
            <TabsContent value="form">{renderForm({ value: formData, onChange: onFormDataChange })}</TabsContent>
            <TabsContent value="yaml">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t("yaml_tab")}</CardTitle>
                  <CardDescription>{t("yaml_help")}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="resource-yaml">{codec.kind}</Label>
                    <Textarea
                      id="resource-yaml"
                      value={yamlText}
                      onChange={(event) => setYamlText(event.target.value)}
                      className="min-h-[480px] font-mono text-sm"
                      spellCheck={false}
                    />
                  </div>
                  {(yamlError || submitError) && (
                    <p className="text-sm text-red-600">{yamlError || submitError}</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {mode === "form" && submitError ? (
            <p className="text-sm text-red-600">{submitError}</p>
          ) : null}

          <div className="flex items-center justify-between">
            <LocalizedLink href={backHref}>
              <Button type="button" variant="outline">
                {t("cancel")}
              </Button>
            </LocalizedLink>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? submittingLabel : submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

Update `src/messages/en.json` with:

```json
"resource_editor": {
  "form_tab": "Form",
  "yaml_tab": "YAML",
  "yaml_help": "Edit a single resource manifest here. Switch back to Form to rebuild the structured editor.",
  "cancel": "Cancel"
}
```

Update `src/messages/zh.json` with:

```json
"resource_editor": {
  "form_tab": "表单",
  "yaml_tab": "YAML",
  "yaml_help": "在这里编辑单个资源清单。切回表单模式时会重新构建结构化字段。",
  "cancel": "取消"
}
```

- [ ] **Step 5: Run the shared editor-state test to verify it passes**

Run:

```bash
node --test test/resource-editor-state.test.mjs
```

Expected: PASS with `4` passing tests and `0` failures.

- [ ] **Step 6: Commit the shared foundation**

Run:

```bash
git add \
  test/resource-editor-state.test.mjs \
  src/lib/resource-manifest.ts \
  src/components/resources/resource-editor-types.ts \
  src/components/resources/resource-editor-state.ts \
  src/components/resources/resource-editor-shell.tsx \
  src/messages/en.json \
  src/messages/zh.json
git commit -m "feat(dashboard): add shared dual-mode resource editor shell"
```

---

### Task 2: Refactor Gateway Into A Shell-Backed Dual-Mode Editor

**Files:**
- Create: `src/components/resources/gateway-form-codec.ts`
- Create: `test/resource-editor-codecs.test.mjs`
- Modify: `src/components/resources/gateway-form.tsx`
- Modify: `src/app/[locale]/(dashboard)/gateways/[namespace]/[name]/edit/page.tsx`
- Modify: `test/dashboard-contract.test.mjs`

- [ ] **Step 1: Write the failing Gateway codec and contract tests**

Create `test/resource-editor-codecs.test.mjs`:

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

function loadTsModule(relativePath, stubs = {}) {
  const source = readFileSync(resolve(root, relativePath), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
    fileName: relativePath,
  });

  const cjsModule = { exports: {} };
  vm.runInNewContext(outputText, {
    exports: cjsModule.exports,
    module: cjsModule,
    require: (specifier) => {
      if (specifier in stubs) return stubs[specifier];
      return require(specifier);
    },
    console,
  });

  return cjsModule.exports;
}

const commonStubs = {
  "@/lib/admin-models": {
    unwrapResource: (value) => value,
  },
};

test("gateway codec round-trips listeners with TLS certificate refs", () => {
  const { gatewayFormDataToManifest, gatewayManifestToFormData } = loadTsModule(
    "src/components/resources/gateway-form-codec.ts",
    commonStubs
  );

  const formData = {
    name: "edge",
    namespace: "platform",
    gatewayClass: "nantian",
    listeners: [
      {
        name: "https",
        port: 443,
        protocol: "HTTPS",
        tls: {
          mode: "Terminate",
          certificateRefs: [
            {
              name: "edge-cert",
              namespace: "platform",
              kind: "Secret",
              group: "",
            },
          ],
        },
      },
    ],
  };

  const yamlText = gatewayFormDataToManifest(formData);
  assert.match(yamlText, /kind: Gateway/);
  assert.deepEqual(gatewayManifestToFormData(yamlText), formData);
});
```

Append to `test/dashboard-contract.test.mjs`:

```js
test("Gateway form adopts the shared dual-mode editor shell", () => {
  const gatewayFormSource = readSource("src/components/resources/gateway-form.tsx");

  assert.match(
    gatewayFormSource,
    /ResourceEditorShell/,
    "Gateway form must render through the shared dual-mode editor shell"
  );
  assert.match(
    gatewayFormSource,
    /LocalizedLink/,
    "Gateway form must use localized back and cancel navigation"
  );
  assert.doesNotMatch(
    gatewayFormSource,
    /window\\.history\\.back\\(/,
    "Gateway form must not depend on window.history.back after shell adoption"
  );
});
```

- [ ] **Step 2: Run the focused Gateway tests to verify they fail**

Run:

```bash
node --test test/resource-editor-codecs.test.mjs test/dashboard-contract.test.mjs
```

Expected: FAIL with `ENOENT` for `src/components/resources/gateway-form-codec.ts`.

- [ ] **Step 3: Implement the Gateway codec and shell-backed form**

Create `src/components/resources/gateway-form-codec.ts`:

```ts
import type { ManagedResource, KubernetesResource } from "@/lib/admin-models";
import { unwrapResource } from "@/lib/admin-models";
import {
  assertManifestKind,
  parseSingleManifest,
  readManifestIdentity,
  type ManifestRecord,
} from "@/lib/resource-manifest";
import type { ResourceEditorCodec } from "./resource-editor-types";
import type { GatewayFormData } from "./gateway-form";

export function createEmptyGatewayFormData(): GatewayFormData {
  return {
    name: "",
    namespace: "default",
    gatewayClass: "nantian",
    listeners: [{ port: 80, protocol: "HTTP", name: "http" }],
  };
}

export function gatewayResourceToFormData(
  resource: ManagedResource | KubernetesResource
): GatewayFormData {
  const unwrapped = unwrapResource(resource) as ManifestRecord;
  const spec = (unwrapped.spec ?? {}) as Record<string, any>;
  const metadata = (unwrapped.metadata ?? {}) as Record<string, any>;

  return {
    name: String(metadata.name ?? ""),
    namespace: String(metadata.namespace ?? "default"),
    gatewayClass: String(spec.gatewayClassName ?? "nantian"),
    listeners:
      Array.isArray(spec.listeners) && spec.listeners.length > 0
        ? spec.listeners.map((listener: any) => ({
            name: String(listener.name ?? ""),
            port: Number(listener.port ?? 0),
            protocol: String(listener.protocol ?? "HTTP"),
            tls: listener.tls
              ? {
                  mode: String(listener.tls.mode ?? "Terminate"),
                  certificateRefs: Array.isArray(listener.tls.certificateRefs)
                    ? listener.tls.certificateRefs.map((ref: any) => ({
                        name: String(ref.name ?? ""),
                        namespace: String(ref.namespace ?? ""),
                        kind: String(ref.kind ?? "Secret"),
                        group: String(ref.group ?? ""),
                      }))
                    : [],
                }
              : undefined,
          }))
        : createEmptyGatewayFormData().listeners,
  };
}

export function gatewayFormDataToManifest(formData: GatewayFormData): string {
  const listenersYaml = formData.listeners
    .map((listener) => {
      const lines = [
        `    - name: ${listener.name}`,
        `      port: ${listener.port}`,
        `      protocol: ${listener.protocol}`,
      ];
      if (listener.tls && (listener.protocol === "HTTPS" || listener.protocol === "TLS")) {
        lines.push(`      tls:`);
        lines.push(`        mode: ${listener.protocol === "HTTPS" ? "Terminate" : listener.tls.mode}`);
        const refs = listener.tls.certificateRefs.filter((ref) => ref.name.trim());
        if (refs.length > 0) {
          lines.push(`        certificateRefs:`);
          for (const ref of refs) {
            lines.push(`        - name: ${ref.name}`);
            lines.push(`          namespace: ${ref.namespace}`);
            if (ref.kind !== "Secret") lines.push(`          kind: ${ref.kind}`);
            if (ref.group) lines.push(`          group: ${ref.group}`);
          }
        }
      }
      return lines.join("\n");
    })
    .join("\n");

  return `apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: ${formData.name}
  namespace: ${formData.namespace}
spec:
  gatewayClassName: ${formData.gatewayClass}
  listeners:
${listenersYaml}
`;
}

export function gatewayManifestToFormData(yamlText: string): GatewayFormData {
  const manifest = parseSingleManifest(yamlText);
  assertManifestKind(manifest, "gateway.networking.k8s.io/v1", "Gateway");
  readManifestIdentity(manifest);
  return gatewayResourceToFormData(manifest as unknown as KubernetesResource);
}

export const gatewayEditorCodec: ResourceEditorCodec<GatewayFormData> = {
  apiVersion: "gateway.networking.k8s.io/v1",
  kind: "Gateway",
  toYaml: gatewayFormDataToManifest,
  fromYaml: gatewayManifestToFormData,
  getIdentity: (formData) => ({
    name: formData.name,
    namespace: formData.namespace,
  }),
};
```

Refactor the top-level `GatewayForm` in `src/components/resources/gateway-form.tsx` into the wrapper below, and keep the existing listener/name/class JSX by moving it into `GatewayFormFields` that accepts `value` and `onChange` instead of local `useState`:

```tsx
import { useTranslations } from "next-intl";
import { useState } from "react";
import { applyResource } from "@/lib/api";
import { ResourceEditorShell } from "./resource-editor-shell";
import {
  createEmptyGatewayFormData,
  gatewayEditorCodec,
} from "./gateway-form-codec";

export function GatewayForm({ initialData, mode, onSuccess }: GatewayFormProps) {
  const t = useTranslations();
  const [formData, setFormData] = useState(initialData ?? createEmptyGatewayFormData());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const isEdit = mode === "edit";

  return (
    <ResourceEditorShell
      title={isEdit ? t("create.gateway.edit_title") : t("create.gateway.title")}
      description={
        isEdit ? t("create.gateway.edit_description") : t("create.gateway.description")
      }
      backHref="/gateways"
      submitLabel={isEdit ? t("create.gateway.save") : t("create.gateway.submit")}
      submittingLabel={isEdit ? t("control.applying") : t("create.gateway.creating")}
      formData={formData}
      onFormDataChange={setFormData}
      codec={gatewayEditorCodec}
      expectedEditIdentity={isEdit ? gatewayEditorCodec.getIdentity(formData) : null}
      isSubmitting={isLoading}
      submitError={error}
      onSubmitManifest={async (yamlText) => {
        setIsLoading(true);
        setError("");
        try {
          const path = isEdit
            ? `/v1/resources/gateway/${formData.namespace}/${formData.name}`
            : "/v1/resources";
          const response = await applyResource(yamlText, path);
          if (!response.ok) {
            throw new Error((await response.text()) || `Failed to ${mode}: ${response.status}`);
          }
          onSuccess?.();
        } catch (submitError) {
          setError((submitError as Error).message || `Failed to ${mode} gateway`);
          setIsLoading(false);
          return;
        }
        setIsLoading(false);
      }}
      renderForm={({ value, onChange }) => (
        <GatewayFormFields
          value={value}
          onChange={onChange}
          disableIdentityFields={isEdit}
        />
      )}
    />
  );
}
```

Add this controlled field-editor contract in the same file before the wrapper:

```tsx
interface GatewayFormFieldsProps {
  value: GatewayFormData;
  onChange: (next: GatewayFormData) => void;
  disableIdentityFields: boolean;
}

function GatewayFormFields({
  value,
  onChange,
  disableIdentityFields,
}: GatewayFormFieldsProps) {
  // Move the current name/namespace/gatewayClass/listener JSX here and replace
  // direct useState setters with whole-form updates through onChange.
}
```

Update `src/app/[locale]/(dashboard)/gateways/[namespace]/[name]/edit/page.tsx` to import `gatewayResourceToFormData` from `@/components/resources/gateway-form-codec`.

- [ ] **Step 4: Run the Gateway tests to verify they pass**

Run:

```bash
node --test test/resource-editor-state.test.mjs test/resource-editor-codecs.test.mjs test/dashboard-contract.test.mjs
```

Expected: PASS with the new Gateway assertions green.

- [ ] **Step 5: Commit the Gateway refactor**

Run:

```bash
git add \
  test/resource-editor-codecs.test.mjs \
  test/dashboard-contract.test.mjs \
  src/components/resources/gateway-form-codec.ts \
  src/components/resources/gateway-form.tsx \
  src/app/[locale]/(dashboard)/gateways/[namespace]/[name]/edit/page.tsx
git commit -m "feat(dashboard): add dual-mode gateway editor"
```

---

### Task 3: Refactor Backend TLS And ReferenceGrant Editors To Use The Shared Shell

**Files:**
- Create: `src/components/resources/backendtls-form-codec.ts`
- Create: `src/components/resources/referencegrant-form-codec.ts`
- Modify: `src/components/resources/backendtls-form.tsx`
- Modify: `src/components/resources/referencegrant-form.tsx`
- Modify: `src/app/[locale]/(dashboard)/backend-tls/[namespace]/[name]/edit/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/reference-grants/[namespace]/[name]/edit/page.tsx`
- Modify: `test/resource-editor-codecs.test.mjs`
- Modify: `test/dashboard-contract.test.mjs`

- [ ] **Step 1: Add failing Backend TLS and ReferenceGrant round-trip tests**

Append to `test/resource-editor-codecs.test.mjs`:

```js
test("backend TLS codec round-trips hostname and CA refs", () => {
  const { backendTlsFormDataToManifest, backendTlsManifestToFormData } = loadTsModule(
    "src/components/resources/backendtls-form-codec.ts",
    commonStubs
  );

  const formData = {
    name: "mtls-store",
    namespace: "platform",
    targetGroup: "",
    targetKind: "Service",
    targetName: "store",
    hostname: "store.internal",
    caRefs: [{ name: "store-ca", group: "", kind: "ConfigMap" }],
  };

  const yamlText = backendTlsFormDataToManifest(formData);
  assert.match(yamlText, /kind: BackendTLSPolicy/);
  assert.deepEqual(backendTlsManifestToFormData(yamlText), formData);
});

test("reference grant codec round-trips multiple from/to entries", () => {
  const { referenceGrantFormDataToManifest, referenceGrantManifestToFormData } = loadTsModule(
    "src/components/resources/referencegrant-form-codec.ts",
    commonStubs
  );

  const formData = {
    name: "allow-shop",
    namespace: "shared",
    froms: [
      { group: "gateway.networking.k8s.io", kind: "HTTPRoute", namespace: "shop" },
      { group: "gateway.networking.k8s.io", kind: "GRPCRoute", namespace: "payments" },
    ],
    tos: [
      { group: "", kind: "Service", name: "catalog" },
      { group: "", kind: "Secret", name: "catalog-cert" },
    ],
  };

  const yamlText = referenceGrantFormDataToManifest(formData);
  assert.match(yamlText, /kind: ReferenceGrant/);
  assert.deepEqual(referenceGrantManifestToFormData(yamlText), formData);
});
```

Append to `test/dashboard-contract.test.mjs`:

```js
test("backend TLS and reference grant forms adopt the shared shell", () => {
  for (const routePath of [
    "src/components/resources/backendtls-form.tsx",
    "src/components/resources/referencegrant-form.tsx",
  ]) {
    const source = readSource(routePath);
    assert.match(source, /ResourceEditorShell/, `${routePath} must use the shared shell`);
    assert.equal(
      source.match(/<LocalizedLink\s+href="/g)?.length ?? 0,
      2,
      `${routePath} must keep localized back and cancel links`
    );
    assert.doesNotMatch(
      source,
      /window\\.history\\.back\\(/,
      `${routePath} must not use window.history.back`
    );
  }
});
```

- [ ] **Step 2: Run the focused Backend TLS and ReferenceGrant tests to verify they fail**

Run:

```bash
node --test test/resource-editor-codecs.test.mjs test/dashboard-contract.test.mjs
```

Expected: FAIL with `ENOENT` for `backendtls-form-codec.ts` and `referencegrant-form-codec.ts`.

- [ ] **Step 3: Implement the Backend TLS codec and shell-backed form**

Create `src/components/resources/backendtls-form-codec.ts` with this shape:

```ts
import type { ManagedResource, KubernetesResource } from "@/lib/admin-models";
import { unwrapResource } from "@/lib/admin-models";
import {
  assertManifestKind,
  parseSingleManifest,
  readManifestIdentity,
  type ManifestRecord,
} from "@/lib/resource-manifest";
import type { ResourceEditorCodec } from "./resource-editor-types";
import type { BackendTlsFormData } from "./backendtls-form";

export function createEmptyBackendTlsFormData(): BackendTlsFormData {
  return {
    name: "",
    namespace: "default",
    targetGroup: "",
    targetKind: "Service",
    targetName: "",
    hostname: "",
    caRefs: [{ name: "", group: "", kind: "ConfigMap" }],
  };
}

export function backendTlsResourceToFormData(
  resource: ManagedResource | KubernetesResource
): BackendTlsFormData {
  const unwrapped = unwrapResource(resource) as ManifestRecord;
  const spec = (unwrapped.spec ?? {}) as Record<string, any>;
  const metadata = (unwrapped.metadata ?? {}) as Record<string, any>;
  const targetRef = (spec.targetRef ?? {}) as Record<string, any>;
  const validation = (spec.validation ?? {}) as Record<string, any>;

  return {
    name: String(metadata.name ?? ""),
    namespace: String(metadata.namespace ?? "default"),
    targetGroup: String(targetRef.group ?? ""),
    targetKind: String(targetRef.kind ?? "Service"),
    targetName: String(targetRef.name ?? ""),
    hostname: String(validation.hostname ?? ""),
    caRefs: Array.isArray(validation.caCertificateRefs) && validation.caCertificateRefs.length > 0
      ? validation.caCertificateRefs.map((ref: any) => ({
          name: String(ref.name ?? ""),
          group: String(ref.group ?? ""),
          kind: String(ref.kind ?? "ConfigMap"),
        }))
      : createEmptyBackendTlsFormData().caRefs,
  };
}

export function backendTlsFormDataToManifest(formData: BackendTlsFormData): string {
  const validCaRefs = formData.caRefs.filter((ref) => ref.name.trim());
  const caRefsYaml =
    validCaRefs.length === 0
      ? ""
      : `\n    caCertificateRefs:\n${validCaRefs
          .map(
            (ref) =>
              `    - name: ${ref.name}\n      group: ${ref.group || '""'}\n      kind: ${ref.kind}`
          )
          .join("\n")}`;

  return `apiVersion: gateway.networking.k8s.io/v1alpha3
kind: BackendTLSPolicy
metadata:
  name: ${formData.name}
  namespace: ${formData.namespace}
spec:
  targetRef:
    group: ${formData.targetGroup || '""'}
    kind: ${formData.targetKind}
    name: ${formData.targetName}
  validation:
    hostname: ${formData.hostname || '""'}${caRefsYaml}
`;
}

export function backendTlsManifestToFormData(yamlText: string): BackendTlsFormData {
  const manifest = parseSingleManifest(yamlText);
  assertManifestKind(manifest, "gateway.networking.k8s.io/v1alpha3", "BackendTLSPolicy");
  readManifestIdentity(manifest);
  return backendTlsResourceToFormData(manifest as unknown as KubernetesResource);
}

export const backendTlsEditorCodec: ResourceEditorCodec<BackendTlsFormData> = {
  apiVersion: "gateway.networking.k8s.io/v1alpha3",
  kind: "BackendTLSPolicy",
  toYaml: backendTlsFormDataToManifest,
  fromYaml: backendTlsManifestToFormData,
  getIdentity: (formData) => ({
    name: formData.name,
    namespace: formData.namespace,
  }),
};
```

In `src/components/resources/backendtls-form.tsx`, keep the existing field JSX but replace the page wrapper and submit path with the same `ResourceEditorShell` pattern used for Gateway:

```tsx
import { ResourceEditorShell } from "./resource-editor-shell";
import {
  backendTlsEditorCodec,
  createEmptyBackendTlsFormData,
} from "./backendtls-form-codec";

export function BackendTlsForm({ initialData, mode, onSuccess }: BackendTlsFormProps) {
  const t = useTranslations();
  const [formData, setFormData] = useState(initialData ?? createEmptyBackendTlsFormData());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const isEdit = mode === "edit";

  return (
    <ResourceEditorShell
      title={isEdit ? t("backendtls.edit.title") : t("backendtls.create.title")}
      description={isEdit ? t("backendtls.edit.description") : t("backendtls.create.description")}
      backHref="/backend-tls"
      submitLabel={isEdit ? t("backendtls.edit.submit") : t("backendtls.create.submit")}
      submittingLabel={isEdit ? t("backendtls.edit.saving") : t("backendtls.create.creating")}
      formData={formData}
      onFormDataChange={setFormData}
      codec={backendTlsEditorCodec}
      expectedEditIdentity={isEdit ? backendTlsEditorCodec.getIdentity(formData) : null}
      isSubmitting={isLoading}
      submitError={error}
      onSubmitManifest={async (yamlText) => {
        setIsLoading(true);
        setError("");
        try {
          const path = isEdit
            ? `/v1/resources/backendtlspolicy/${formData.namespace}/${formData.name}`
            : "/v1/resources";
          const response = await applyResource(yamlText, path);
          if (!response.ok) {
            throw new Error((await response.text()) || `Failed to ${mode}: ${response.status}`);
          }
          onSuccess?.();
        } catch (submitError) {
          setError((submitError as Error).message || t("backendtls.create.error_failed"));
          setIsLoading(false);
          return;
        }
        setIsLoading(false);
      }}
      renderForm={({ value, onChange }) => (
        <BackendTlsFormFields value={value} onChange={onChange} disableIdentityFields={isEdit} />
      )}
    />
  );
}
```

Define the controlled field editor in the same file:

```tsx
interface BackendTlsFormFieldsProps {
  value: BackendTlsFormData;
  onChange: (next: BackendTlsFormData) => void;
  disableIdentityFields: boolean;
}

function BackendTlsFormFields({
  value,
  onChange,
  disableIdentityFields,
}: BackendTlsFormFieldsProps) {
  // Move the current basic info, targetRef, and CA ref JSX here and update the
  // full form value through onChange.
}
```

- [ ] **Step 4: Implement the ReferenceGrant codec and shell-backed form**

Create `src/components/resources/referencegrant-form-codec.ts` with this shape:

```ts
import type { ManagedResource, KubernetesResource } from "@/lib/admin-models";
import { unwrapResource } from "@/lib/admin-models";
import {
  assertManifestKind,
  parseSingleManifest,
  readManifestIdentity,
  type ManifestRecord,
} from "@/lib/resource-manifest";
import type { ResourceEditorCodec } from "./resource-editor-types";
import type { ReferenceGrantFormData } from "./referencegrant-form";

export function createEmptyReferenceGrantFormData(): ReferenceGrantFormData {
  return {
    name: "",
    namespace: "default",
    froms: [{ group: "gateway.networking.k8s.io", kind: "HTTPRoute", namespace: "default" }],
    tos: [{ group: "", kind: "Service", name: "" }],
  };
}

export function referenceGrantResourceToFormData(
  resource: ManagedResource | KubernetesResource
): ReferenceGrantFormData {
  const unwrapped = unwrapResource(resource) as ManifestRecord;
  const spec = (unwrapped.spec ?? {}) as Record<string, any>;
  const metadata = (unwrapped.metadata ?? {}) as Record<string, any>;

  return {
    name: String(metadata.name ?? ""),
    namespace: String(metadata.namespace ?? "default"),
    froms:
      Array.isArray(spec.from) && spec.from.length > 0
        ? spec.from.map((entry: any) => ({
            group: String(entry.group ?? "gateway.networking.k8s.io"),
            kind: String(entry.kind ?? "HTTPRoute"),
            namespace: String(entry.namespace ?? ""),
          }))
        : createEmptyReferenceGrantFormData().froms,
    tos:
      Array.isArray(spec.to) && spec.to.length > 0
        ? spec.to.map((entry: any) => ({
            group: String(entry.group ?? ""),
            kind: String(entry.kind ?? "Service"),
            name: String(entry.name ?? ""),
          }))
        : createEmptyReferenceGrantFormData().tos,
  };
}

export function referenceGrantFormDataToManifest(formData: ReferenceGrantFormData): string {
  const fromYaml = formData.froms
    .map(
      (entry) =>
        `    - group: ${entry.group || "gateway.networking.k8s.io"}\n      kind: ${entry.kind}\n      namespace: ${entry.namespace}`
    )
    .join("\n");
  const toYaml = formData.tos
    .map(
      (entry) =>
        `    - group: ${entry.group || ""}\n      kind: ${entry.kind}${entry.name.trim() ? `\n      name: ${entry.name}` : ""}`
    )
    .join("\n");

  return `apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: ${formData.name}
  namespace: ${formData.namespace}
spec:
  from:
${fromYaml}
  to:
${toYaml}
`;
}

export function referenceGrantManifestToFormData(yamlText: string): ReferenceGrantFormData {
  const manifest = parseSingleManifest(yamlText);
  assertManifestKind(manifest, "gateway.networking.k8s.io/v1beta1", "ReferenceGrant");
  readManifestIdentity(manifest);
  return referenceGrantResourceToFormData(manifest as unknown as KubernetesResource);
}

export const referenceGrantEditorCodec: ResourceEditorCodec<ReferenceGrantFormData> = {
  apiVersion: "gateway.networking.k8s.io/v1beta1",
  kind: "ReferenceGrant",
  toYaml: referenceGrantFormDataToManifest,
  fromYaml: referenceGrantManifestToFormData,
  getIdentity: (formData) => ({
    name: formData.name,
    namespace: formData.namespace,
  }),
};
```

Then refactor `src/components/resources/referencegrant-form.tsx` to the same shell-backed wrapper pattern, using:

```tsx
import { ResourceEditorShell } from "./resource-editor-shell";
import {
  createEmptyReferenceGrantFormData,
  referenceGrantEditorCodec,
} from "./referencegrant-form-codec";
```

and preserving the existing field JSX inside a controlled `ReferenceGrantFormFields` component:

```tsx
interface ReferenceGrantFormFieldsProps {
  value: ReferenceGrantFormData;
  onChange: (next: ReferenceGrantFormData) => void;
  disableIdentityFields: boolean;
}

function ReferenceGrantFormFields({
  value,
  onChange,
  disableIdentityFields,
}: ReferenceGrantFormFieldsProps) {
  // Move the current basic info, froms, and tos JSX here and push full-value
  // updates through onChange.
}
```

Update the edit pages to import `backendTlsResourceToFormData` and `referenceGrantResourceToFormData` from the new codec files.

- [ ] **Step 5: Run the Backend TLS and ReferenceGrant tests to verify they pass**

Run:

```bash
node --test test/resource-editor-state.test.mjs test/resource-editor-codecs.test.mjs test/dashboard-contract.test.mjs
```

Expected: PASS with the new Backend TLS and ReferenceGrant assertions green.

- [ ] **Step 6: Commit the Backend TLS and ReferenceGrant refactor**

Run:

```bash
git add \
  test/resource-editor-codecs.test.mjs \
  test/dashboard-contract.test.mjs \
  src/components/resources/backendtls-form-codec.ts \
  src/components/resources/referencegrant-form-codec.ts \
  src/components/resources/backendtls-form.tsx \
  src/components/resources/referencegrant-form.tsx \
  src/app/[locale]/(dashboard)/backend-tls/[namespace]/[name]/edit/page.tsx \
  src/app/[locale]/(dashboard)/reference-grants/[namespace]/[name]/edit/page.tsx
git commit -m "feat(dashboard): add dual-mode backend TLS and reference grant editors"
```

---

### Task 4: Refactor HTTPRoute And Fix Route-Kind Interpolation

**Files:**
- Create: `src/components/resources/httproute-form-codec.ts`
- Modify: `src/components/resources/httproute-form.tsx`
- Modify: `src/messages/en.json`
- Modify: `src/messages/zh.json`
- Modify: `test/resource-editor-codecs.test.mjs`
- Modify: `test/dashboard-contract.test.mjs`

- [ ] **Step 1: Add the failing HTTPRoute round-trip and interpolation tests**

Append to `test/resource-editor-codecs.test.mjs`:

```js
test("HTTPRoute codec round-trips filters, matches, timeouts, and backends", () => {
  const { httpRouteFormDataToManifest, httpRouteManifestToFormData } = loadTsModule(
    "src/components/resources/httproute-form-codec.ts",
    commonStubs
  );

  const formData = {
    name: "checkout",
    namespace: "shop",
    gatewayName: "edge",
    gatewayNamespace: "platform",
    hostnames: "api.example.com, checkout.example.com",
    rules: [
      {
        pathMatch: "/checkout",
        method: "POST",
        headerMatches: [{ type: "Exact", name: "x-tenant", value: "shop" }],
        queryParamMatches: [{ type: "Exact", name: "preview", value: "1" }],
        filters: [
          {
            type: "RequestHeaderModifier",
            config: {
              set: [{ name: "x-stage", value: "stable" }],
              add: [],
              remove: ["x-remove-me"],
            },
          },
        ],
        requestTimeout: "30s",
        backends: [{ name: "checkout-svc", namespace: "shop", port: 8080, weight: 100 }],
      },
    ],
  };

  const yamlText = httpRouteFormDataToManifest(formData);
  assert.match(yamlText, /kind: HTTPRoute/);
  assert.deepEqual(httpRouteManifestToFormData(yamlText), formData);
});
```

Append to `test/dashboard-contract.test.mjs`:

```js
test("HTTPRoute form interpolates route kind labels through the translation contract", () => {
  const httpRouteFormSource = readSource("src/components/resources/httproute-form.tsx");

  assert.match(
    httpRouteFormSource,
    /t\\("create\\.route\\.title", \\{ kind: "HTTPRoute" \\}\\)/,
    "HTTPRoute form title must pass the HTTPRoute kind interpolation value"
  );
  assert.match(
    httpRouteFormSource,
    /t\\("create\\.route\\.description", \\{ kind: "HTTPRoute" \\}\\)/,
    "HTTPRoute form description must pass the HTTPRoute kind interpolation value"
  );
  assert.match(
    httpRouteFormSource,
    /t\\("create\\.route\\.(submit|save)", \\{ kind: "HTTPRoute" \\}\\)/,
    "HTTPRoute form submit label must pass the HTTPRoute kind interpolation value"
  );
});
```

- [ ] **Step 2: Run the focused HTTPRoute tests to verify they fail**

Run:

```bash
node --test test/resource-editor-codecs.test.mjs test/dashboard-contract.test.mjs
```

Expected: FAIL with `ENOENT` for `src/components/resources/httproute-form-codec.ts`.

- [ ] **Step 3: Implement the HTTPRoute codec and shell-backed form**

Create `src/components/resources/httproute-form-codec.ts` with these exports:

```ts
import type { ManagedResource, KubernetesResource } from "@/lib/admin-models";
import { unwrapResource } from "@/lib/admin-models";
import {
  assertManifestKind,
  parseSingleManifest,
  readManifestIdentity,
  type ManifestRecord,
} from "@/lib/resource-manifest";
import type { ResourceEditorCodec } from "./resource-editor-types";
import type { HTTPRouteFormData } from "./httproute-form";

export function createEmptyHTTPRouteFormData(): HTTPRouteFormData {
  return {
    name: "",
    namespace: "default",
    gatewayName: "",
    gatewayNamespace: "default",
    hostnames: "",
    rules: [
      {
        pathMatch: "/",
        method: "",
        headerMatches: [],
        queryParamMatches: [],
        filters: [],
        requestTimeout: "",
        backends: [{ name: "", namespace: "default", port: 80, weight: 100 }],
      },
    ],
  };
}

export function httpRouteResourceToFormData(
  resource: ManagedResource | KubernetesResource
): HTTPRouteFormData {
  const unwrapped = unwrapResource(resource) as ManifestRecord;
  const spec = (unwrapped.spec ?? {}) as Record<string, any>;
  const metadata = (unwrapped.metadata ?? {}) as Record<string, any>;
  const parentRef = Array.isArray(spec.parentRefs) && spec.parentRefs.length > 0 ? spec.parentRefs[0] : {};

  return {
    name: String(metadata.name ?? ""),
    namespace: String(metadata.namespace ?? "default"),
    gatewayName: String((parentRef as Record<string, any>).name ?? ""),
    gatewayNamespace: String((parentRef as Record<string, any>).namespace ?? "default"),
    hostnames: Array.isArray(spec.hostnames) ? spec.hostnames.join(", ") : "",
    rules:
      Array.isArray(spec.rules) && spec.rules.length > 0
        ? spec.rules.map((rule: any) => {
            const match = Array.isArray(rule.matches) && rule.matches.length > 0 ? rule.matches[0] : {};
            return {
              pathMatch: String(match.path?.value ?? "/"),
              method: String(match.method ?? ""),
              headerMatches: Array.isArray(match.headers)
                ? match.headers.map((entry: any) => ({
                    type: entry.type === "RegularExpression" ? "RegularExpression" : "Exact",
                    name: String(entry.name ?? ""),
                    value: String(entry.value ?? ""),
                  }))
                : [],
              queryParamMatches: Array.isArray(match.queryParams)
                ? match.queryParams.map((entry: any) => ({
                    type: entry.type === "RegularExpression" ? "RegularExpression" : "Exact",
                    name: String(entry.name ?? ""),
                    value: String(entry.value ?? ""),
                  }))
                : [],
              filters: Array.isArray(rule.filters)
                ? rule.filters.flatMap((filter: any) => {
                    if (filter.type === "RequestHeaderModifier" && filter.requestHeaderModifier) {
                      return [
                        {
                          type: "RequestHeaderModifier",
                          config: {
                            set: filter.requestHeaderModifier.set ?? [],
                            add: filter.requestHeaderModifier.add ?? [],
                            remove: filter.requestHeaderModifier.remove ?? [],
                          },
                        },
                      ];
                    }
                    if (filter.type === "ResponseHeaderModifier" && filter.responseHeaderModifier) {
                      return [
                        {
                          type: "ResponseHeaderModifier",
                          config: {
                            set: filter.responseHeaderModifier.set ?? [],
                            add: filter.responseHeaderModifier.add ?? [],
                            remove: filter.responseHeaderModifier.remove ?? [],
                          },
                        },
                      ];
                    }
                    return [];
                  })
                : [],
              requestTimeout: String(rule.timeouts?.request ?? ""),
              backends: Array.isArray(rule.backendRefs)
                ? rule.backendRefs.map((backend: any) => ({
                    name: String(backend.name ?? ""),
                    namespace: String(backend.namespace ?? "default"),
                    port: Number(backend.port ?? 80),
                    weight: Number(backend.weight ?? 100),
                  }))
                : [{ name: "", namespace: "default", port: 80, weight: 100 }],
            };
          })
        : createEmptyHTTPRouteFormData().rules,
  };
}

export function httpRouteFormDataToManifest(formData: HTTPRouteFormData): string {
  // Keep the existing YAML shaping rules from the current form:
  // - hostnames split by comma
  // - one match block per rule
  // - filter blocks for request/response header modifiers
  // - request timeout stored under spec.rules[].timeouts.request
  // Move the current helpers (`yamlHeaderModifier`, `yamlFilter`) into this file unchanged.
}

export function httpRouteManifestToFormData(yamlText: string): HTTPRouteFormData {
  const manifest = parseSingleManifest(yamlText);
  assertManifestKind(manifest, "gateway.networking.k8s.io/v1", "HTTPRoute");
  readManifestIdentity(manifest);
  return httpRouteResourceToFormData(manifest as unknown as KubernetesResource);
}

export const httpRouteEditorCodec: ResourceEditorCodec<HTTPRouteFormData> = {
  apiVersion: "gateway.networking.k8s.io/v1",
  kind: "HTTPRoute",
  toYaml: httpRouteFormDataToManifest,
  fromYaml: httpRouteManifestToFormData,
  getIdentity: (formData) => ({
    name: formData.name,
    namespace: formData.namespace,
  }),
};
```

Refactor `src/components/resources/httproute-form.tsx` to:

- import `ResourceEditorShell`
- import `createEmptyHTTPRouteFormData` and `httpRouteEditorCodec`
- keep the existing rule/filter/backend field JSX in a controlled `HTTPRouteFormFields` component:

```tsx
interface HTTPRouteFormFieldsProps {
  value: HTTPRouteFormData;
  onChange: (next: HTTPRouteFormData) => void;
  disableIdentityFields: boolean;
}

function HTTPRouteFormFields({
  value,
  onChange,
  disableIdentityFields,
}: HTTPRouteFormFieldsProps) {
  // Move the current basic info, gateway ref, rules, filters, and backend JSX
  // here and update the whole form value through onChange.
}
```

- compute labels with explicit kind interpolation:

```tsx
title={
  isEdit
    ? t("create.route.edit_title", { kind: "HTTPRoute" })
    : t("create.route.title", { kind: "HTTPRoute" })
}
description={
  isEdit
    ? t("create.route.edit_description", { kind: "HTTPRoute" })
    : t("create.route.description", { kind: "HTTPRoute" })
}
submitLabel={
  isEdit
    ? t("create.route.save", { kind: "HTTPRoute" })
    : t("create.route.submit", { kind: "HTTPRoute" })
}
submittingLabel={isEdit ? t("create.route.saving") : t("create.route.creating")}
```

Add route edit strings to `src/messages/en.json`:

```json
"edit_title": "Edit {kind}",
"edit_description": "Modify the {kind} resource",
"saving": "Saving...",
"save": "Save {kind}"
```

Add route edit strings to `src/messages/zh.json`:

```json
"edit_title": "编辑 {kind}",
"edit_description": "修改 {kind} 资源",
"saving": "保存中...",
"save": "保存 {kind}"
```

- [ ] **Step 4: Run the HTTPRoute tests to verify they pass**

Run:

```bash
node --test test/resource-editor-state.test.mjs test/resource-editor-codecs.test.mjs test/dashboard-contract.test.mjs
```

Expected: PASS with the HTTPRoute round-trip and interpolation assertions green.

- [ ] **Step 5: Commit the HTTPRoute refactor**

Run:

```bash
git add \
  test/resource-editor-codecs.test.mjs \
  test/dashboard-contract.test.mjs \
  src/components/resources/httproute-form-codec.ts \
  src/components/resources/httproute-form.tsx \
  src/messages/en.json \
  src/messages/zh.json
git commit -m "fix(dashboard): add dual-mode HTTPRoute editor"
```

---

### Task 5: Add Reusable GRPC/TCP/TLS/UDP Route Editors And Route-Kind Dispatch

**Files:**
- Create: `src/components/resources/grpcroute-form.tsx`
- Create: `src/components/resources/grpcroute-form-codec.ts`
- Create: `src/components/resources/tcproute-form.tsx`
- Create: `src/components/resources/tcproute-form-codec.ts`
- Create: `src/components/resources/tlsroute-form.tsx`
- Create: `src/components/resources/tlsroute-form-codec.ts`
- Create: `src/components/resources/udproute-form.tsx`
- Create: `src/components/resources/udproute-form-codec.ts`
- Modify: `src/app/[locale]/(dashboard)/routes/create/grpcroute/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/routes/create/tcproute/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/routes/create/tlsroute/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/routes/create/udproute/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/routes/[kind]/[namespace]/[name]/edit/page.tsx`
- Modify: `test/resource-editor-codecs.test.mjs`
- Modify: `test/dashboard-contract.test.mjs`

- [ ] **Step 1: Add failing round-trip tests for the remaining Route kinds**

Append to `test/resource-editor-codecs.test.mjs`:

```js
test("GRPCRoute codec round-trips hostnames, matches, and backends", () => {
  const { grpcRouteFormDataToManifest, grpcRouteManifestToFormData } = loadTsModule(
    "src/components/resources/grpcroute-form-codec.ts",
    commonStubs
  );

  const formData = {
    name: "payments",
    namespace: "shop",
    gatewayName: "edge",
    gatewayNamespace: "platform",
    hostnames: "grpc.example.com",
    rules: [
      {
        matches: [{ service: "payments.v1.Checkout", method: "Create" }],
        backends: [{ name: "payments-svc", namespace: "shop", port: 50051, weight: 100 }],
      },
    ],
  };

  const yamlText = grpcRouteFormDataToManifest(formData);
  assert.match(yamlText, /kind: GRPCRoute/);
  assert.deepEqual(grpcRouteManifestToFormData(yamlText), formData);
});

for (const [kind, relativePath, formData] of [
  [
    "TCPRoute",
    "src/components/resources/tcproute-form-codec.ts",
    {
      name: "tcp-store",
      namespace: "shop",
      gatewayName: "edge",
      gatewayNamespace: "platform",
      backends: [{ name: "store-tcp", namespace: "shop", port: 9000, weight: 100 }],
    },
  ],
  [
    "TLSRoute",
    "src/components/resources/tlsroute-form-codec.ts",
    {
      name: "tls-store",
      namespace: "shop",
      gatewayName: "edge",
      gatewayNamespace: "platform",
      sniHosts: "store.example.com",
      backends: [{ name: "store-tls", namespace: "shop", port: 443, weight: 100 }],
    },
  ],
  [
    "UDPRoute",
    "src/components/resources/udproute-form-codec.ts",
    {
      name: "udp-metrics",
      namespace: "ops",
      gatewayName: "edge",
      gatewayNamespace: "platform",
      backends: [{ name: "metrics-udp", namespace: "ops", port: 8125, weight: 100 }],
    },
  ],
]) {
  test(`${kind} codec round-trips parent gateway and backend refs`, () => {
    const moduleExports = loadTsModule(relativePath, commonStubs);
    const exportNames = {
      TCPRoute: ["tcpRouteFormDataToManifest", "tcpRouteManifestToFormData"],
      TLSRoute: ["tlsRouteFormDataToManifest", "tlsRouteManifestToFormData"],
      UDPRoute: ["udpRouteFormDataToManifest", "udpRouteManifestToFormData"],
    };
    const [toYamlName, fromYamlName] = exportNames[kind];
    const toYaml = moduleExports[toYamlName];
    const fromYaml = moduleExports[fromYamlName];

    const yamlText = toYaml(formData);
    assert.match(yamlText, new RegExp(`kind: ${kind}`));
    assert.deepEqual(fromYaml(yamlText), formData);
  });
}
```

Append to `test/dashboard-contract.test.mjs`:

```js
test("non-HTTP route create pages delegate to reusable resource editors", () => {
  for (const [routePath, componentName] of [
    ["src/app/[locale]/(dashboard)/routes/create/grpcroute/page.tsx", "GRPCRouteForm"],
    ["src/app/[locale]/(dashboard)/routes/create/tcproute/page.tsx", "TCPRouteForm"],
    ["src/app/[locale]/(dashboard)/routes/create/tlsroute/page.tsx", "TLSRouteForm"],
    ["src/app/[locale]/(dashboard)/routes/create/udproute/page.tsx", "UDPRouteForm"],
  ]) {
    const source = readSource(routePath);
    assert.match(source, new RegExp(componentName), `${routePath} must render ${componentName}`);
    assert.doesNotMatch(source, /applyResource\(/, `${routePath} must not inline manifest submission`);
    assert.doesNotMatch(source, /useState\(/, `${routePath} must not own form state after extraction`);
  }
});

test("route edit page dispatches editors by route kind instead of hardcoding HTTPRoute", () => {
  const routeEditSource = readSource("src/app/[locale]/(dashboard)/routes/[kind]/[namespace]/[name]/edit/page.tsx");

  assert.match(routeEditSource, /GRPCRouteForm/, "route edit page must support GRPCRoute editing");
  assert.match(routeEditSource, /TCPRouteForm/, "route edit page must support TCPRoute editing");
  assert.match(routeEditSource, /TLSRouteForm/, "route edit page must support TLSRoute editing");
  assert.match(routeEditSource, /UDPRouteForm/, "route edit page must support UDPRoute editing");
  assert.doesNotMatch(
    routeEditSource,
    /const formData = httpRouteResourceToFormData\(data as Record<string, any>\);/,
    "route edit page must not always coerce every route into HTTPRoute form data"
  );
});
```

- [ ] **Step 2: Run the focused Route tests to verify they fail**

Run:

```bash
node --test test/resource-editor-codecs.test.mjs test/dashboard-contract.test.mjs
```

Expected: FAIL with `ENOENT` for the new non-HTTP route codec files.

- [ ] **Step 3: Implement reusable route codecs**

Create `grpcroute-form-codec.ts`, `tcproute-form-codec.ts`, `tlsroute-form-codec.ts`, and `udproute-form-codec.ts` using the exact YAML shapes already emitted by the current create pages.

Required export shape for each file:

```ts
export function createEmptyGRPCRouteFormData(): GRPCRouteFormData {
  return {
    name: "",
    namespace: "default",
    gatewayName: "",
    gatewayNamespace: "default",
    hostnames: "",
    rules: [
      {
        matches: [{ service: "", method: "" }],
        backends: [{ name: "", namespace: "default", port: 50051, weight: 100 }],
      },
    ],
  };
}

export function grpcRouteResourceToFormData(
  resource: ManagedResource | KubernetesResource
): GRPCRouteFormData {
  // Read metadata.name, metadata.namespace, spec.parentRefs[0], optional spec.hostnames,
  // and spec.rules[].backendRefs/matches[0].method into the same structure as createEmptyGRPCRouteFormData.
}

export function grpcRouteFormDataToManifest(formData: GRPCRouteFormData): string {
  // Preserve the current create-page YAML shape, including hostnames and method matches.
}

export function grpcRouteManifestToFormData(yamlText: string): GRPCRouteFormData {
  const manifest = parseSingleManifest(yamlText);
  assertManifestKind(manifest, "gateway.networking.k8s.io/v1", "GRPCRoute");
  readManifestIdentity(manifest);
  return grpcRouteResourceToFormData(manifest as unknown as KubernetesResource);
}

export const grpcRouteEditorCodec: ResourceEditorCodec<GRPCRouteFormData> = {
  apiVersion: "gateway.networking.k8s.io/v1",
  kind: "GRPCRoute",
  toYaml: grpcRouteFormDataToManifest,
  fromYaml: grpcRouteManifestToFormData,
  getIdentity: (formData) => ({ name: formData.name, namespace: formData.namespace }),
};
```

```ts
export function createEmptyTCPRouteFormData(): TCPRouteFormData {
  return {
    name: "",
    namespace: "default",
    gatewayName: "",
    gatewayNamespace: "default",
    backends: [{ name: "", namespace: "default", port: 80, weight: 100 }],
  };
}

export function tcpRouteResourceToFormData(
  resource: ManagedResource | KubernetesResource
): TCPRouteFormData {
  // Read metadata, spec.parentRefs[0], and spec.rules[0].backendRefs into the create-shape form data.
}

export function tcpRouteFormDataToManifest(formData: TCPRouteFormData): string {
  // Preserve the current create-page YAML shape for TCPRoute parentRefs and backendRefs.
}

export function tcpRouteManifestToFormData(yamlText: string): TCPRouteFormData {
  const manifest = parseSingleManifest(yamlText);
  assertManifestKind(manifest, "gateway.networking.k8s.io/v1", "TCPRoute");
  readManifestIdentity(manifest);
  return tcpRouteResourceToFormData(manifest as unknown as KubernetesResource);
}

export const tcpRouteEditorCodec: ResourceEditorCodec<TCPRouteFormData> = {
  apiVersion: "gateway.networking.k8s.io/v1",
  kind: "TCPRoute",
  toYaml: tcpRouteFormDataToManifest,
  fromYaml: tcpRouteManifestToFormData,
  getIdentity: (formData) => ({ name: formData.name, namespace: formData.namespace }),
};
```

```ts
export function createEmptyTLSRouteFormData(): TLSRouteFormData {
  return {
    name: "",
    namespace: "default",
    gatewayName: "",
    gatewayNamespace: "default",
    sniHosts: "",
    backends: [{ name: "", namespace: "default", port: 443, weight: 100 }],
  };
}

export function tlsRouteResourceToFormData(
  resource: ManagedResource | KubernetesResource
): TLSRouteFormData {
  // Read metadata, spec.parentRefs[0], optional spec.hostnames, and spec.rules[0].backendRefs.
}

export function tlsRouteFormDataToManifest(formData: TLSRouteFormData): string {
  // Preserve the current create-page YAML shape for TLSRoute hostnames and backendRefs.
}

export function tlsRouteManifestToFormData(yamlText: string): TLSRouteFormData {
  const manifest = parseSingleManifest(yamlText);
  assertManifestKind(manifest, "gateway.networking.k8s.io/v1", "TLSRoute");
  readManifestIdentity(manifest);
  return tlsRouteResourceToFormData(manifest as unknown as KubernetesResource);
}

export const tlsRouteEditorCodec: ResourceEditorCodec<TLSRouteFormData> = {
  apiVersion: "gateway.networking.k8s.io/v1",
  kind: "TLSRoute",
  toYaml: tlsRouteFormDataToManifest,
  fromYaml: tlsRouteManifestToFormData,
  getIdentity: (formData) => ({ name: formData.name, namespace: formData.namespace }),
};
```

```ts
export function createEmptyUDPRouteFormData(): UDPRouteFormData {
  return {
    name: "",
    namespace: "default",
    gatewayName: "",
    gatewayNamespace: "default",
    backends: [{ name: "", namespace: "default", port: 80, weight: 100 }],
  };
}

export function udpRouteResourceToFormData(
  resource: ManagedResource | KubernetesResource
): UDPRouteFormData {
  // Read metadata, spec.parentRefs[0], and spec.rules[0].backendRefs into the create-shape form data.
}

export function udpRouteFormDataToManifest(formData: UDPRouteFormData): string {
  // Preserve the current create-page YAML shape for UDPRoute parentRefs and backendRefs.
}

export function udpRouteManifestToFormData(yamlText: string): UDPRouteFormData {
  const manifest = parseSingleManifest(yamlText);
  assertManifestKind(manifest, "gateway.networking.k8s.io/v1", "UDPRoute");
  readManifestIdentity(manifest);
  return udpRouteResourceToFormData(manifest as unknown as KubernetesResource);
}

export const udpRouteEditorCodec: ResourceEditorCodec<UDPRouteFormData> = {
  apiVersion: "gateway.networking.k8s.io/v1",
  kind: "UDPRoute",
  toYaml: udpRouteFormDataToManifest,
  fromYaml: udpRouteManifestToFormData,
  getIdentity: (formData) => ({ name: formData.name, namespace: formData.namespace }),
};
```

The parser rules must match the current create-page YAML shapes exactly:

- GRPCRoute:
  - `spec.parentRefs[0]`
  - optional `spec.hostnames`
  - `spec.rules[].matches[0].method.service`
  - `spec.rules[].matches[0].method.method`
  - `spec.rules[].backendRefs`
- TCPRoute:
  - `spec.parentRefs[0]`
  - `spec.rules[0].backendRefs`
- TLSRoute:
  - `spec.parentRefs[0]`
  - optional `spec.hostnames`
  - `spec.rules[0].backendRefs`
- UDPRoute:
  - `spec.parentRefs[0]`
  - `spec.rules[0].backendRefs`

- [ ] **Step 4: Implement reusable non-HTTP route editor components**

Move the current page-local JSX into resource components with controlled form data and the shared shell.

Required top-level pattern for each new component:

```tsx
export function GRPCRouteForm({ initialData, mode, onSuccess }: GRPCRouteFormProps) {
  const t = useTranslations();
  const [formData, setFormData] = useState(initialData ?? createEmptyGRPCRouteFormData());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const isEdit = mode === "edit";

  return (
    <ResourceEditorShell
      title={
        isEdit
          ? t("create.route.edit_title", { kind: "GRPCRoute" })
          : t("create.route.title", { kind: "GRPCRoute" })
      }
      description={
        isEdit
          ? t("create.route.edit_description", { kind: "GRPCRoute" })
          : t("create.route.description", { kind: "GRPCRoute" })
      }
      backHref="/routes"
      submitLabel={
        isEdit
          ? t("create.route.save", { kind: "GRPCRoute" })
          : t("create.route.submit", { kind: "GRPCRoute" })
      }
      submittingLabel={isEdit ? t("create.route.saving") : t("create.route.creating")}
      formData={formData}
      onFormDataChange={setFormData}
      codec={grpcRouteEditorCodec}
      expectedEditIdentity={isEdit ? grpcRouteEditorCodec.getIdentity(formData) : null}
      isSubmitting={isLoading}
      submitError={error}
      onSubmitManifest={async (yamlText) => {
        setIsLoading(true);
        setError("");
        try {
          const path = isEdit
            ? `/v1/resources/grpcroute/${formData.namespace}/${formData.name}`
            : "/v1/resources";
          const response = await applyResource(yamlText, path);
          if (!response.ok) {
            throw new Error((await response.text()) || `Failed to ${mode}: ${response.status}`);
          }
          onSuccess?.();
        } catch (submitError) {
          setError((submitError as Error).message || t("create.route.error_failed_create"));
          setIsLoading(false);
          return;
        }
        setIsLoading(false);
      }}
      renderForm={({ value, onChange }) => (
        <GRPCRouteFormFields value={value} onChange={onChange} disableIdentityFields={isEdit} />
      )}
    />
  );
}
```

Use the exact same wrapper pattern for `TCPRouteForm`, `TLSRouteForm`, and `UDPRouteForm`, changing only:

- the kind label
- the codec import
- the edit API path (`tcproute`, `tlsroute`, `udproute`)
- the field-component type

Each route component must define its controlled field contract in the same file:

```tsx
interface GRPCRouteFormFieldsProps {
  value: GRPCRouteFormData;
  onChange: (next: GRPCRouteFormData) => void;
  disableIdentityFields: boolean;
}

function GRPCRouteFormFields({
  value,
  onChange,
  disableIdentityFields,
}: GRPCRouteFormFieldsProps) {
  // Move the current create-page JSX here and replace local state writes with onChange.
}
```

Populate each `*RouteFormFields` component by moving the current JSX from the corresponding create-page file and replacing local `useState` writes with `value` and `onChange`.

- [ ] **Step 5: Reduce the route create pages to thin wrappers and dispatch the generic route edit page by kind**

Replace each create page with a minimal wrapper. Example for `src/app/[locale]/(dashboard)/routes/create/grpcroute/page.tsx`:

```tsx
"use client";

import { useParams } from "next/navigation";
import { GRPCRouteForm } from "@/components/resources/grpcroute-form";

export default function CreateGRPCRoutePage() {
  const locale = (useParams() as { locale: string }).locale;

  return (
    <GRPCRouteForm
      mode="create"
      onSuccess={() => {
        window.location.href = `/${locale}/routes`;
      }}
    />
  );
}
```

Do the same for `TCPRouteForm`, `TLSRouteForm`, and `UDPRouteForm`.

Refactor `src/app/[locale]/(dashboard)/routes/[kind]/[namespace]/[name]/edit/page.tsx` to dispatch editors by kind:

```tsx
const ROUTE_EDITORS = {
  HTTPRoute: {
    Component: HTTPRouteForm,
    toFormData: httpRouteResourceToFormData,
  },
  GRPCRoute: {
    Component: GRPCRouteForm,
    toFormData: grpcRouteResourceToFormData,
  },
  TCPRoute: {
    Component: TCPRouteForm,
    toFormData: tcpRouteResourceToFormData,
  },
  TLSRoute: {
    Component: TLSRouteForm,
    toFormData: tlsRouteResourceToFormData,
  },
  UDPRoute: {
    Component: UDPRouteForm,
    toFormData: udpRouteResourceToFormData,
  },
} as const;

const editorEntry = ROUTE_EDITORS[kind as keyof typeof ROUTE_EDITORS];
if (!editorEntry) {
  return (
    <div className="flex justify-center py-8">
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Unsupported route kind: {kind}
        </CardContent>
      </Card>
    </div>
  );
}

const formData = editorEntry.toFormData(data as Record<string, any>);
const RouteForm = editorEntry.Component;

return (
  <RouteForm
    initialData={formData}
    mode="edit"
    onSuccess={() => {
      const locale = (params as { locale: string }).locale;
      window.location.href = `/${locale}/routes/${kind}/${namespace}/${name}`;
    }}
  />
);
```

- [ ] **Step 6: Run the full route-focused tests to verify they pass**

Run:

```bash
node --test test/resource-editor-state.test.mjs test/resource-editor-codecs.test.mjs test/dashboard-contract.test.mjs
```

Expected: PASS with all route-kind round-trip and contract assertions green.

- [ ] **Step 7: Commit the reusable route editors**

Run:

```bash
git add \
  test/resource-editor-codecs.test.mjs \
  test/dashboard-contract.test.mjs \
  src/components/resources/grpcroute-form.tsx \
  src/components/resources/grpcroute-form-codec.ts \
  src/components/resources/tcproute-form.tsx \
  src/components/resources/tcproute-form-codec.ts \
  src/components/resources/tlsroute-form.tsx \
  src/components/resources/tlsroute-form-codec.ts \
  src/components/resources/udproute-form.tsx \
  src/components/resources/udproute-form-codec.ts \
  src/app/[locale]/(dashboard)/routes/create/grpcroute/page.tsx \
  src/app/[locale]/(dashboard)/routes/create/tcproute/page.tsx \
  src/app/[locale]/(dashboard)/routes/create/tlsroute/page.tsx \
  src/app/[locale]/(dashboard)/routes/create/udproute/page.tsx \
  src/app/[locale]/(dashboard)/routes/[kind]/[namespace]/[name]/edit/page.tsx
git commit -m "feat(dashboard): add dual-mode route editors"
```

---

### Task 6: Final Verification, Acceptance, And Repository-Boundary Checks

**Files:**
- Verify only; no planned file creation

- [ ] **Step 1: Run the targeted editor regression tests**

Run:

```bash
node --test \
  test/resource-editor-state.test.mjs \
  test/resource-editor-codecs.test.mjs \
  test/dashboard-contract.test.mjs
```

Expected: PASS with all targeted dual-mode resource editor tests green.

- [ ] **Step 2: Run diff hygiene checks**

Run:

```bash
git diff --check
```

Expected: no output.

- [ ] **Step 3: Run the full dashboard acceptance command**

Run:

```bash
npm run check
```

Expected: exit `0` after `validate:app-router`, `node --test`, `eslint`, and `next build` all pass.

- [ ] **Step 4: Verify unrelated repositories are unchanged from the captured baseline**

Run:

```bash
diff -u /tmp/dashboard-dual-mode-baseline/gateway.status <(git -C /root/nantian-gw/gateway status --porcelain=v1)
diff -u /tmp/dashboard-dual-mode-baseline/dataplane.status <(git -C /root/nantian-gw/dataplane status --porcelain=v1)
diff -u /tmp/dashboard-dual-mode-baseline/proto.status <(git -C /root/nantian-gw/proto status --porcelain=v1)
diff -u /tmp/dashboard-dual-mode-baseline/website.status <(git -C /root/nantian-gw/website status --porcelain=v1)
diff -u /tmp/dashboard-dual-mode-baseline/helm-charts.status <(git -C /root/nantian-gw/helm-charts status --porcelain=v1)
```

Expected: no diff output for any repository.

- [ ] **Step 5: Capture the final dashboard branch status for branch-finishing workflow**

Run:

```bash
git status --short --branch
git log --oneline --decorate -5
```

Expected: the branch shows only the planned dashboard commits plus any local worktree notes already known to the repo.
