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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { LocalizedLink } from "@/components/dashboard/localized-link";
import { applyResource } from "@/lib/api";
import { useNamespaces } from "@/hooks/use-api";
import { ManagedResource, KubernetesResource, unwrapResource } from "@/lib/admin-models";
import { ArrowLeft, Loader2 } from "lucide-react";

export interface AIServiceFormData {
  name: string;
  namespace: string;
  provider: string;
  format: string;
  model: string;
  authType: string;
  authSecret: string;
  authKey: string;
  authHeader: string;
  timeout: string;
  maxRetries: number;
  backoff: string;
  langfuseHost: string;
  langfusePublicKey: string;
  langfuseSecretKey: string;
  otelEndpoint: string;
  otelServiceName: string;
  // Model routing
  routingEnabled: boolean;
  routingComplexityThresholds: string;
  routingModelOverrides: string;
  // Semantic cache
  cacheEnabled: boolean;
  cacheTtl: string;
  cacheMaxTokens: number;
  // Prompt guard
  guardEnabled: boolean;
  guardMode: string;
  guardPatterns: string;
  guardKeywords: string;
  // Content safety
  safetyEnabled: boolean;
  safetyBlockMode: boolean;
  safetyCategories: string[];
  // PII masking
  piiEnabled: boolean;
  piiMode: string;
  piiEntityTypes: string[];
  // A/B testing
  abTestingEnabled: boolean;
  abTestingExperimentId: string;
  abTestingVariants: string;
  // Fallback chains
  fallbackEnabled: boolean;
  fallbackChains: string;
  // Cost tracking
  costTrackingEnabled: boolean;
  costInputPricePer1K: string;
  costOutputPricePer1K: string;
  costCurrency: string;
  // Multi-tenant
  multiTenantEnabled: boolean;
  multiTenantId: string;
  multiTenantAllowedModels: string;
  multiTenantCostLimit: string;
}

interface AIServiceFormProps {
  initialData?: AIServiceFormData;
  mode: "create" | "edit";
  onSuccess?: () => void;
}

function emptyAIServiceForm(): AIServiceFormData {
  return {
    name: "",
    namespace: "default",
    provider: "",
    format: "",
    model: "",
    authType: "",
    authSecret: "",
    authKey: "",
    authHeader: "",
    timeout: "",
    maxRetries: 0,
    backoff: "",
    langfuseHost: "",
    langfusePublicKey: "",
    langfuseSecretKey: "",
    otelEndpoint: "",
    otelServiceName: "",
    routingEnabled: false,
    routingComplexityThresholds: "",
    routingModelOverrides: "",
    cacheEnabled: false,
    cacheTtl: "",
    cacheMaxTokens: 0,
    guardEnabled: false,
    guardMode: "",
    guardPatterns: "",
    guardKeywords: "",
    safetyEnabled: false,
    safetyBlockMode: false,
    safetyCategories: [],
    piiEnabled: false,
    piiMode: "",
    piiEntityTypes: [],
    abTestingEnabled: false,
    abTestingExperimentId: "",
    abTestingVariants: "",
    fallbackEnabled: false,
    fallbackChains: "",
    costTrackingEnabled: false,
    costInputPricePer1K: "",
    costOutputPricePer1K: "",
    costCurrency: "",
    multiTenantEnabled: false,
    multiTenantId: "",
    multiTenantAllowedModels: "",
    multiTenantCostLimit: "",
  };
}

export function aiserviceResourceToFormData(resource: ManagedResource | KubernetesResource): AIServiceFormData {
  const r = unwrapResource(resource);
  const spec: Record<string, unknown> = r.spec || {};
  const metadata = (r.metadata || {}) as { name?: string; namespace?: string };
  const auth = (spec.auth as Record<string, unknown>) || {};
  const retry = (spec.retry as Record<string, unknown>) || {};
  const observability = (spec.observability as Record<string, unknown>) || {};
  const langfuse = ((observability as Record<string, unknown>).langfuse as Record<string, unknown>) || {};
  const otel = (observability.otel as Record<string, unknown>) || {};
  const routing = (spec.routing as Record<string, unknown>) || {};
  const cache = (spec.cache as Record<string, unknown>) || {};
  const guard = (spec.guard as Record<string, unknown>) || {};
  const safety = (spec.safety as Record<string, unknown>) || {};
  const pii = (spec.pii as Record<string, unknown>) || {};
  const abTesting = (spec.abTesting as Record<string, unknown>) || {};
  const fallback = (spec.fallback as Record<string, unknown>) || {};
  const costTracking = (spec.costTracking as Record<string, unknown>) || {};
  const multiTenant = (spec.multiTenant as Record<string, unknown>) || {};

  return {
    name: metadata.name || (resource as ManagedResource).name || "",
    namespace: metadata.namespace || (resource as ManagedResource).namespace || "default",
    provider: (spec.provider as string) || "",
    format: (spec.format as string) || "",
    model: (spec.model as string) || "",
    authType: (auth.type as string) || "",
    authSecret: (auth.secret as string) || "",
    authKey: (auth.key as string) || "",
    authHeader: (auth.header as string) || "",
    timeout: (spec.timeout as string) || "",
    maxRetries: (retry.maxRetries as number) || 0,
    backoff: (retry.backoff as string) || "",
    langfuseHost: (langfuse.host as string) || "",
    langfusePublicKey: (langfuse.publicKey as string) || "",
    langfuseSecretKey: (langfuse.secretKey as string) || "",
    otelEndpoint: (otel.endpoint as string) || "",
    otelServiceName: (otel.serviceName as string) || "",
    routingEnabled: (routing.enabled as boolean) === true,
    routingComplexityThresholds: routing.complexityThresholds ? JSON.stringify(routing.complexityThresholds) : "",
    routingModelOverrides: routing.modelOverrides ? JSON.stringify(routing.modelOverrides) : "",
    cacheEnabled: (cache.enabled as boolean) === true,
    cacheTtl: (cache.ttl as string) || "",
    cacheMaxTokens: (cache.maxTokens as number) || 0,
    guardEnabled: (guard.enabled as boolean) === true,
    guardMode: (guard.mode as string) || "",
    guardPatterns: Array.isArray(guard.patterns) ? (guard.patterns as string[]).join("\n") : "",
    guardKeywords: Array.isArray(guard.keywords) ? (guard.keywords as string[]).join("\n") : "",
    safetyEnabled: (safety.enabled as boolean) === true,
    safetyBlockMode: (safety.blockMode as boolean) === true,
    safetyCategories: Array.isArray(safety.categories) ? (safety.categories as string[]) : [],
    piiEnabled: (pii.enabled as boolean) === true,
    piiMode: (pii.mode as string) || "",
    piiEntityTypes: Array.isArray(pii.entityTypes) ? (pii.entityTypes as string[]) : [],
    abTestingEnabled: (abTesting.enabled as boolean) === true,
    abTestingExperimentId: (abTesting.experimentId as string) || "",
    abTestingVariants: abTesting.variants ? JSON.stringify(abTesting.variants) : "",
    fallbackEnabled: (fallback.enabled as boolean) === true,
    fallbackChains: fallback.chains ? JSON.stringify(fallback.chains) : "",
    costTrackingEnabled: (costTracking.enabled as boolean) === true,
    costInputPricePer1K: (costTracking.inputPricePer1K as string) || "",
    costOutputPricePer1K: (costTracking.outputPricePer1K as string) || "",
    costCurrency: (costTracking.currency as string) || "",
    multiTenantEnabled: (multiTenant.enabled as boolean) === true,
    multiTenantId: (multiTenant.id as string) || "",
    multiTenantAllowedModels: (multiTenant.allowedModels as string) || "",
    multiTenantCostLimit: (multiTenant.costLimit as string) || "",
  };
}

export function AIServiceForm({ initialData, mode, onSuccess }: AIServiceFormProps) {
  const t = useTranslations();
  const { data: namespacesData } = useNamespaces();
  const namespaces = (namespacesData as string[]) || ["default", "kube-system", "kube-public", "ingress"];

  const defaults = initialData || emptyAIServiceForm();
  const [name, setName] = useState(defaults.name);
  const [namespace, setNamespace] = useState(defaults.namespace);
  const [provider, setProvider] = useState(defaults.provider);
  const [format, setFormat] = useState(defaults.format);
  const [model, setModel] = useState(defaults.model);
  const [authType, setAuthType] = useState(defaults.authType);
  const [authSecret, setAuthSecret] = useState(defaults.authSecret);
  const [authKey, setAuthKey] = useState(defaults.authKey);
  const [authHeader, setAuthHeader] = useState(defaults.authHeader);
  const [timeout, setTimeout_] = useState(defaults.timeout);
  const [maxRetries, setMaxRetries] = useState(defaults.maxRetries);
  const [backoff, setBackoff] = useState(defaults.backoff);
  const [langfuseHost, setLangfuseHost] = useState(defaults.langfuseHost);
  const [langfusePublicKey, setLangfusePublicKey] = useState(defaults.langfusePublicKey);
  const [langfuseSecretKey, setLangfuseSecretKey] = useState(defaults.langfuseSecretKey);
  const [otelEndpoint, setOtelEndpoint] = useState(defaults.otelEndpoint);
  const [otelServiceName, setOtelServiceName] = useState(defaults.otelServiceName);
  const [routingEnabled, setRoutingEnabled] = useState(defaults.routingEnabled);
  const [routingComplexityThresholds, setRoutingComplexityThresholds] = useState(defaults.routingComplexityThresholds);
  const [routingModelOverrides, setRoutingModelOverrides] = useState(defaults.routingModelOverrides);
  const [cacheEnabled, setCacheEnabled] = useState(defaults.cacheEnabled);
  const [cacheTtl, setCacheTtl] = useState(defaults.cacheTtl);
  const [cacheMaxTokens, setCacheMaxTokens] = useState(defaults.cacheMaxTokens);
  const [guardEnabled, setGuardEnabled] = useState(defaults.guardEnabled);
  const [guardMode, setGuardMode] = useState(defaults.guardMode);
  const [guardPatterns, setGuardPatterns] = useState(defaults.guardPatterns);
  const [guardKeywords, setGuardKeywords] = useState(defaults.guardKeywords);
  const [safetyEnabled, setSafetyEnabled] = useState(defaults.safetyEnabled);
  const [safetyBlockMode, setSafetyBlockMode] = useState(defaults.safetyBlockMode);
  const [safetyCategories, setSafetyCategories] = useState<string[]>(defaults.safetyCategories);
  const [piiEnabled, setPiiEnabled] = useState(defaults.piiEnabled);
  const [piiMode, setPiiMode] = useState(defaults.piiMode);
  const [piiEntityTypes, setPiiEntityTypes] = useState<string[]>(defaults.piiEntityTypes);
  const [abTestingEnabled, setAbTestingEnabled] = useState(defaults.abTestingEnabled);
  const [abTestingExperimentId, setAbTestingExperimentId] = useState(defaults.abTestingExperimentId);
  const [abTestingVariants, setAbTestingVariants] = useState(defaults.abTestingVariants);
  const [fallbackEnabled, setFallbackEnabled] = useState(defaults.fallbackEnabled);
  const [fallbackChains, setFallbackChains] = useState(defaults.fallbackChains);
  const [costTrackingEnabled, setCostTrackingEnabled] = useState(defaults.costTrackingEnabled);
  const [costInputPricePer1K, setCostInputPricePer1K] = useState(defaults.costInputPricePer1K);
  const [costOutputPricePer1K, setCostOutputPricePer1K] = useState(defaults.costOutputPricePer1K);
  const [costCurrency, setCostCurrency] = useState(defaults.costCurrency);
  const [multiTenantEnabled, setMultiTenantEnabled] = useState(defaults.multiTenantEnabled);
  const [multiTenantId, setMultiTenantId] = useState(defaults.multiTenantId);
  const [multiTenantAllowedModels, setMultiTenantAllowedModels] = useState(defaults.multiTenantAllowedModels);
  const [multiTenantCostLimit, setMultiTenantCostLimit] = useState(defaults.multiTenantCostLimit);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const isEdit = mode === "edit";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (!name.trim()) {
      setError(t("aiservice.create.error_need_name"));
      setIsLoading(false);
      return;
    }

    if (!provider.trim()) {
      setError(t("aiservice.create.error_need_provider"));
      setIsLoading(false);
      return;
    }

    if (!model.trim()) {
      setError(t("aiservice.create.error_need_model"));
      setIsLoading(false);
      return;
    }

    const authYaml = authType.trim()
      ? `\n  auth:
    type: ${authType.trim()}${authSecret.trim() ? `\n    secret: ${authSecret.trim()}` : ""}${authKey.trim() ? `\n    key: ${authKey.trim()}` : ""}${authHeader.trim() ? `\n    header: ${authHeader.trim()}` : ""}`
      : "";

    const retryYaml = maxRetries > 0
      ? `\n  retry:
    maxRetries: ${maxRetries}${backoff.trim() ? `\n    backoff: ${backoff.trim()}` : ""}`
      : maxRetries === 0 && backoff.trim()
        ? `\n  retry:\n    backoff: ${backoff.trim()}`
        : "";

    let observabilityYaml = "";
    const hasLangfuse = langfuseHost.trim() || langfusePublicKey.trim() || langfuseSecretKey.trim();
    const hasOtel = otelEndpoint.trim() || otelServiceName.trim();

    if (hasLangfuse || hasOtel) {
      observabilityYaml = "\n  observability:";
      if (hasLangfuse) {
        observabilityYaml += `\n    langfuse:${langfuseHost.trim() ? `\n      host: ${langfuseHost.trim()}` : ""}${langfusePublicKey.trim() ? `\n      publicKey: ${langfusePublicKey.trim()}` : ""}${langfuseSecretKey.trim() ? `\n      secretKey: ${langfuseSecretKey.trim()}` : ""}`;
      }
      if (hasOtel) {
        observabilityYaml += `\n    otel:${otelEndpoint.trim() ? `\n      endpoint: ${otelEndpoint.trim()}` : ""}${otelServiceName.trim() ? `\n      serviceName: ${otelServiceName.trim()}` : ""}`;
      }
    }

    let routingYaml = "";
    if (routingEnabled) {
      routingYaml = "\n  routing:\n    enabled: true";
      if (routingComplexityThresholds.trim()) {
        routingYaml += `\n    complexityThresholds: ${routingComplexityThresholds.trim()}`;
      }
      if (routingModelOverrides.trim()) {
        routingYaml += `\n    modelOverrides: ${routingModelOverrides.trim()}`;
      }
    }

    let cacheYaml = "";
    if (cacheEnabled) {
      cacheYaml = "\n  cache:\n    enabled: true";
      if (cacheTtl.trim()) {
        cacheYaml += `\n    ttl: ${cacheTtl.trim()}`;
      }
      if (cacheMaxTokens > 0) {
        cacheYaml += `\n    maxTokens: ${cacheMaxTokens}`;
      }
    }

    let guardYaml = "";
    if (guardEnabled) {
      guardYaml = "\n  guard:\n    enabled: true";
      if (guardMode.trim()) {
        guardYaml += `\n    mode: ${guardMode.trim()}`;
      }
      if (guardPatterns.trim()) {
        guardYaml += `\n    patterns:${guardPatterns.trim().split("\n").filter(Boolean).map((p) => `\n      - ${p}`).join("")}`;
      }
      if (guardKeywords.trim()) {
        guardYaml += `\n    keywords:${guardKeywords.trim().split("\n").filter(Boolean).map((k) => `\n      - ${k}`).join("")}`;
      }
    }

    let safetyYaml = "";
    if (safetyEnabled) {
      safetyYaml = "\n  safety:\n    enabled: true";
      safetyYaml += `\n    blockMode: ${safetyBlockMode}`;
      if (safetyCategories.length > 0) {
        safetyYaml += `\n    categories:${safetyCategories.map((c) => `\n      - ${c}`).join("")}`;
      }
    }

    let piiYaml = "";
    if (piiEnabled) {
      piiYaml = "\n  pii:\n    enabled: true";
      if (piiMode.trim()) {
        piiYaml += `\n    mode: ${piiMode.trim()}`;
      }
      if (piiEntityTypes.length > 0) {
        piiYaml += `\n    entityTypes:${piiEntityTypes.map((e) => `\n      - ${e}`).join("")}`;
      }
    }

    let abTestingYaml = "";
    if (abTestingEnabled) {
      abTestingYaml = "\n  abTesting:\n    enabled: true";
      if (abTestingExperimentId.trim()) {
        abTestingYaml += `\n    experimentId: ${abTestingExperimentId.trim()}`;
      }
      if (abTestingVariants.trim()) {
        abTestingYaml += `\n    variants: ${abTestingVariants.trim()}`;
      }
    }

    let fallbackYaml = "";
    if (fallbackEnabled) {
      fallbackYaml = "\n  fallback:\n    enabled: true";
      if (fallbackChains.trim()) {
        fallbackYaml += `\n    chains: ${fallbackChains.trim()}`;
      }
    }

    let costTrackingYaml = "";
    if (costTrackingEnabled) {
      costTrackingYaml = "\n  costTracking:\n    enabled: true";
      if (costInputPricePer1K.trim()) {
        costTrackingYaml += `\n    inputPricePer1K: ${costInputPricePer1K.trim()}`;
      }
      if (costOutputPricePer1K.trim()) {
        costTrackingYaml += `\n    outputPricePer1K: ${costOutputPricePer1K.trim()}`;
      }
      if (costCurrency.trim()) {
        costTrackingYaml += `\n    currency: ${costCurrency.trim()}`;
      }
    }

    let multiTenantYaml = "";
    if (multiTenantEnabled) {
      multiTenantYaml = "\n  multiTenant:\n    enabled: true";
      if (multiTenantId.trim()) {
        multiTenantYaml += `\n    id: ${multiTenantId.trim()}`;
      }
      if (multiTenantAllowedModels.trim()) {
        multiTenantYaml += `\n    allowedModels: ${multiTenantAllowedModels.trim()}`;
      }
      if (multiTenantCostLimit.trim()) {
        multiTenantYaml += `\n    costLimit: ${multiTenantCostLimit.trim()}`;
      }
    }

    const yaml = `apiVersion: gateway.nantian.dev/v1alpha1
kind: AIService
metadata:
  name: ${name.trim()}
  namespace: ${namespace}
spec:
  provider: ${provider.trim()}${format.trim() ? `\n  format: ${format.trim()}` : ""}
  model: ${model.trim()}${timeout.trim() ? `\n  timeout: ${timeout.trim()}` : ""}${authYaml}${retryYaml}${observabilityYaml}${routingYaml}${cacheYaml}${guardYaml}${safetyYaml}${piiYaml}${abTestingYaml}${fallbackYaml}${costTrackingYaml}${multiTenantYaml}
`;

    try {
      const path = isEdit
        ? `/v1/resources/aiservice/${namespace}/${name.trim()}`
        : "/v1/resources";
      const response = await applyResource(yaml, path);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Failed to ${isEdit ? "update" : "create"}: ${response.status}`);
      }
      onSuccess?.();
    } catch (err) {
      setError((err as Error).message || t("aiservice.create.error_failed"));
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center py-8">
      <div className="w-full max-w-3xl px-4">
        <div className="flex items-center gap-4 mb-8">
          <LocalizedLink href="/ai/services">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </LocalizedLink>
          <div>
            <h1 className="text-3xl font-bold">{isEdit ? t("aiservice.edit.title") : t("aiservice.create.title")}</h1>
            <p className="text-muted-foreground">{isEdit ? t("aiservice.edit.description") : t("aiservice.create.description")}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("aiservice.create.basic_info")}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">{t("aiservice.create.name")} *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t("aiservice.create.name_placeholder")}
                      required
                      disabled={isEdit}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="namespace">{t("aiservice.create.namespace")} *</Label>
                    <Select value={namespace} onValueChange={setNamespace} disabled={isEdit}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {namespaces.map((ns) => (
                          <SelectItem key={ns} value={ns}>{ns}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="provider">{t("aiservice.create.provider")} *</Label>
                    <Input
                      id="provider"
                      value={provider}
                      onChange={(e) => setProvider(e.target.value)}
                      placeholder={t("aiservice.create.provider_placeholder")}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="format">{t("aiservice.create.format")}</Label>
                    <Select value={format} onValueChange={setFormat}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("aiservice.create.format_placeholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">openai</SelectItem>
                        <SelectItem value="anthropic">anthropic</SelectItem>
                        <SelectItem value="google">google</SelectItem>
                        <SelectItem value="aws-bedrock">aws-bedrock</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="model">{t("aiservice.create.model")} *</Label>
                    <Input
                      id="model"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder={t("aiservice.create.model_placeholder")}
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("aiservice.create.auth_title")}</CardTitle>
                <CardDescription>{t("aiservice.create.auth_desc")}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="grid gap-2">
                    <Label>{t("aiservice.create.auth_type")}</Label>
                    <Select value={authType} onValueChange={setAuthType}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("aiservice.create.auth_type_placeholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="apiKey">apiKey</SelectItem>
                        <SelectItem value="bearer">bearer</SelectItem>
                        <SelectItem value="basic">basic</SelectItem>
                        <SelectItem value="custom">custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>{t("aiservice.create.auth_secret")}</Label>
                    <Input
                      value={authSecret}
                      onChange={(e) => setAuthSecret(e.target.value)}
                      placeholder={t("aiservice.create.auth_secret_placeholder")}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t("aiservice.create.auth_key")}</Label>
                    <Input
                      value={authKey}
                      onChange={(e) => setAuthKey(e.target.value)}
                      placeholder={t("aiservice.create.auth_key_placeholder")}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t("aiservice.create.auth_header")}</Label>
                    <Input
                      value={authHeader}
                      onChange={(e) => setAuthHeader(e.target.value)}
                      placeholder={t("aiservice.create.auth_header_placeholder")}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("aiservice.create.settings_title")}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label>{t("aiservice.create.timeout")}</Label>
                    <Input
                      value={timeout}
                      onChange={(e) => setTimeout_(e.target.value)}
                      placeholder={t("aiservice.create.timeout_placeholder")}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t("aiservice.create.max_retries")}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={maxRetries}
                      onChange={(e) => setMaxRetries(parseInt(e.target.value, 10) || 0)}
                      placeholder="3"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t("aiservice.create.backoff")}</Label>
                    <Input
                      value={backoff}
                      onChange={(e) => setBackoff(e.target.value)}
                      placeholder={t("aiservice.create.backoff_placeholder")}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("aiservice.create.observability_title")}</CardTitle>
                <CardDescription>{t("aiservice.create.observability_desc")}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6">
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">{t("aiservice.create.langfuse_title")}</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label>{t("aiservice.create.langfuse_host")}</Label>
                      <Input
                        value={langfuseHost}
                        onChange={(e) => setLangfuseHost(e.target.value)}
                        placeholder={t("aiservice.create.langfuse_host_placeholder")}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>{t("aiservice.create.langfuse_public_key")}</Label>
                      <Input
                        value={langfusePublicKey}
                        onChange={(e) => setLangfusePublicKey(e.target.value)}
                        placeholder="pk-..."
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>{t("aiservice.create.langfuse_secret_key")}</Label>
                      <Input
                        type="password"
                        value={langfuseSecretKey}
                        onChange={(e) => setLangfuseSecretKey(e.target.value)}
                        placeholder="sk-..."
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">{t("aiservice.create.otel_title")}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>{t("aiservice.create.otel_endpoint")}</Label>
                      <Input
                        value={otelEndpoint}
                        onChange={(e) => setOtelEndpoint(e.target.value)}
                        placeholder={t("aiservice.create.otel_endpoint_placeholder")}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>{t("aiservice.create.otel_service_name")}</Label>
                      <Input
                        value={otelServiceName}
                        onChange={(e) => setOtelServiceName(e.target.value)}
                        placeholder={t("aiservice.create.otel_service_name_placeholder")}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{t("aiservice.create.routing_title")}</CardTitle>
                    <CardDescription>{t("aiservice.create.routing_desc")}</CardDescription>
                  </div>
                  <Checkbox
                    checked={routingEnabled}
                    onCheckedChange={setRoutingEnabled}
                  />
                </div>
              </CardHeader>
              {routingEnabled && (
                <CardContent className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>{t("aiservice.create.routing_thresholds")}</Label>
                    <Textarea
                      value={routingComplexityThresholds}
                      onChange={(e) => setRoutingComplexityThresholds(e.target.value)}
                      placeholder='{"simple": 100, "medium": 500}'
                      rows={2}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t("aiservice.create.routing_overrides")}</Label>
                    <Textarea
                      value={routingModelOverrides}
                      onChange={(e) => setRoutingModelOverrides(e.target.value)}
                      placeholder='{"simple": "gpt-4o-mini", "medium": "gpt-4o", "complex": "o1"}'
                      rows={3}
                    />
                  </div>
                </CardContent>
              )}
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{t("aiservice.create.cache_title")}</CardTitle>
                    <CardDescription>{t("aiservice.create.cache_desc")}</CardDescription>
                  </div>
                  <Checkbox
                    checked={cacheEnabled}
                    onCheckedChange={setCacheEnabled}
                  />
                </div>
              </CardHeader>
              {cacheEnabled && (
                <CardContent className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>{t("aiservice.create.cache_ttl")}</Label>
                      <Input
                        value={cacheTtl}
                        onChange={(e) => setCacheTtl(e.target.value)}
                        placeholder="3600s"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>{t("aiservice.create.cache_max_tokens")}</Label>
                      <Input
                        type="number"
                        min={0}
                        value={cacheMaxTokens}
                        onChange={(e) => setCacheMaxTokens(parseInt(e.target.value, 10) || 0)}
                        placeholder="4096"
                      />
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{t("aiservice.create.guard_title")}</CardTitle>
                    <CardDescription>{t("aiservice.create.guard_desc")}</CardDescription>
                  </div>
                  <Checkbox
                    checked={guardEnabled}
                    onCheckedChange={setGuardEnabled}
                  />
                </div>
              </CardHeader>
              {guardEnabled && (
                <CardContent className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>{t("aiservice.create.guard_mode")}</Label>
                    <Select value={guardMode} onValueChange={setGuardMode}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("aiservice.create.guard_mode_placeholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="block">block</SelectItem>
                        <SelectItem value="warn">warn</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>{t("aiservice.create.guard_patterns")}</Label>
                    <Textarea
                      value={guardPatterns}
                      onChange={(e) => setGuardPatterns(e.target.value)}
                      placeholder="^DROP\s+TABLE|^DELETE\s+FROM"
                      rows={3}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t("aiservice.create.guard_keywords")}</Label>
                    <Textarea
                      value={guardKeywords}
                      onChange={(e) => setGuardKeywords(e.target.value)}
                      placeholder="password\nsecret\napi_key"
                      rows={3}
                    />
                  </div>
                </CardContent>
              )}
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{t("aiservice.create.safety_title")}</CardTitle>
                    <CardDescription>{t("aiservice.create.safety_desc")}</CardDescription>
                  </div>
                  <Checkbox
                    checked={safetyEnabled}
                    onCheckedChange={setSafetyEnabled}
                  />
                </div>
              </CardHeader>
              {safetyEnabled && (
                <CardContent className="grid gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={safetyBlockMode}
                      onCheckedChange={setSafetyBlockMode}
                    />
                    <Label>{t("aiservice.create.safety_block_mode")}</Label>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("aiservice.create.safety_categories")}</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: "violence", labelKey: "aiservice.create.safety_violence" as const },
                        { value: "hate", labelKey: "aiservice.create.safety_hate" as const },
                        { value: "self_harm", labelKey: "aiservice.create.safety_self_harm" as const },
                        { value: "exploitation", labelKey: "aiservice.create.safety_exploitation" as const },
                        { value: "illegal", labelKey: "aiservice.create.safety_illegal" as const },
                      ].map((cat) => (
                        <div key={cat.value} className="flex items-center gap-2">
                          <Checkbox
                            checked={safetyCategories.includes(cat.value)}
                            onCheckedChange={(checked) =>
                              setSafetyCategories(
                                checked
                                  ? [...safetyCategories, cat.value]
                                  : safetyCategories.filter((c) => c !== cat.value)
                              )
                            }
                          />
                          <Label className="font-normal">{t(cat.labelKey)}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{t("aiservice.create.pii_title")}</CardTitle>
                    <CardDescription>{t("aiservice.create.pii_desc")}</CardDescription>
                  </div>
                  <Checkbox
                    checked={piiEnabled}
                    onCheckedChange={setPiiEnabled}
                  />
                </div>
              </CardHeader>
              {piiEnabled && (
                <CardContent className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>{t("aiservice.create.pii_mode")}</Label>
                    <Select value={piiMode} onValueChange={setPiiMode}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("aiservice.create.pii_mode_placeholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mask">mask</SelectItem>
                        <SelectItem value="redact">redact</SelectItem>
                        <SelectItem value="anonymize">anonymize</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("aiservice.create.pii_entity_types")}</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: "email", labelKey: "aiservice.create.pii_email" as const },
                        { value: "phone", labelKey: "aiservice.create.pii_phone" as const },
                        { value: "credit-card", labelKey: "aiservice.create.pii_credit_card" as const },
                        { value: "id-card", labelKey: "aiservice.create.pii_id_card" as const },
                        { value: "url", labelKey: "aiservice.create.pii_url" as const },
                        { value: "ip", labelKey: "aiservice.create.pii_ip" as const },
                      ].map((ent) => (
                        <div key={ent.value} className="flex items-center gap-2">
                          <Checkbox
                            checked={piiEntityTypes.includes(ent.value)}
                            onCheckedChange={(checked) =>
                              setPiiEntityTypes(
                                checked
                                  ? [...piiEntityTypes, ent.value]
                                  : piiEntityTypes.filter((e) => e !== ent.value)
                              )
                            }
                          />
                          <Label className="font-normal">{t(ent.labelKey)}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{t("aiservice.create.ab_testing_title")}</CardTitle>
                    <CardDescription>{t("aiservice.create.ab_testing_desc")}</CardDescription>
                  </div>
                  <Checkbox
                    checked={abTestingEnabled}
                    onCheckedChange={setAbTestingEnabled}
                  />
                </div>
              </CardHeader>
              {abTestingEnabled && (
                <CardContent className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>{t("aiservice.create.ab_testing_experiment_id")}</Label>
                    <Input
                      value={abTestingExperimentId}
                      onChange={(e) => setAbTestingExperimentId(e.target.value)}
                      placeholder="exp-001"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t("aiservice.create.ab_testing_variants")}</Label>
                    <Textarea
                      value={abTestingVariants}
                      onChange={(e) => setAbTestingVariants(e.target.value)}
                      placeholder='[{"name": "A", "model": "gpt-4o", "weight": 50}, {"name": "B", "model": "claude-3", "weight": 50}]'
                      rows={4}
                    />
                  </div>
                </CardContent>
              )}
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{t("aiservice.create.fallback_title")}</CardTitle>
                    <CardDescription>{t("aiservice.create.fallback_desc")}</CardDescription>
                  </div>
                  <Checkbox
                    checked={fallbackEnabled}
                    onCheckedChange={setFallbackEnabled}
                  />
                </div>
              </CardHeader>
              {fallbackEnabled && (
                <CardContent className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>{t("aiservice.create.fallback_chains")}</Label>
                    <Textarea
                      value={fallbackChains}
                      onChange={(e) => setFallbackChains(e.target.value)}
                      placeholder='[{"primary": "gpt-4o", "fallbacks": [{"model": "claude-3", "timeout": true, "statusCodes": [429, 500]}]}]'
                      rows={4}
                    />
                  </div>
                </CardContent>
              )}
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{t("aiservice.create.cost_title")}</CardTitle>
                    <CardDescription>{t("aiservice.create.cost_desc")}</CardDescription>
                  </div>
                  <Checkbox
                    checked={costTrackingEnabled}
                    onCheckedChange={setCostTrackingEnabled}
                  />
                </div>
              </CardHeader>
              {costTrackingEnabled && (
                <CardContent className="grid gap-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label>{t("aiservice.create.cost_input_price")}</Label>
                      <Input
                        value={costInputPricePer1K}
                        onChange={(e) => setCostInputPricePer1K(e.target.value)}
                        placeholder="0.03"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>{t("aiservice.create.cost_output_price")}</Label>
                      <Input
                        value={costOutputPricePer1K}
                        onChange={(e) => setCostOutputPricePer1K(e.target.value)}
                        placeholder="0.06"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>{t("aiservice.create.cost_currency")}</Label>
                      <Select value={costCurrency} onValueChange={setCostCurrency}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("aiservice.create.cost_currency_placeholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="CNY">CNY</SelectItem>
                          <SelectItem value="JPY">JPY</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{t("aiservice.create.multi_tenant_title")}</CardTitle>
                    <CardDescription>{t("aiservice.create.multi_tenant_desc")}</CardDescription>
                  </div>
                  <Checkbox
                    checked={multiTenantEnabled}
                    onCheckedChange={setMultiTenantEnabled}
                  />
                </div>
              </CardHeader>
              {multiTenantEnabled && (
                <CardContent className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>{t("aiservice.create.multi_tenant_id")}</Label>
                      <Input
                        value={multiTenantId}
                        onChange={(e) => setMultiTenantId(e.target.value)}
                        placeholder="tenant-001"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>{t("aiservice.create.multi_tenant_cost_limit")}</Label>
                      <Input
                        value={multiTenantCostLimit}
                        onChange={(e) => setMultiTenantCostLimit(e.target.value)}
                        placeholder="1000"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>{t("aiservice.create.multi_tenant_models")}</Label>
                    <Input
                      value={multiTenantAllowedModels}
                      onChange={(e) => setMultiTenantAllowedModels(e.target.value)}
                      placeholder="gpt-4o,claude-3,gemini-pro"
                    />
                  </div>
                </CardContent>
              )}
            </Card>

            {error && (
              <Card className="border-red-500">
                <CardContent className="py-3 text-sm text-red-600">{error}</CardContent>
              </Card>
            )}

            <div className="flex justify-end gap-4">
              <LocalizedLink href="/ai/services">
                <Button type="button" variant="outline">{t("aiservice.create.cancel")}</Button>
              </LocalizedLink>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isLoading
                  ? (isEdit ? t("aiservice.edit.saving") : t("aiservice.create.creating"))
                  : (isEdit ? t("aiservice.edit.submit") : t("aiservice.create.submit"))}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
