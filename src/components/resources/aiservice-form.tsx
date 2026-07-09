"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LocalizedLink } from "@/components/dashboard/localized-link";
import { applyResource } from "@/lib/api";
import { useNamespaces } from "@/hooks/use-api";
import { ManagedResource, KubernetesResource, unwrapResource } from "@/lib/admin-models";
import { ArrowLeft, Loader2 } from "lucide-react";
import { AIServiceBasicInfo } from "./aiservice-form/basic-info-section";
import { AIServiceObservability } from "./aiservice-form/observability-section";
import { AIServiceModelRouting } from "./aiservice-form/model-routing-section";
import { PromptGuardSection } from "./aiservice-form/prompt-guard-section";
import { ContentSafetySection } from "./aiservice-form/content-safety-section";
import { PIIMaskingSection } from "./aiservice-form/pii-masking-section";
import { SemanticCacheSection } from "./aiservice-form/semantic-cache-section";
import { ABTestingSection } from "./aiservice-form/ab-testing-section";
import { FallbackChainsSection } from "./aiservice-form/fallback-chains-section";
import { CostTrackingSection } from "./aiservice-form/cost-tracking-section";
import { MultiTenantSection } from "./aiservice-form/multi-tenant-section";

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
            <AIServiceBasicInfo
              name={name} onNameChange={setName}
              namespace={namespace} onNamespaceChange={setNamespace}
              provider={provider} onProviderChange={setProvider}
              format={format} onFormatChange={setFormat}
              model={model} onModelChange={setModel}
              authType={authType} onAuthTypeChange={setAuthType}
              authSecret={authSecret} onAuthSecretChange={setAuthSecret}
              authKey={authKey} onAuthKeyChange={setAuthKey}
              authHeader={authHeader} onAuthHeaderChange={setAuthHeader}
              timeout={timeout} onTimeoutChange={setTimeout_}
              maxRetries={maxRetries} onMaxRetriesChange={setMaxRetries}
              backoff={backoff} onBackoffChange={setBackoff}
              isEdit={isEdit}
              namespaces={namespaces}
            />

            <AIServiceObservability
              langfuseHost={langfuseHost} onLangfuseHostChange={setLangfuseHost}
              langfusePublicKey={langfusePublicKey} onLangfusePublicKeyChange={setLangfusePublicKey}
              langfuseSecretKey={langfuseSecretKey} onLangfuseSecretKeyChange={setLangfuseSecretKey}
              otelEndpoint={otelEndpoint} onOtelEndpointChange={setOtelEndpoint}
              otelServiceName={otelServiceName} onOtelServiceNameChange={setOtelServiceName}
            />

            <AIServiceModelRouting
              routingEnabled={routingEnabled} onRoutingEnabledChange={setRoutingEnabled}
              routingComplexityThresholds={routingComplexityThresholds} onRoutingComplexityThresholdsChange={setRoutingComplexityThresholds}
              routingModelOverrides={routingModelOverrides} onRoutingModelOverridesChange={setRoutingModelOverrides}
            />

            <SemanticCacheSection
              cacheEnabled={cacheEnabled}
              onCacheEnabledChange={setCacheEnabled}
              cacheTtl={cacheTtl}
              onCacheTtlChange={setCacheTtl}
              cacheMaxTokens={cacheMaxTokens}
              onCacheMaxTokensChange={setCacheMaxTokens}
            />

            <PromptGuardSection
              guardEnabled={guardEnabled}
              onGuardEnabledChange={setGuardEnabled}
              guardMode={guardMode}
              onGuardModeChange={setGuardMode}
              guardPatterns={guardPatterns}
              onGuardPatternsChange={setGuardPatterns}
              guardKeywords={guardKeywords}
              onGuardKeywordsChange={setGuardKeywords}
            />

            <ContentSafetySection
              safetyEnabled={safetyEnabled}
              onSafetyEnabledChange={setSafetyEnabled}
              safetyBlockMode={safetyBlockMode}
              onSafetyBlockModeChange={setSafetyBlockMode}
              safetyCategories={safetyCategories}
              onSafetyCategoriesChange={setSafetyCategories}
            />

            <PIIMaskingSection
              piiEnabled={piiEnabled}
              onPiiEnabledChange={setPiiEnabled}
              piiMode={piiMode}
              onPiiModeChange={setPiiMode}
              piiEntityTypes={piiEntityTypes}
              onPiiEntityTypesChange={setPiiEntityTypes}
            />

            <ABTestingSection
              abTestingEnabled={abTestingEnabled}
              onAbTestingEnabledChange={setAbTestingEnabled}
              abTestingExperimentId={abTestingExperimentId}
              onAbTestingExperimentIdChange={setAbTestingExperimentId}
              abTestingVariants={abTestingVariants}
              onAbTestingVariantsChange={setAbTestingVariants}
            />

            <FallbackChainsSection
              fallbackEnabled={fallbackEnabled}
              onFallbackEnabledChange={setFallbackEnabled}
              fallbackChains={fallbackChains}
              onFallbackChainsChange={setFallbackChains}
            />

            <CostTrackingSection
              costTrackingEnabled={costTrackingEnabled}
              onCostTrackingEnabledChange={setCostTrackingEnabled}
              costInputPricePer1K={costInputPricePer1K}
              onCostInputPricePer1KChange={setCostInputPricePer1K}
              costOutputPricePer1K={costOutputPricePer1K}
              onCostOutputPricePer1KChange={setCostOutputPricePer1K}
              costCurrency={costCurrency}
              onCostCurrencyChange={setCostCurrency}
            />

            <MultiTenantSection
              multiTenantEnabled={multiTenantEnabled}
              onMultiTenantEnabledChange={setMultiTenantEnabled}
              multiTenantId={multiTenantId}
              onMultiTenantIdChange={setMultiTenantId}
              multiTenantAllowedModels={multiTenantAllowedModels}
              onMultiTenantAllowedModelsChange={setMultiTenantAllowedModels}
              multiTenantCostLimit={multiTenantCostLimit}
              onMultiTenantCostLimitChange={setMultiTenantCostLimit}
            />

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
