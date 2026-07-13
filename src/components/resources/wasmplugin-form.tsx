"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { applyResource } from "@/lib/api";
import { useNamespaces } from "@/hooks/use-api";
import { ManagedResource, KubernetesResource, unwrapResource } from "@/lib/admin-models";
import { Loader2 } from "lucide-react";
import { WasmPluginBasicInfo } from "./wasmplugin-form/basic-info-section";
import { WasmPluginWasmSource } from "./wasmplugin-form/wasm-source-section";
import { WasmPluginTargetRefs } from "./wasmplugin-form/target-refs-section";
import { WasmPluginHooks } from "./wasmplugin-form/hooks-section";
import { WasmPluginSandbox } from "./wasmplugin-form/sandbox-section";

interface TargetRef {
  group: string;
  kind: string;
  name: string;
}

export interface WasmPluginFormData {
  name: string;
  namespace: string;
  wasmSourceType: "url" | "configMap" | "inline";
  wasmUrl: string;
  wasmConfigMapName: string;
  wasmConfigMapKey: string;
  wasmInline: string;
  wasmSha256: string;
  targetRefs: TargetRef[];
  hooks: string[];
  config: string;
  sandboxMaxMemoryBytes: number;
  sandboxMaxExecutionTimeMs: number;
  sandboxAllowNetwork: boolean;
  sandboxAllowFileSystem: boolean;
}

interface WasmPluginFormProps {
  initialData?: WasmPluginFormData;
  mode: "create" | "edit";
  onSuccess?: () => void;
}

function emptyWasmPluginForm(): WasmPluginFormData {
  return {
    name: "",
    namespace: "default",
    wasmSourceType: "url",
    wasmUrl: "",
    wasmConfigMapName: "",
    wasmConfigMapKey: "plugin.wasm",
    wasmInline: "",
    wasmSha256: "",
    targetRefs: [],
    hooks: [],
    config: "",
    sandboxMaxMemoryBytes: 0,
    sandboxMaxExecutionTimeMs: 0,
    sandboxAllowNetwork: false,
    sandboxAllowFileSystem: false,
  };
}

export function wasmPluginResourceToFormData(resource: ManagedResource | KubernetesResource): WasmPluginFormData {
  const r = unwrapResource(resource);
  const spec: Record<string, unknown> = r.spec || {};
  const metadata = (r.metadata || {}) as { name?: string; namespace?: string };
  const wasm = spec.wasm as Record<string, unknown> | undefined;

  let wasmSourceType: "url" | "configMap" | "inline" = "url";
  if ((wasm?.configMap as Record<string, unknown> | undefined)?.name) wasmSourceType = "configMap";
  else if (wasm?.inline) wasmSourceType = "inline";

  return {
    name: metadata.name || (resource as ManagedResource).name || "",
    namespace: metadata.namespace || (resource as ManagedResource).namespace || "default",
    wasmSourceType,
    wasmUrl: (wasm?.url as string) || "",
    wasmConfigMapName: ((wasm?.configMap as Record<string, unknown> | undefined)?.name as string) || "",
    wasmConfigMapKey: ((wasm?.configMap as Record<string, unknown> | undefined)?.key as string) || "plugin.wasm",
    wasmInline: (wasm?.inline as string) || "",
    wasmSha256: (wasm?.sha256 as string) || "",
    targetRefs: ((spec.targetRefs as Record<string, unknown>[]) || []).map((ref: Record<string, unknown>) => ({
      group: (ref.group as string) || "",
      kind: (ref.kind as string) || "Service",
      name: (ref.name as string) || "",
    })),
    hooks: (spec.hooks as string[]) || [],
    config: spec.config ? (typeof spec.config === "string" ? spec.config : JSON.stringify(spec.config, null, 2)) : "",
    sandboxMaxMemoryBytes: ((spec.sandbox as Record<string, unknown> | undefined)?.maxMemoryBytes as number) ?? 0,
    sandboxMaxExecutionTimeMs: ((spec.sandbox as Record<string, unknown> | undefined)?.maxExecutionTimeMs as number) ?? 0,
    sandboxAllowNetwork: !!((spec.sandbox as Record<string, unknown> | undefined)?.allowNetwork),
    sandboxAllowFileSystem: !!((spec.sandbox as Record<string, unknown> | undefined)?.allowFileSystem),
  };
}

export function WasmPluginForm({ initialData, mode, onSuccess }: WasmPluginFormProps) {
  const t = useTranslations();
  const { data: namespacesData } = useNamespaces();
  const namespaces = (namespacesData as string[]) || ["default", "kube-system", "kube-public", "ingress"];

  const defaults = initialData || emptyWasmPluginForm();
  const [name, setName] = useState(defaults.name);
  const [namespace, setNamespace] = useState(defaults.namespace);
  const [wasmSourceType, setWasmSourceType] = useState(defaults.wasmSourceType);
  const [wasmUrl, setWasmUrl] = useState(defaults.wasmUrl);
  const [wasmConfigMapName, setWasmConfigMapName] = useState(defaults.wasmConfigMapName);
  const [wasmConfigMapKey, setWasmConfigMapKey] = useState(defaults.wasmConfigMapKey);
  const [wasmInline, setWasmInline] = useState(defaults.wasmInline);
  const [wasmSha256, setWasmSha256] = useState(defaults.wasmSha256);
  const [targetRefs, setTargetRefs] = useState<TargetRef[]>(defaults.targetRefs);
  const [hooks, setHooks] = useState<string[]>(defaults.hooks);
  const [config, setConfig] = useState(defaults.config);
  const [sandboxMaxMemoryBytes, setSandboxMaxMemoryBytes] = useState(defaults.sandboxMaxMemoryBytes);
  const [sandboxMaxExecutionTimeMs, setSandboxMaxExecutionTimeMs] = useState(defaults.sandboxMaxExecutionTimeMs);
  const [sandboxAllowNetwork, setSandboxAllowNetwork] = useState(defaults.sandboxAllowNetwork);
  const [sandboxAllowFileSystem, setSandboxAllowFileSystem] = useState(defaults.sandboxAllowFileSystem);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const toggleHook = (hook: string) => {
    setHooks((prev) =>
      prev.includes(hook) ? prev.filter((h) => h !== hook) : [...prev, hook]
    );
  };

  const addTargetRef = () => {
    setTargetRefs([...targetRefs, { group: "", kind: "Service", name: "" }]);
  };

  const removeTargetRef = (index: number) => {
    setTargetRefs(targetRefs.filter((_, i) => i !== index));
  };

  const updateTargetRef = (index: number, field: string, value: string) => {
    const updated = [...targetRefs];
    updated[index] = { ...updated[index], [field]: value };
    setTargetRefs(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const yamlParts: string[] = [];
    yamlParts.push(`apiVersion: gateway.nantian.dev/v1alpha1
kind: WasmPlugin
metadata:
  name: ${name}
  namespace: ${namespace}
spec:`);

    const wasmLines: string[] = [];
    if (wasmSourceType === "url" && wasmUrl) {
      wasmLines.push(`    url: "${wasmUrl}"`);
    } else if (wasmSourceType === "configMap" && wasmConfigMapName) {
      wasmLines.push(`    configMap:
      name: ${wasmConfigMapName}
      key: ${wasmConfigMapKey || "plugin.wasm"}`);
    } else if (wasmSourceType === "inline" && wasmInline) {
      wasmLines.push(`    inline: ${wasmInline}`);
    }
    if (wasmSha256 && wasmLines.length > 0) {
      wasmLines.push(`    sha256: ${wasmSha256}`);
    }
    if (wasmLines.length > 0) {
      yamlParts.push(`  wasm:
${wasmLines.join("\n")}`);
    }

    if (targetRefs.length > 0) {
      yamlParts.push(`  targetRefs:
${targetRefs.map((ref) => `    - group: ${ref.group || ""}
      kind: ${ref.kind || "Service"}
      name: ${ref.name}`).join("\n")}`);
    }

    if (hooks.length > 0) {
      yamlParts.push(`  hooks:
${hooks.map((h) => `    - "${h}"`).join("\n")}`);
    }

    if (config.trim()) {
      yamlParts.push(`  config:
${config}`);
    }

    if (sandboxMaxMemoryBytes > 0 || sandboxMaxExecutionTimeMs > 0 || sandboxAllowNetwork || sandboxAllowFileSystem) {
      const sandboxLines: string[] = [];
      if (sandboxMaxMemoryBytes > 0) sandboxLines.push(`    maxMemoryBytes: ${sandboxMaxMemoryBytes}`);
      if (sandboxMaxExecutionTimeMs > 0) sandboxLines.push(`    maxExecutionTimeMs: ${sandboxMaxExecutionTimeMs}`);
      sandboxLines.push(`    allowNetwork: ${sandboxAllowNetwork}`);
      sandboxLines.push(`    allowFileSystem: ${sandboxAllowFileSystem}`);
      yamlParts.push(`  sandbox:
${sandboxLines.join("\n")}`);
    }

    const yaml = yamlParts.join("\n") + "\n";

    try {
      const path =
        mode === "edit"
          ? `/v1/resources/wasmplugin/${namespace}/${name}`
          : "/v1/resources";
      const response = await applyResource(yaml, path);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Failed to ${mode}: ${response.status}`);
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      setError((err as Error).message || `Failed to ${mode} WasmPlugin`);
      setIsLoading(false);
    }
  };

  const isEdit = mode === "edit";

  return (
    <div className="flex justify-center py-8">
      <div className="w-full max-w-5xl px-4">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
            <span className="h-4 w-4">&#8592;</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {isEdit
                ? t("wasm.plugins.form.edit_title") || `Edit WasmPlugin`
                : t("wasm.plugins.form.title")}
            </h1>
            <p className="text-muted-foreground">
              {isEdit
                ? t("wasm.plugins.form.edit_description") || `Modify WasmPlugin ${name}`
                : t("wasm.plugins.form.description")}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            <WasmPluginBasicInfo
              name={name}
              namespace={namespace}
              namespaces={namespaces}
              isEdit={isEdit}
              onNameChange={setName}
              onNamespaceChange={setNamespace}
            />

            <WasmPluginWasmSource
              wasmSourceType={wasmSourceType}
              wasmUrl={wasmUrl}
              wasmConfigMapName={wasmConfigMapName}
              wasmConfigMapKey={wasmConfigMapKey}
              wasmInline={wasmInline}
              wasmSha256={wasmSha256}
              onSourceTypeChange={setWasmSourceType}
              onWasmUrlChange={setWasmUrl}
              onConfigMapNameChange={setWasmConfigMapName}
              onConfigMapKeyChange={setWasmConfigMapKey}
              onWasmInlineChange={setWasmInline}
              onWasmSha256Change={setWasmSha256}
            />

            <WasmPluginTargetRefs
              targetRefs={targetRefs}
              onAdd={addTargetRef}
              onRemove={removeTargetRef}
              onUpdate={updateTargetRef}
            />

            <WasmPluginHooks
              hooks={hooks}
              onToggle={toggleHook}
            />

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t("wasm.plugins.form.config_title")}</CardTitle>
                <CardDescription>{t("wasm.plugins.form.config_desc")}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2">
                <Label htmlFor="config">{t("wasm.plugins.form.config_label")}</Label>
                <Textarea
                  id="config"
                  value={config}
                  onChange={(e) => setConfig(e.target.value)}
                  placeholder={t("wasm.plugins.form.config_placeholder")}
                  rows={6}
                  className="font-mono text-sm"
                />
              </CardContent>
            </Card>

            <WasmPluginSandbox
              maxMemoryBytes={sandboxMaxMemoryBytes}
              maxExecutionTimeMs={sandboxMaxExecutionTimeMs}
              allowNetwork={sandboxAllowNetwork}
              allowFileSystem={sandboxAllowFileSystem}
              onMaxMemoryBytesChange={setSandboxMaxMemoryBytes}
              onMaxExecutionTimeMsChange={setSandboxMaxExecutionTimeMs}
              onAllowNetworkChange={setSandboxAllowNetwork}
              onAllowFileSystemChange={setSandboxAllowFileSystem}
            />

            {error && (
              <Card className="border-red-500">
                <CardContent className="py-3 text-sm text-red-600">{error}</CardContent>
              </Card>
            )}

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => window.history.back()}>
                {t("wasm.plugins.form.cancel")}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEdit
                  ? (t("wasm.plugins.form.save") || "Save Changes")
                  : (t("wasm.plugins.form.submit") || "Create WasmPlugin")}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
