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
import { applyResource } from "@/lib/api";
import { useNamespaces } from "@/hooks/use-api";
import { ManagedResource, KubernetesResource, unwrapResource } from "@/lib/admin-models";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

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
  };
}

export function aiserviceResourceToFormData(resource: ManagedResource | KubernetesResource): AIServiceFormData {
  const r = unwrapResource(resource);
  const spec: Record<string, any> = r.spec || {};
  const metadata = (r.metadata || {}) as { name?: string; namespace?: string };
  const auth = spec.auth || {};
  const retry = spec.retry || {};
  const observability = spec.observability || {};
  const langfuse = observability.langfuse || {};
  const otel = observability.otel || {};

  return {
    name: metadata.name || (resource as ManagedResource).name || "",
    namespace: metadata.namespace || (resource as ManagedResource).namespace || "default",
    provider: spec.provider || "",
    format: spec.format || "",
    model: spec.model || "",
    authType: auth.type || "",
    authSecret: auth.secret || "",
    authKey: auth.key || "",
    authHeader: auth.header || "",
    timeout: spec.timeout || "",
    maxRetries: typeof retry.maxRetries === "number" ? retry.maxRetries : 0,
    backoff: retry.backoff || "",
    langfuseHost: langfuse.host || "",
    langfusePublicKey: langfuse.publicKey || "",
    langfuseSecretKey: langfuse.secretKey || "",
    otelEndpoint: otel.endpoint || "",
    otelServiceName: otel.serviceName || "",
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

    const yaml = `apiVersion: gateway.nantian.dev/v1alpha1
kind: AIService
metadata:
  name: ${name.trim()}
  namespace: ${namespace}
spec:
  provider: ${provider.trim()}${format.trim() ? `\n  format: ${format.trim()}` : ""}
  model: ${model.trim()}${timeout.trim() ? `\n  timeout: ${timeout.trim()}` : ""}${authYaml}${retryYaml}${observabilityYaml}
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
          <Link href="/ai/services">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
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

            {error && (
              <Card className="border-red-500">
                <CardContent className="py-3 text-sm text-red-600">{error}</CardContent>
              </Card>
            )}

            <div className="flex justify-end gap-4">
              <Link href="/ai/services">
                <Button type="button" variant="outline">{t("aiservice.create.cancel")}</Button>
              </Link>
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
