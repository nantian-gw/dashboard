/**
 * Builds a Kubernetes AIService YAML string from form data fields.
 */
export function buildAIServiceYaml(data: {
  name: string;
  namespace: string;
  provider: string;
  format: string;
  model: string;
  endpoint: string;
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
  routingEnabled: boolean;
  routingComplexityThresholds: string;
  routingModelOverrides: string;
  cacheEnabled: boolean;
  cacheTtl: string;
  cacheMaxTokens: number;
  guardEnabled: boolean;
  guardMode: string;
  guardPatterns: string;
  guardKeywords: string;
  safetyEnabled: boolean;
  safetyBlockMode: boolean;
  safetyCategories: string[];
  piiEnabled: boolean;
  piiMode: string;
  piiEntityTypes: string[];
  abTestingEnabled: boolean;
  abTestingExperimentId: string;
  abTestingVariants: string;
  fallbackEnabled: boolean;
  fallbackChains: string;
  costTrackingEnabled: boolean;
  costInputPricePer1K: string;
  costOutputPricePer1K: string;
  costCurrency: string;
  multiTenantEnabled: boolean;
  multiTenantId: string;
  multiTenantAllowedModels: string;
  multiTenantCostLimit: string;
}): string {
  const authYaml = data.authType.trim()
    ? `\n  auth:\n    type: ${data.authType.trim()}${data.authSecret.trim() ? `\n    secret: ${data.authSecret.trim()}` : ""}${data.authKey.trim() ? `\n    key: ${data.authKey.trim()}` : ""}${data.authHeader.trim() ? `\n    header: ${data.authHeader.trim()}` : ""}`
    : "";

  const retryYaml = data.maxRetries > 0
    ? `\n  retry:\n    maxRetries: ${data.maxRetries}${data.backoff.trim() ? `\n    backoff: ${data.backoff.trim()}` : ""}`
    : data.maxRetries === 0 && data.backoff.trim()
      ? `\n  retry:\n    backoff: ${data.backoff.trim()}`
      : "";

  let observabilityYaml = "";
  const hasLangfuse = data.langfuseHost.trim() || data.langfusePublicKey.trim() || data.langfuseSecretKey.trim();
  const hasOtel = data.otelEndpoint.trim() || data.otelServiceName.trim();

  if (hasLangfuse || hasOtel) {
    observabilityYaml = "\n  observability:";
    if (hasLangfuse) {
      observabilityYaml += `\n    langfuse:${data.langfuseHost.trim() ? `\n      host: ${data.langfuseHost.trim()}` : ""}${data.langfusePublicKey.trim() ? `\n      publicKey: ${data.langfusePublicKey.trim()}` : ""}${data.langfuseSecretKey.trim() ? `\n      secretKey: ${data.langfuseSecretKey.trim()}` : ""}`;
    }
    if (hasOtel) {
      observabilityYaml += `\n    otel:${data.otelEndpoint.trim() ? `\n      endpoint: ${data.otelEndpoint.trim()}` : ""}${data.otelServiceName.trim() ? `\n      serviceName: ${data.otelServiceName.trim()}` : ""}`;
    }
  }

  let routingYaml = "";
  if (data.routingEnabled) {
    routingYaml = "\n  routing:\n    enabled: true";
    if (data.routingComplexityThresholds.trim()) {
      routingYaml += `\n    complexityThresholds: ${data.routingComplexityThresholds.trim()}`;
    }
    if (data.routingModelOverrides.trim()) {
      routingYaml += `\n    modelOverrides: ${data.routingModelOverrides.trim()}`;
    }
  }

  let cacheYaml = "";
  if (data.cacheEnabled) {
    cacheYaml = "\n  cache:\n    enabled: true";
    if (data.cacheTtl.trim()) {
      cacheYaml += `\n    ttl: ${data.cacheTtl.trim()}`;
    }
    if (data.cacheMaxTokens > 0) {
      cacheYaml += `\n    maxTokens: ${data.cacheMaxTokens}`;
    }
  }

  let guardYaml = "";
  if (data.guardEnabled) {
    guardYaml = "\n  guard:\n    enabled: true";
    if (data.guardMode.trim()) {
      guardYaml += `\n    mode: ${data.guardMode.trim()}`;
    }
    if (data.guardPatterns.trim()) {
      guardYaml += `\n    patterns:${data.guardPatterns.trim().split("\n").filter(Boolean).map((p) => `\n      - ${p}`).join("")}`;
    }
    if (data.guardKeywords.trim()) {
      guardYaml += `\n    keywords:${data.guardKeywords.trim().split("\n").filter(Boolean).map((k) => `\n      - ${k}`).join("")}`;
    }
  }

  let safetyYaml = "";
  if (data.safetyEnabled) {
    safetyYaml = "\n  safety:\n    enabled: true";
    safetyYaml += `\n    blockMode: ${data.safetyBlockMode}`;
    if (data.safetyCategories.length > 0) {
      safetyYaml += `\n    categories:${data.safetyCategories.map((c) => `\n      - ${c}`).join("")}`;
    }
  }

  let piiYaml = "";
  if (data.piiEnabled) {
    piiYaml = "\n  pii:\n    enabled: true";
    if (data.piiMode.trim()) {
      piiYaml += `\n    mode: ${data.piiMode.trim()}`;
    }
    if (data.piiEntityTypes.length > 0) {
      piiYaml += `\n    entityTypes:${data.piiEntityTypes.map((e) => `\n      - ${e}`).join("")}`;
    }
  }

  let abTestingYaml = "";
  if (data.abTestingEnabled) {
    abTestingYaml = "\n  abTesting:\n    enabled: true";
    if (data.abTestingExperimentId.trim()) {
      abTestingYaml += `\n    experimentId: ${data.abTestingExperimentId.trim()}`;
    }
    if (data.abTestingVariants.trim()) {
      abTestingYaml += `\n    variants: ${data.abTestingVariants.trim()}`;
    }
  }

  let fallbackYaml = "";
  if (data.fallbackEnabled) {
    fallbackYaml = "\n  fallback:\n    enabled: true";
    if (data.fallbackChains.trim()) {
      fallbackYaml += `\n    chains: ${data.fallbackChains.trim()}`;
    }
  }

  let costTrackingYaml = "";
  if (data.costTrackingEnabled) {
    costTrackingYaml = "\n  costTracking:\n    enabled: true";
    if (data.costInputPricePer1K.trim()) {
      costTrackingYaml += `\n    inputPricePer1K: ${data.costInputPricePer1K.trim()}`;
    }
    if (data.costOutputPricePer1K.trim()) {
      costTrackingYaml += `\n    outputPricePer1K: ${data.costOutputPricePer1K.trim()}`;
    }
    if (data.costCurrency.trim()) {
      costTrackingYaml += `\n    currency: ${data.costCurrency.trim()}`;
    }
  }

  let multiTenantYaml = "";
  if (data.multiTenantEnabled) {
    multiTenantYaml = "\n  multiTenant:\n    enabled: true";
    if (data.multiTenantId.trim()) {
      multiTenantYaml += `\n    id: ${data.multiTenantId.trim()}`;
    }
    if (data.multiTenantAllowedModels.trim()) {
      multiTenantYaml += `\n    allowedModels: ${data.multiTenantAllowedModels.trim()}`;
    }
    if (data.multiTenantCostLimit.trim()) {
      multiTenantYaml += `\n    costLimit: ${data.multiTenantCostLimit.trim()}`;
    }
  }

  return `apiVersion: gateway.nantian.dev/v1alpha1
kind: AIService
metadata:
  name: ${data.name.trim()}
  namespace: ${data.namespace}
spec:
  provider: ${data.provider.trim()}${data.format.trim() ? `\n  format: ${data.format.trim()}` : ""}
  model: ${data.model.trim()}${data.endpoint.trim() ? `\n  endpoint: ${data.endpoint.trim()}` : ""}${data.timeout.trim() ? `\n  timeout: ${data.timeout.trim()}` : ""}${authYaml}${retryYaml}${observabilityYaml}${routingYaml}${cacheYaml}${guardYaml}${safetyYaml}${piiYaml}${abTestingYaml}${fallbackYaml}${costTrackingYaml}${multiTenantYaml}
`;
}
