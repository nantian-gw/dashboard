"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LocalizedLink } from "@/components/dashboard/localized-link";
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
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

interface CertRef {
  name: string;
  group: string;
  kind: string;
}

export interface BackendTlsFormData {
  name: string;
  namespace: string;
  targetGroup: string;
  targetKind: string;
  targetName: string;
  hostname: string;
  caRefs: CertRef[];
}

interface BackendTlsFormProps {
  initialData?: BackendTlsFormData;
  mode: "create" | "edit";
  onSuccess?: () => void;
}

function emptyBackendTlsForm(): BackendTlsFormData {
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

export function backendTlsResourceToFormData(resource: ManagedResource | KubernetesResource): BackendTlsFormData {
  const r = unwrapResource(resource);
  const spec: Record<string, any> = r.spec || {};
  const metadata = (r.metadata || {}) as { name?: string; namespace?: string };
  const targetRef = (spec.targetRef || {}) as Record<string, unknown>;
  const validation = (spec.validation || {}) as Record<string, unknown>;
  const caRefs: CertRef[] = (validation.caCertificateRefs as unknown[] || []).map((ref: any) => ({
    name: ref.name || "",
    group: ref.group || "",
    kind: ref.kind || "ConfigMap",
  }));

  return {
    name: metadata.name || (resource as ManagedResource).name || "",
    namespace: metadata.namespace || (resource as ManagedResource).namespace || "default",
    targetGroup: (targetRef.group as string) || "",
    targetKind: (targetRef.kind as string) || "Service",
    targetName: (targetRef.name as string) || "",
    hostname: (validation.hostname as string) || "",
    caRefs: caRefs.length > 0 ? caRefs : [{ name: "", group: "", kind: "ConfigMap" }],
  };
}

export function BackendTlsForm({ initialData, mode, onSuccess }: BackendTlsFormProps) {
  const t = useTranslations();
  const { data: namespacesData } = useNamespaces();
  const namespaces = (namespacesData as string[]) || ["default", "kube-system", "kube-public", "ingress"];

  const defaults = initialData || emptyBackendTlsForm();
  const [name, setName] = useState(defaults.name);
  const [namespace, setNamespace] = useState(defaults.namespace);
  const [targetGroup, setTargetGroup] = useState(defaults.targetGroup);
  const [targetKind, setTargetKind] = useState(defaults.targetKind);
  const [targetName, setTargetName] = useState(defaults.targetName);
  const [hostname, setHostname] = useState(defaults.hostname);
  const [caRefs, setCaRefs] = useState<CertRef[]>(defaults.caRefs);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const isEdit = mode === "edit";

  const updateCaRef = (index: number, field: keyof CertRef, value: string) => {
    setCaRefs((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addCaRef = () => {
    setCaRefs([...caRefs, { name: "", group: "", kind: "ConfigMap" }]);
  };

  const removeCaRef = (index: number) => {
    setCaRefs(caRefs.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (!name.trim()) {
      setError(t("backendtls.create.error_need_name"));
      setIsLoading(false);
      return;
    }

    if (!targetName.trim()) {
      setError(t("backendtls.create.error_need_target"));
      setIsLoading(false);
      return;
    }

    const validCaRefs = caRefs.filter((ref) => ref.name.trim() !== "");
    const caRefsYaml = validCaRefs
      .map(
        (ref) => `    - name: ${ref.name}
      group: ${ref.group || '""'}
      kind: ${ref.kind}`
      )
      .join("\n");

    const yaml = `apiVersion: gateway.networking.k8s.io/v1alpha3
kind: BackendTLSPolicy
metadata:
  name: ${name.trim()}
  namespace: ${namespace}
spec:
  targetRef:
    group: ${targetGroup || '""'}
    kind: ${targetKind}
    name: ${targetName.trim()}
  validation:
    hostname: ${hostname || '""'}${validCaRefs.length > 0 ? `
    caCertificateRefs:
${caRefsYaml}` : ""}`;

    try {
      const path = isEdit
        ? `/v1/resources/backendtlspolicy/${namespace}/${name.trim()}`
        : "/v1/resources";
      const response = await applyResource(yaml, path);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Failed to ${isEdit ? "update" : "create"}: ${response.status}`);
      }
      onSuccess?.();
    } catch (err) {
      setError((err as Error).message || t("backendtls.create.error_failed"));
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center py-8">
      <div className="w-full max-w-3xl px-4">
        <div className="flex items-center gap-4 mb-8">
          <LocalizedLink href="/backend-tls">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </LocalizedLink>
          <div>
            <h1 className="text-3xl font-bold">{isEdit ? t("backendtls.edit.title") : t("backendtls.create.title")}</h1>
            <p className="text-muted-foreground">{isEdit ? t("backendtls.edit.description") : t("backendtls.create.description")}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("backendtls.create.basic_info")}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">{t("backendtls.create.name")} *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t("backendtls.create.name_placeholder")}
                      required
                      disabled={isEdit}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="namespace">{t("backendtls.create.namespace")} *</Label>
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
                <CardTitle className="text-base">{t("backendtls.create.target_title")}</CardTitle>
                <CardDescription>{t("backendtls.create.target_desc")}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label>{t("backendtls.create.target_group")}</Label>
                    <Input
                      value={targetGroup}
                      onChange={(e) => setTargetGroup(e.target.value)}
                      placeholder={t("backendtls.create.target_group_placeholder")}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t("backendtls.create.target_kind")}</Label>
                    <Select value={targetKind} onValueChange={setTargetKind}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Service">Service</SelectItem>
                        <SelectItem value="Secret">Secret</SelectItem>
                        <SelectItem value="ConfigMap">ConfigMap</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>{t("backendtls.create.target_name")} *</Label>
                    <Input
                      value={targetName}
                      onChange={(e) => setTargetName(e.target.value)}
                      placeholder={t("backendtls.create.target_name_placeholder")}
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("backendtls.create.validation_title")}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-2">
                  <Label>{t("backendtls.create.hostname")}</Label>
                  <Input
                    value={hostname}
                    onChange={(e) => setHostname(e.target.value)}
                    placeholder={t("backendtls.create.hostname_placeholder")}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">{t("backendtls.create.ca_certificate_refs")}</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addCaRef}>
                      <Plus className="h-4 w-4 mr-1" /> {t("backendtls.create.add_ca_ref")}
                    </Button>
                  </div>
                  {caRefs.map((ref, idx) => (
                    <div key={idx} className="flex items-end gap-2">
                      <div className="grid gap-1 flex-1">
                        <Label className="text-xs">{t("backendtls.create.ca_name")}</Label>
                        <Input
                          value={ref.name}
                          onChange={(e) => updateCaRef(idx, "name", e.target.value)}
                          placeholder="ca-name"
                        />
                      </div>
                      <div className="grid gap-1 flex-1">
                        <Label className="text-xs">{t("backendtls.create.ca_group")}</Label>
                        <Input
                          value={ref.group}
                          onChange={(e) => updateCaRef(idx, "group", e.target.value)}
                          placeholder="group"
                        />
                      </div>
                      <div className="grid gap-1 w-32">
                        <Label className="text-xs">Kind</Label>
                        <Select value={ref.kind} onValueChange={(v) => updateCaRef(idx, "kind", v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ConfigMap">ConfigMap</SelectItem>
                            <SelectItem value="Secret">Secret</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 mb-0"
                        onClick={() => removeCaRef(idx)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {error && (
              <Card className="border-red-500">
                <CardContent className="py-3 text-sm text-red-600">{error}</CardContent>
              </Card>
            )}

            <div className="flex justify-end gap-4">
              <LocalizedLink href="/backend-tls">
                <Button type="button" variant="outline">{t("backendtls.create.cancel")}</Button>
              </LocalizedLink>
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? (isEdit ? t("backendtls.edit.saving") : t("backendtls.create.creating"))
                  : (isEdit ? t("backendtls.edit.submit") : t("backendtls.create.submit"))}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
