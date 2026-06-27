"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { LocalizedLink } from "@/components/dashboard/localized-link";
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
import { useNamespaces } from "@/hooks/use-api";
import { ManagedResource, KubernetesResource, unwrapResource } from "@/lib/admin-models";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

interface TargetRef {
  group: string;
  kind: string;
  name: string;
}

export interface TokenPolicyFormData {
  name: string;
  namespace: string;
  targetRefs: TargetRef[];
  tokensPerMinute?: number;
  tokensPerHour?: number;
  requestsPerMinute?: number;
  scope: string;
  burst?: number;
  onLimit: string;
}

interface TokenPolicyFormProps {
  initialData?: TokenPolicyFormData;
  mode: "create" | "edit";
  onSuccess?: () => void;
}

function emptyTargetRef(): TargetRef {
  return { group: "", kind: "AIService", name: "" };
}

function emptyTokenPolicyForm(): TokenPolicyFormData {
  return {
    name: "",
    namespace: "default",
    targetRefs: [emptyTargetRef()],
    tokensPerMinute: undefined,
    tokensPerHour: undefined,
    requestsPerMinute: undefined,
    scope: "global",
    burst: undefined,
    onLimit: "reject",
  };
}

export function tokenPolicyResourceToFormData(resource: ManagedResource | KubernetesResource): TokenPolicyFormData {
  const r = unwrapResource(resource);
  const spec: Record<string, unknown> = r.spec || {};
  const metadata = (r.metadata || {}) as { name?: string; namespace?: string };
  const targetRefs: TargetRef[] = ((spec.targetRefs as Record<string, unknown>[]) || []).map((ref: Record<string, unknown>) => ({
    group: (ref.group as string) || "",
    kind: (ref.kind as string) || "AIService",
    name: (ref.name as string) || "",
  }));

  return {
    name: metadata.name || (resource as ManagedResource).name || "",
    namespace: metadata.namespace || (resource as ManagedResource).namespace || "default",
    targetRefs: targetRefs.length > 0 ? targetRefs : [emptyTargetRef()],
    tokensPerMinute: (spec.tokensPerMinute as number | undefined),
    tokensPerHour: (spec.tokensPerHour as number | undefined),
    requestsPerMinute: (spec.requestsPerMinute as number | undefined),
    scope: (spec.scope as string) || "global",
    burst: (spec.burst as number | undefined),
    onLimit: (spec.onLimit as string) || "reject",
  };
}

export function TokenPolicyForm({ initialData, mode, onSuccess }: TokenPolicyFormProps) {
  const t = useTranslations();
  const { data: namespacesData } = useNamespaces();
  const namespaces = (namespacesData as string[]) || ["default", "kube-system", "kube-public", "ingress"];

  const defaults = initialData || emptyTokenPolicyForm();
  const [name, setName] = useState(defaults.name);
  const [namespace, setNamespace] = useState(defaults.namespace);
  const [targetRefs, setTargetRefs] = useState<TargetRef[]>(defaults.targetRefs);
  const [tokensPerMinute, setTokensPerMinute] = useState<string>(
    defaults.tokensPerMinute != null ? String(defaults.tokensPerMinute) : ""
  );
  const [tokensPerHour, setTokensPerHour] = useState<string>(
    defaults.tokensPerHour != null ? String(defaults.tokensPerHour) : ""
  );
  const [requestsPerMinute, setRequestsPerMinute] = useState<string>(
    defaults.requestsPerMinute != null ? String(defaults.requestsPerMinute) : ""
  );
  const [scope, setScope] = useState(defaults.scope);
  const [burst, setBurst] = useState<string>(
    defaults.burst != null ? String(defaults.burst) : ""
  );
  const [onLimit, setOnLimit] = useState(defaults.onLimit);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const isEdit = mode === "edit";

  const updateTargetRef = (index: number, field: keyof TargetRef, value: string) => {
    setTargetRefs((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addTargetRef = () => {
    setTargetRefs([...targetRefs, emptyTargetRef()]);
  };

  const removeTargetRef = (index: number) => {
    setTargetRefs(targetRefs.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (!name.trim()) {
      setError(t("pages.ai.tokenPolicies.form.error_need_name"));
      setIsLoading(false);
      return;
    }

    const validTargetRefs = targetRefs.filter((ref) => ref.name.trim() !== "");
    if (validTargetRefs.length === 0) {
      setError(t("pages.ai.tokenPolicies.form.error_need_target"));
      setIsLoading(false);
      return;
    }

    const targetRefsYaml = validTargetRefs
      .map(
        (ref) => `    - group: ${ref.group || '""'}
      kind: ${ref.kind}
      name: ${ref.name.trim()}`
      )
      .join("\n");

    let limitsYaml = "";
    if (tokensPerMinute) limitsYaml += `\n  tokensPerMinute: ${tokensPerMinute}`;
    if (tokensPerHour) limitsYaml += `\n  tokensPerHour: ${tokensPerHour}`;
    if (requestsPerMinute) limitsYaml += `\n  requestsPerMinute: ${requestsPerMinute}`;
    limitsYaml += `\n  scope: ${scope}`;
    if (burst) limitsYaml += `\n  burst: ${burst}`;
    limitsYaml += `\n  onLimit: ${onLimit}`;

    const yaml = `apiVersion: gateway.nantian.dev/v1alpha1
kind: TokenPolicy
metadata:
  name: ${name.trim()}
  namespace: ${namespace}
spec:
  targetRefs:
${targetRefsYaml}${limitsYaml}
`;

    try {
      const path = isEdit
        ? `/v1/resources/tokenpolicy/${namespace}/${name.trim()}`
        : "/v1/resources";
      const response = await applyResource(yaml, path);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Failed to ${isEdit ? "update" : "create"}: ${response.status}`);
      }
      onSuccess?.();
    } catch (err) {
      setError((err as Error).message || t("pages.ai.tokenPolicies.form.error_failed"));
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center py-8">
      <div className="w-full max-w-3xl px-4">
        <div className="flex items-center gap-4 mb-8">
          <LocalizedLink href="/ai/token-policies">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </LocalizedLink>
          <div>
            <h1 className="text-3xl font-bold">
              {isEdit
                ? t("pages.ai.tokenPolicies.edit.title")
                : t("pages.ai.tokenPolicies.create.title")}
            </h1>
            <p className="text-muted-foreground">
              {isEdit
                ? t("pages.ai.tokenPolicies.edit.description")
                : t("pages.ai.tokenPolicies.create.description")}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("pages.ai.tokenPolicies.form.basic_info")}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">{t("pages.ai.tokenPolicies.form.name")} *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t("pages.ai.tokenPolicies.form.name_placeholder")}
                      required
                      disabled={isEdit}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="namespace">{t("pages.ai.tokenPolicies.form.namespace")} *</Label>
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("pages.ai.tokenPolicies.form.target_title")}</CardTitle>
                <CardDescription>{t("pages.ai.tokenPolicies.form.target_desc")}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">{t("pages.ai.tokenPolicies.form.target_refs")}</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addTargetRef}>
                      <Plus className="h-4 w-4 mr-1" /> {t("pages.ai.tokenPolicies.form.add_target_ref")}
                    </Button>
                  </div>
                  {targetRefs.map((ref, idx) => (
                    <div key={idx} className="flex items-end gap-2">
                      <div className="grid gap-1 flex-1">
                        <Label className="text-xs">{t("pages.ai.tokenPolicies.form.target_group")}</Label>
                        <Input
                          value={ref.group}
                          onChange={(e) => updateTargetRef(idx, "group", e.target.value)}
                          placeholder="gateway.nantian.dev"
                        />
                      </div>
                      <div className="grid gap-1 w-32">
                        <Label className="text-xs">{t("pages.ai.tokenPolicies.form.target_kind")}</Label>
                        <Select
                          value={ref.kind}
                          onValueChange={(v) => updateTargetRef(idx, "kind", v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AIService">AIService</SelectItem>
                            <SelectItem value="Service">Service</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-1 flex-1">
                        <Label className="text-xs">{t("pages.ai.tokenPolicies.form.target_name")} *</Label>
                        <Input
                          value={ref.name}
                          onChange={(e) => updateTargetRef(idx, "name", e.target.value)}
                          placeholder="my-ai-service"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 mb-0"
                        onClick={() => removeTargetRef(idx)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("pages.ai.tokenPolicies.form.limits_title")}</CardTitle>
                <CardDescription>{t("pages.ai.tokenPolicies.form.limits_desc")}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label>{t("pages.ai.tokenPolicies.form.tokens_per_minute")}</Label>
                    <Input
                      type="number"
                      min="0"
                      value={tokensPerMinute}
                      onChange={(e) => setTokensPerMinute(e.target.value)}
                      placeholder="1000"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t("pages.ai.tokenPolicies.form.tokens_per_hour")}</Label>
                    <Input
                      type="number"
                      min="0"
                      value={tokensPerHour}
                      onChange={(e) => setTokensPerHour(e.target.value)}
                      placeholder="50000"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t("pages.ai.tokenPolicies.form.requests_per_minute")}</Label>
                    <Input
                      type="number"
                      min="0"
                      value={requestsPerMinute}
                      onChange={(e) => setRequestsPerMinute(e.target.value)}
                      placeholder="100"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label>{t("pages.ai.tokenPolicies.form.scope")}</Label>
                    <Select value={scope} onValueChange={setScope}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="global">{t("pages.ai.tokenPolicies.form.scope_global")}</SelectItem>
                        <SelectItem value="perUser">{t("pages.ai.tokenPolicies.form.scope_per_user")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>{t("pages.ai.tokenPolicies.form.burst")}</Label>
                    <Input
                      type="number"
                      min="0"
                      value={burst}
                      onChange={(e) => setBurst(e.target.value)}
                      placeholder="10"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t("pages.ai.tokenPolicies.form.on_limit")}</Label>
                    <Select value={onLimit} onValueChange={setOnLimit}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reject">{t("pages.ai.tokenPolicies.form.on_limit_reject")}</SelectItem>
                        <SelectItem value="queue">{t("pages.ai.tokenPolicies.form.on_limit_queue")}</SelectItem>
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
              <LocalizedLink href="/ai/token-policies">
                <Button type="button" variant="outline">{t("pages.ai.tokenPolicies.form.cancel")}</Button>
              </LocalizedLink>
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? (isEdit ? t("pages.ai.tokenPolicies.edit.saving") : t("pages.ai.tokenPolicies.create.creating"))
                  : (isEdit ? t("pages.ai.tokenPolicies.edit.submit") : t("pages.ai.tokenPolicies.create.submit"))}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
