"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { applyResource } from "@/lib/api";
import { useNamespaces } from "@/hooks/use-api";
import { ManagedResource, KubernetesResource, unwrapResource } from "@/lib/admin-models";
import { Loader2 } from "lucide-react";

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

const HOOK_OPTIONS = ["onRequest", "onResponse", "onStreamChunk"];

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
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t("wasm.plugins.form.basic_info_title")}</CardTitle>
                <CardDescription>{t("wasm.plugins.form.basic_info_desc")}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">{t("wasm.plugins.form.name")}</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t("wasm.plugins.form.name_placeholder")}
                      required
                      disabled={isEdit}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="namespace">{t("wasm.plugins.form.namespace")}</Label>
                    <Select value={namespace} onValueChange={setNamespace} disabled={isEdit}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("wasm.plugins.form.namespace_placeholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {namespaces.map((ns) => (
                          <SelectItem key={ns} value={ns}>{ns}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t("wasm.plugins.form.wasm_source_title")}</CardTitle>
                <CardDescription>{t("wasm.plugins.form.wasm_source_desc")}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-2">
                  <Label>{t("wasm.plugins.form.source_type")}</Label>
                  <Select value={wasmSourceType} onValueChange={(v) => setWasmSourceType(v as "url" | "configMap" | "inline")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="url">{t("wasm.plugins.form.source_type_url")}</SelectItem>
                      <SelectItem value="configMap">{t("wasm.plugins.form.source_type_configmap")}</SelectItem>
                      <SelectItem value="inline">{t("wasm.plugins.form.source_type_inline")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {wasmSourceType === "url" && (
                  <div className="grid gap-2">
                    <Label htmlFor="wasmUrl">{t("wasm.plugins.form.wasm_url")}</Label>
                    <Input
                      id="wasmUrl"
                      value={wasmUrl}
                      onChange={(e) => setWasmUrl(e.target.value)}
                      placeholder="https://example.com/plugin.wasm"
                    />
                  </div>
                )}

                {wasmSourceType === "configMap" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="cm-name">{t("wasm.plugins.form.configmap_name")}</Label>
                      <Input
                        id="cm-name"
                        value={wasmConfigMapName}
                        onChange={(e) => setWasmConfigMapName(e.target.value)}
                        placeholder="my-wasm-plugin"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="cm-key">{t("wasm.plugins.form.configmap_key")}</Label>
                      <Input
                        id="cm-key"
                        value={wasmConfigMapKey}
                        onChange={(e) => setWasmConfigMapKey(e.target.value)}
                        placeholder="plugin.wasm"
                      />
                    </div>
                  </div>
                )}

                {wasmSourceType === "inline" && (
                  <div className="grid gap-2">
                    <Label htmlFor="wasmInline">{t("wasm.plugins.form.inline")}</Label>
                    <Textarea
                      id="wasmInline"
                      value={wasmInline}
                      onChange={(e) => setWasmInline(e.target.value)}
                      placeholder={t("wasm.plugins.form.inline_placeholder")}
                      rows={4}
                    />
                  </div>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="wasmSha256">{t("wasm.plugins.form.sha256")}</Label>
                  <Input
                    id="wasmSha256"
                    value={wasmSha256}
                    onChange={(e) => setWasmSha256(e.target.value)}
                    placeholder={t("wasm.plugins.form.sha256_placeholder")}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t("wasm.plugins.form.target_title")}</CardTitle>
                <CardDescription>{t("wasm.plugins.form.target_desc")}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {targetRefs.map((ref, idx) => (
                  <div key={idx} className="flex items-end gap-4">
                    <div className="grid gap-2 flex-1">
                      <Label className="text-xs">{t("wasm.plugins.form.target_group")}</Label>
                      <Input
                        value={ref.group}
                        onChange={(e) => updateTargetRef(idx, "group", e.target.value)}
                        placeholder={t("wasm.plugins.form.target_group_placeholder")}
                      />
                    </div>
                    <div className="grid gap-2 flex-1">
                      <Label className="text-xs">{t("wasm.plugins.form.target_kind")}</Label>
                      <Select value={ref.kind} onValueChange={(v) => updateTargetRef(idx, "kind", v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Service">Service</SelectItem>
                          <SelectItem value="HTTPRoute">HTTPRoute</SelectItem>
                          <SelectItem value="GRPCRoute">GRPCRoute</SelectItem>
                          <SelectItem value="Gateway">Gateway</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2 flex-1">
                      <Label className="text-xs">{t("wasm.plugins.form.target_name")}</Label>
                      <Input
                        value={ref.name}
                        onChange={(e) => updateTargetRef(idx, "name", e.target.value)}
                        placeholder={t("wasm.plugins.form.target_name_placeholder")}
                      />
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => removeTargetRef(idx)}>
                      <span className="text-red-500 text-lg">&times;</span>
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addTargetRef}>
                  + {t("wasm.plugins.form.add_target")}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t("wasm.plugins.form.hooks_title")}</CardTitle>
                <CardDescription>{t("wasm.plugins.form.hooks_desc")}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {HOOK_OPTIONS.map((hook) => {
                  const selected = hooks.includes(hook);
                  return (
                    <Button
                      key={hook}
                      type="button"
                      variant={selected ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleHook(hook)}
                    >
                      {hook}
                    </Button>
                  );
                })}
              </CardContent>
            </Card>

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

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t("wasm.plugins.form.sandbox_title")}</CardTitle>
                <CardDescription>{t("wasm.plugins.form.sandbox_desc")}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="maxMemory">{t("wasm.plugins.form.max_memory")}</Label>
                    <Input
                      id="maxMemory"
                      type="number"
                      value={sandboxMaxMemoryBytes}
                      onChange={(e) => setSandboxMaxMemoryBytes(parseInt(e.target.value, 10) || 0)}
                      placeholder="0"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="maxExec">{t("wasm.plugins.form.max_exec_time")}</Label>
                    <Input
                      id="maxExec"
                      type="number"
                      value={sandboxMaxExecutionTimeMs}
                      onChange={(e) => setSandboxMaxExecutionTimeMs(parseInt(e.target.value, 10) || 0)}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="allowNet">{t("wasm.plugins.form.allow_network")}</Label>
                    <Select value={sandboxAllowNetwork ? "true" : "false"} onValueChange={(v) => setSandboxAllowNetwork(v === "true")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">{t("wasm.plugins.form.enabled")}</SelectItem>
                        <SelectItem value="false">{t("wasm.plugins.form.disabled")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="allowFs">{t("wasm.plugins.form.allow_filesystem")}</Label>
                    <Select value={sandboxAllowFileSystem ? "true" : "false"} onValueChange={(v) => setSandboxAllowFileSystem(v === "true")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">{t("wasm.plugins.form.enabled")}</SelectItem>
                        <SelectItem value="false">{t("wasm.plugins.form.disabled")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

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
