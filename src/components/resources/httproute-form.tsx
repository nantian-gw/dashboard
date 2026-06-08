"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useNamespaces, useGateways } from "@/hooks/use-api";
import { ManagedResource, KubernetesResource, unwrapResource } from "@/lib/admin-models";
import { Plus, Trash2, ChevronDown, ChevronRight, Loader2 } from "lucide-react";

export interface BackendRef {
  name: string;
  namespace: string;
  port: number;
  weight: number;
}

export interface HeaderMatch {
  type: "Exact" | "RegularExpression";
  name: string;
  value: string;
}

export interface QueryParamMatch {
  type: "Exact" | "RegularExpression";
  name: string;
  value: string;
}

export interface HeaderModifier {
  set: { name: string; value: string }[];
  add: { name: string; value: string }[];
  remove: string[];
}

export interface RuleFilter {
  type: "RequestHeaderModifier" | "ResponseHeaderModifier";
  config: HeaderModifier;
}

export interface RouteRule {
  pathMatch: string;
  method: string;
  headerMatches: HeaderMatch[];
  queryParamMatches: QueryParamMatch[];
  filters: RuleFilter[];
  requestTimeout: string;
  backends: BackendRef[];
}

export interface HTTPRouteFormData {
  name: string;
  namespace: string;
  gatewayName: string;
  gatewayNamespace: string;
  hostnames: string;
  rules: RouteRule[];
}

const HTTP_METHODS = ["__any__", "GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];
const FILTER_TYPES = ["RequestHeaderModifier", "ResponseHeaderModifier"];

function emptyHeaderModifier(): HeaderModifier {
  return { set: [], add: [], remove: [] };
}

function emptyFilter(): RuleFilter {
  return { type: "RequestHeaderModifier", config: emptyHeaderModifier() };
}

function emptyRule(): RouteRule {
  return {
    pathMatch: "/",
    method: "",
    headerMatches: [],
    queryParamMatches: [],
    filters: [],
    requestTimeout: "",
    backends: [{ name: "", namespace: "default", port: 80, weight: 100 }],
  };
}

function emptyHTTPRouteForm(): HTTPRouteFormData {
  return { name: "", namespace: "default", gatewayName: "", gatewayNamespace: "default", hostnames: "", rules: [emptyRule()] };
}

function HeaderModifierSection({
  label,
  config,
  onChange,
  t,
}: {
  label: string;
  config: HeaderModifier;
  onChange: (c: HeaderModifier) => void;
  t: (key: string, opts?: any) => string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border rounded-md p-3 space-y-3">
      <button type="button" onClick={() => setOpen(!open)} className="flex items-center gap-1 text-sm font-medium">
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {label}
      </button>
      {open && (
        <div className="space-y-3 pl-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">{t("create.route.filter_set_headers")}</Label>
              <Button type="button" variant="ghost" size="sm"
                onClick={() => onChange({ ...config, set: [...config.set, { name: "", value: "" }] })}>
                <Plus className="h-3 w-3 mr-1" /> {t("create.route.add")}
              </Button>
            </div>
            {config.set.map((h, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input placeholder={t("create.route.header_name_placeholder")} className="h-8 text-xs"
                  value={h.name} onChange={(e) => {
                    const next = [...config.set]; next[i] = { ...next[i], name: e.target.value };
                    onChange({ ...config, set: next });
                  }} />
                <Input placeholder={t("create.route.header_value_placeholder")} className="h-8 text-xs"
                  value={h.value} onChange={(e) => {
                    const next = [...config.set]; next[i] = { ...next[i], value: e.target.value };
                    onChange({ ...config, set: next });
                  }} />
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                  onClick={() => onChange({ ...config, set: config.set.filter((_, j) => j !== i) })}>
                  <Trash2 className="h-3 w-3 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">{t("create.route.filter_add_headers")}</Label>
              <Button type="button" variant="ghost" size="sm"
                onClick={() => onChange({ ...config, add: [...config.add, { name: "", value: "" }] })}>
                <Plus className="h-3 w-3 mr-1" /> {t("create.route.add")}
              </Button>
            </div>
            {config.add.map((h, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input placeholder={t("create.route.header_name_placeholder")} className="h-8 text-xs"
                  value={h.name} onChange={(e) => {
                    const next = [...config.add]; next[i] = { ...next[i], name: e.target.value };
                    onChange({ ...config, add: next });
                  }} />
                <Input placeholder={t("create.route.header_value_placeholder")} className="h-8 text-xs"
                  value={h.value} onChange={(e) => {
                    const next = [...config.add]; next[i] = { ...next[i], value: e.target.value };
                    onChange({ ...config, add: next });
                  }} />
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                  onClick={() => onChange({ ...config, add: config.add.filter((_, j) => j !== i) })}>
                  <Trash2 className="h-3 w-3 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">{t("create.route.filter_remove_headers")}</Label>
              <Button type="button" variant="ghost" size="sm"
                onClick={() => onChange({ ...config, remove: [...config.remove, ""] })}>
                <Plus className="h-3 w-3 mr-1" /> {t("create.route.add")}
              </Button>
            </div>
            {config.remove.map((h, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input placeholder={t("create.route.header_name_placeholder")} className="h-8 text-xs flex-1"
                  value={h} onChange={(e) => {
                    const next = [...config.remove]; next[i] = e.target.value;
                    onChange({ ...config, remove: next });
                  }} />
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                  onClick={() => onChange({ ...config, remove: config.remove.filter((_, j) => j !== i) })}>
                  <Trash2 className="h-3 w-3 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function yamlHeaderModifier(mod: HeaderModifier, indent: string): string {
  const lines: string[] = [];
  if (mod.set.length > 0) {
    lines.push(`${indent}set:`);
    for (const h of mod.set) lines.push(`${indent}- name: ${h.name}\n${indent}  value: ${h.value}`);
  }
  if (mod.add.length > 0) {
    lines.push(`${indent}add:`);
    for (const h of mod.add) lines.push(`${indent}- name: ${h.name}\n${indent}  value: ${h.value}`);
  }
  if (mod.remove.length > 0) {
    lines.push(`${indent}remove:`);
    for (const h of mod.remove) if (h.trim()) lines.push(`${indent}- ${h}`);
  }
  return lines.join("\n");
}

function yamlFilter(filter: RuleFilter, indent: string): string {
  const lines: string[] = [`${indent}- type: ${filter.type}`];
  if (filter.type === "RequestHeaderModifier" || filter.type === "ResponseHeaderModifier") {
    const key = filter.type === "RequestHeaderModifier" ? "requestHeaderModifier" : "responseHeaderModifier";
    const inner = yamlHeaderModifier(filter.config, `${indent}  ${key}:`).trimEnd();
    if (inner) lines.push(inner);
  }
  return lines.join("\n");
}

export function httpRouteResourceToFormData(resource: ManagedResource | KubernetesResource): HTTPRouteFormData {
  const r = unwrapResource(resource);
  const spec: Record<string, any> = r.spec || {};
  const metadata = (r.metadata || {}) as { name?: string; namespace?: string };
  const parentRefs = spec.parentRefs || [];
  const parentRef = parentRefs[0] || {};

  const rules: RouteRule[] = (spec.rules || []).map((rule: any) => {
    const match = (rule.matches || [])[0] || {};
    return {
      pathMatch: match.path?.value || "/",
      method: match.method || "",
      headerMatches: (match.headers || []).map((h: any) => ({
        type: h.type === "RegularExpression" ? "RegularExpression" as const : "Exact" as const,
        name: h.name || "",
        value: h.value || "",
      })),
      queryParamMatches: (match.queryParams || []).map((q: any) => ({
        type: q.type === "RegularExpression" ? "RegularExpression" as const : "Exact" as const,
        name: q.name || "",
        value: q.value || "",
      })),
      filters: (rule.filters || []).flatMap((f: any) => {
        const filters: RuleFilter[] = [];
        if (f.type === "RequestHeaderModifier" && f.requestHeaderModifier) {
          const m = f.requestHeaderModifier;
          filters.push({ type: "RequestHeaderModifier", config: { set: m.set || [], add: m.add || [], remove: m.remove || [] } });
        }
        if (f.type === "ResponseHeaderModifier" && f.responseHeaderModifier) {
          const m = f.responseHeaderModifier;
          filters.push({ type: "ResponseHeaderModifier", config: { set: m.set || [], add: m.add || [], remove: m.remove || [] } });
        }
        return filters;
      }),
      requestTimeout: rule.timeouts?.request || "",
      backends: (rule.backendRefs || []).map((b: any) => ({
        name: b.name || "",
        namespace: b.namespace || metadata.namespace || "",
        port: b.port || 80,
        weight: b.weight || 1,
      })),
    };
  });

  return {
    name: metadata.name || (resource as ManagedResource).name || "",
    namespace: metadata.namespace || (resource as ManagedResource).namespace || "default",
    gatewayName: parentRef.name || "",
    gatewayNamespace: parentRef.namespace || metadata.namespace || "default",
    hostnames: (spec.hostnames || []).join(", "),
    rules: rules.length > 0 ? rules : [emptyRule()],
  };
}

interface HTTPRouteFormProps {
  initialData?: HTTPRouteFormData;
  mode: "create" | "edit";
  onSuccess?: () => void;
}

export function HTTPRouteForm({ initialData, mode, onSuccess }: HTTPRouteFormProps) {
  const t = useTranslations();
  const { data: namespacesData } = useNamespaces();
  const namespaces = (namespacesData as string[]) || ["default", "kube-system", "kube-public", "ingress"];
  const { data: gatewaysData } = useGateways();
  const gateways = (gatewaysData?.gateways as Array<{ name: string; namespace: string }> | undefined) || [];

  const defaults = initialData || emptyHTTPRouteForm();
  const [name, setName] = useState(defaults.name);
  const [namespace, setNamespace] = useState(defaults.namespace);
  const [gatewayName, setGatewayName] = useState(defaults.gatewayName);
  const [gatewayNamespace, setGatewayNamespace] = useState(defaults.gatewayNamespace);
  const [hostnames, setHostnames] = useState(defaults.hostnames);
  const [rules, setRules] = useState<RouteRule[]>(defaults.rules);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const updateRule = (index: number, patch: Partial<RouteRule>) => {
    setRules((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...patch };
      return updated;
    });
  };

  const addRule = () => setRules([...rules, emptyRule()]);
  const removeRule = (index: number) => setRules(rules.filter((_, i) => i !== index));

  const addBackendToRule = (ruleIndex: number) => {
    updateRule(ruleIndex, {
      backends: [...rules[ruleIndex].backends, { name: "", namespace: "default", port: 80, weight: 100 }],
    });
  };

  const removeBackendFromRule = (ruleIndex: number, backendIndex: number) => {
    updateRule(ruleIndex, { backends: rules[ruleIndex].backends.filter((_, i) => i !== backendIndex) });
  };

  const updateBackend = (ruleIndex: number, backendIndex: number, field: keyof BackendRef, value: string | number) => {
    const updated = [...rules[ruleIndex].backends];
    updated[backendIndex] = { ...updated[backendIndex], [field]: value };
    updateRule(ruleIndex, { backends: updated });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const hostnameList = hostnames.split(",").map((h) => h.trim()).filter((h) => h);
    const validRules = rules.filter((r) => r.backends.some((b) => b.name.trim() !== ""));
    if (validRules.length === 0) { setError(t("create.route.error_need_backend")); setIsLoading(false); return; }
    if (!gatewayName) { setError(t("create.route.error_need_gateway")); setIsLoading(false); return; }
    if (!name.trim()) { setError(t("create.route.error_need_name")); setIsLoading(false); return; }

    const rulesYaml = validRules.map((rule) => {
      const validBackends = rule.backends.filter((b) => b.name.trim() !== "");
      const matchesParts: string[] = [];
      const hasPath = rule.pathMatch && rule.pathMatch !== "/";
      const hasMethod = rule.method !== "" && rule.method !== "__any__";
      const hasHeaders = rule.headerMatches.some((h) => h.name.trim());
      const hasQueryParams = rule.queryParamMatches.some((q) => q.name.trim());

      if (hasPath || hasMethod || hasHeaders || hasQueryParams) {
        const matchLines: string[] = [];
        if (hasPath) matchLines.push(`      path:\n          type: PathPrefix\n          value: ${rule.pathMatch}`);
        if (hasMethod) matchLines.push(`      method: ${rule.method}`);
        if (hasHeaders) {
          matchLines.push(`      headers:`);
          for (const h of rule.headerMatches) {
            if (!h.name.trim()) continue;
            matchLines.push(`      - type: ${h.type}\n        name: ${h.name}\n        value: ${h.value}`);
          }
        }
        if (hasQueryParams) {
          matchLines.push(`      queryParams:`);
          for (const q of rule.queryParamMatches) {
            if (!q.name.trim()) continue;
            matchLines.push(`      - type: ${q.type}\n        name: ${q.name}\n        value: ${q.value}`);
          }
        }
        matchesParts.push(matchLines.join("\n"));
      }

      const filterYaml = rule.filters.map((f) => yamlFilter(f, "      ")).filter(Boolean).join("\n");
      const timeoutYaml = rule.requestTimeout ? `      timeouts:\n        request: ${rule.requestTimeout}` : "";
      return `    - matches:\n${matchesParts.length > 0 ? `      - ${matchesParts.join("\n")}\n` : `      - path:\n          type: PathPrefix\n          value: /\n`}${filterYaml ? filterYaml + "\n" : ""}${timeoutYaml ? timeoutYaml + "\n" : ""}      backendRefs:\n${validBackends.map((b) => `        - name: ${b.name}\n          namespace: ${b.namespace}\n          port: ${b.port}\n          weight: ${b.weight}`).join("\n")}`;
    }).join("\n");

    const yaml = `apiVersion: gateway.networking.k8s.io/v1\nkind: HTTPRoute\nmetadata:\n  name: ${name}\n  namespace: ${namespace}\nspec:\n  parentRefs:\n    - name: ${gatewayName}\n      namespace: ${gatewayNamespace}\n${hostnameList.length > 0 ? `  hostnames:\n${hostnameList.map((h) => `    - ${h}`).join("\n")}\n` : ""}  rules:\n${rulesYaml}\n`;

    try {
      const path = mode === "edit" ? `/v1/resources/httproute/${namespace}/${name}` : "/v1/resources";
      const response = await applyResource(yaml, path);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Failed to ${mode}: ${response.status}`);
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      setError((err as Error).message || `Failed to ${mode} route`);
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
              {isEdit ? `Edit HTTPRoute` : t("create.route.title")}
            </h1>
            <p className="text-muted-foreground">
              {isEdit ? `Modify HTTPRoute ${name}` : t("create.route.description")}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t("create.route.basic_info_title")}</CardTitle>
                <CardDescription>{t("create.route.basic_info_desc")}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">{t("create.route.route_name")}</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("create.route.route_name_placeholder")} required disabled={isEdit} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="namespace">{t("create.route.namespace")}</Label>
                    <Select value={namespace} onValueChange={setNamespace} disabled={isEdit}>
                      <SelectTrigger><SelectValue placeholder="Select namespace" /></SelectTrigger>
                      <SelectContent>{namespaces.map((ns) => (<SelectItem key={ns} value={ns}>{ns}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="hostnames">{t("create.route.hostnames")}</Label>
                  <Input id="hostnames" value={hostnames} onChange={(e) => setHostnames(e.target.value)} placeholder="example.com, api.example.com" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t("create.route.gateway_ref_title")}</CardTitle>
                <CardDescription>{t("create.route.gateway_ref_desc")}</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="gw-name">{t("create.route.parent_gateway")}</Label>
                  <Select value={gatewayName} onValueChange={setGatewayName}>
                    <SelectTrigger><SelectValue placeholder={t("create.route.select_gateway")} /></SelectTrigger>
                    <SelectContent>
                      {gateways.map((gw) => (
                        <SelectItem key={`${gw.namespace}/${gw.name}`} value={gw.name}>
                          {gw.name} ({gw.namespace})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="gw-ns">{t("create.route.gateway_namespace")}</Label>
                  <Select value={gatewayNamespace} onValueChange={setGatewayNamespace}>
                    <SelectTrigger><SelectValue placeholder="Select namespace" /></SelectTrigger>
                    <SelectContent>{namespaces.map((ns) => (<SelectItem key={ns} value={ns}>{ns}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base">{t("create.route.rules_title")}</CardTitle>
                  <CardDescription>{t("create.route.rules_desc")}</CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addRule}>
                  <Plus className="h-4 w-4 mr-1" /> {t("create.route.add_rule")}
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {rules.map((rule, rIdx) => (
                  <Card key={rIdx}>
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">{t("create.route.rule_n", { n: rIdx + 1 })}</Label>
                        {rules.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeRule(rIdx)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label>{t("create.route.path_match")}</Label>
                          <Input value={rule.pathMatch} onChange={(e) => updateRule(rIdx, { pathMatch: e.target.value })} placeholder="/api/*" />
                        </div>
                        <div className="grid gap-2">
                          <Label>{t("create.route.method")}</Label>
                          <Select value={rule.method} onValueChange={(v) => updateRule(rIdx, { method: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{HTTP_METHODS.map((m) => (<SelectItem key={m} value={m}>{m === "__any__" ? "Any" : m}</SelectItem>))}</SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">{t("create.route.header_matches")}</Label>
                          {rule.headerMatches.map((hm, hIdx) => (
                            <div key={hIdx} className="flex gap-1 items-center">
                              <Select value={hm.type} onValueChange={(v) => {
                                const updated = [...rule.headerMatches];
                                updated[hIdx] = { ...updated[hIdx], type: v as "Exact" | "RegularExpression" };
                                updateRule(rIdx, { headerMatches: updated });
                              }}>
                                <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Exact">Exact</SelectItem>
                                  <SelectItem value="RegularExpression">Regex</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input className="h-8 text-xs w-24" placeholder="name" value={hm.name} onChange={(e) => {
                                const updated = [...rule.headerMatches];
                                updated[hIdx] = { ...updated[hIdx], name: e.target.value };
                                updateRule(rIdx, { headerMatches: updated });
                              }} />
                              <Input className="h-8 text-xs w-24" placeholder="value" value={hm.value} onChange={(e) => {
                                const updated = [...rule.headerMatches];
                                updated[hIdx] = { ...updated[hIdx], value: e.target.value };
                                updateRule(rIdx, { headerMatches: updated });
                              }} />
                              <Button type="button" variant="ghost" size="icon" className="h-8 w-8"
                                onClick={() => updateRule(rIdx, { headerMatches: rule.headerMatches.filter((_, j) => j !== hIdx) })}>
                                <Trash2 className="h-3 w-3 text-red-500" />
                              </Button>
                            </div>
                          ))}
                          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs"
                            onClick={() => updateRule(rIdx, { headerMatches: [...rule.headerMatches, { type: "Exact", name: "", value: "" }] })}>
                            <Plus className="h-3 w-3 mr-1" /> Add Header Match
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">{t("create.route.query_param_matches")}</Label>
                          {rule.queryParamMatches.map((q, qIdx) => (
                            <div key={qIdx} className="flex gap-1 items-center">
                              <Select value={q.type} onValueChange={(v) => {
                                const updated = [...rule.queryParamMatches];
                                updated[qIdx] = { ...updated[qIdx], type: v as "Exact" | "RegularExpression" };
                                updateRule(rIdx, { queryParamMatches: updated });
                              }}>
                                <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Exact">Exact</SelectItem>
                                  <SelectItem value="RegularExpression">Regex</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input className="h-8 text-xs w-20" placeholder="name" value={q.name} onChange={(e) => {
                                const updated = [...rule.queryParamMatches];
                                updated[qIdx] = { ...updated[qIdx], name: e.target.value };
                                updateRule(rIdx, { queryParamMatches: updated });
                              }} />
                              <Input className="h-8 text-xs w-20" placeholder="value" value={q.value} onChange={(e) => {
                                const updated = [...rule.queryParamMatches];
                                updated[qIdx] = { ...updated[qIdx], value: e.target.value };
                                updateRule(rIdx, { queryParamMatches: updated });
                              }} />
                              <Button type="button" variant="ghost" size="icon" className="h-8 w-8"
                                onClick={() => updateRule(rIdx, { queryParamMatches: rule.queryParamMatches.filter((_, j) => j !== qIdx) })}>
                                <Trash2 className="h-3 w-3 text-red-500" />
                              </Button>
                            </div>
                          ))}
                          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs"
                            onClick={() => updateRule(rIdx, { queryParamMatches: [...rule.queryParamMatches, { type: "Exact", name: "", value: "" }] })}>
                            <Plus className="h-3 w-3 mr-1" /> Add Query Param
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label className="text-xs">{t("create.route.request_timeout")}</Label>
                        <Input className="h-8 text-xs w-48" value={rule.requestTimeout} onChange={(e) => updateRule(rIdx, { requestTimeout: e.target.value })} placeholder="e.g. 5s, 30s" />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">{t("create.route.filters")}</Label>
                        {rule.filters.map((filter, fIdx) => (
                          <div key={fIdx} className="flex items-start gap-2">
                            <Select value={filter.type} onValueChange={(v) => {
                              const updated = [...rule.filters];
                              updated[fIdx] = { ...updated[fIdx], type: v as "RequestHeaderModifier" | "ResponseHeaderModifier" };
                              updateRule(rIdx, { filters: updated });
                            }}>
                              <SelectTrigger className="h-8 w-56 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>{FILTER_TYPES.map((ft) => (<SelectItem key={ft} value={ft}>{ft}</SelectItem>))}</SelectContent>
                            </Select>
                            <HeaderModifierSection label="Headers" config={filter.config} t={t}
                              onChange={(c) => {
                                const updated = [...rule.filters];
                                updated[fIdx] = { ...updated[fIdx], config: c };
                                updateRule(rIdx, { filters: updated });
                              }} />
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                              onClick={() => updateRule(rIdx, { filters: rule.filters.filter((_, j) => j !== fIdx) })}>
                              <Trash2 className="h-3 w-3 text-red-500" />
                            </Button>
                          </div>
                        ))}
                        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs"
                          onClick={() => updateRule(rIdx, { filters: [...rule.filters, emptyFilter()] })}>
                          <Plus className="h-3 w-3 mr-1" /> {t("create.route.add_filter")}
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">{t("create.route.backend_refs")}</Label>
                          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => addBackendToRule(rIdx)}>
                            <Plus className="h-3 w-3 mr-1" /> {t("create.route.add_backend")}
                          </Button>
                        </div>
                        {rule.backends.map((backend, bIdx) => (
                          <div key={bIdx} className="flex gap-2 items-center">
                            <Input className="h-8 text-xs w-36" placeholder="Service name" value={backend.name}
                              onChange={(e) => updateBackend(rIdx, bIdx, "name", e.target.value)} />
                            <Select value={backend.namespace} onValueChange={(v) => updateBackend(rIdx, bIdx, "namespace", v)}>
                              <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>{namespaces.map((ns) => (<SelectItem key={ns} value={ns}>{ns}</SelectItem>))}</SelectContent>
                            </Select>
                            <Input className="h-8 text-xs w-20" type="number" placeholder="Port" value={backend.port}
                              onChange={(e) => updateBackend(rIdx, bIdx, "port", parseInt(e.target.value, 10) || 0)} />
                            <Input className="h-8 text-xs w-20" type="number" placeholder="Weight" value={backend.weight}
                              onChange={(e) => updateBackend(rIdx, bIdx, "weight", parseInt(e.target.value, 10) || 0)} />
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                              onClick={() => removeBackendFromRule(rIdx, bIdx)}>
                              <Trash2 className="h-3 w-3 text-red-500" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>

            {error && (
              <Card className="border-red-500">
                <CardContent className="py-3 text-sm text-red-600">{error}</CardContent>
              </Card>
            )}

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => window.history.back()}>
                {t("create.route.cancel")}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEdit ? "Save Changes" : t("create.route.submit")}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
