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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { applyResource } from "@/lib/api";
import { useNamespaces } from "@/hooks/use-api";
import { ManagedResource, KubernetesResource, unwrapResource } from "@/lib/admin-models";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

interface FromItem {
  group: string;
  kind: string;
  namespace: string;
}

interface ToItem {
  group: string;
  kind: string;
  name: string;
}

export interface ReferenceGrantFormData {
  name: string;
  namespace: string;
  froms: FromItem[];
  tos: ToItem[];
}

interface ReferenceGrantFormProps {
  initialData?: ReferenceGrantFormData;
  mode: "create" | "edit";
  onSuccess?: () => void;
}

function emptyReferenceGrantForm(): ReferenceGrantFormData {
  return {
    name: "",
    namespace: "default",
    froms: [{ group: "gateway.networking.k8s.io", kind: "HTTPRoute", namespace: "default" }],
    tos: [{ group: "", kind: "Service", name: "" }],
  };
}

export function referenceGrantResourceToFormData(resource: ManagedResource | KubernetesResource): ReferenceGrantFormData {
  const r = unwrapResource(resource);
  const spec: Record<string, any> = r.spec || {};
  const metadata = (r.metadata || {}) as { name?: string; namespace?: string };
  const froms: FromItem[] = (spec.from || []).map((f: any) => ({
    group: f.group || "gateway.networking.k8s.io",
    kind: f.kind || "HTTPRoute",
    namespace: f.namespace || "",
  }));
  const tos: ToItem[] = (spec.to || []).map((t: any) => ({
    group: t.group || "",
    kind: t.kind || "Service",
    name: t.name || "",
  }));

  return {
    name: metadata.name || (resource as ManagedResource).name || "",
    namespace: metadata.namespace || (resource as ManagedResource).namespace || "default",
    froms: froms.length > 0 ? froms : [{ group: "gateway.networking.k8s.io", kind: "HTTPRoute", namespace: "default" }],
    tos: tos.length > 0 ? tos : [{ group: "", kind: "Service", name: "" }],
  };
}

export function ReferenceGrantForm({ initialData, mode, onSuccess }: ReferenceGrantFormProps) {
  const t = useTranslations();
  const { data: namespacesData } = useNamespaces();
  const namespaces = (namespacesData as string[]) || ["default", "kube-system", "kube-public", "ingress"];

  const defaults = initialData || emptyReferenceGrantForm();
  const [name, setName] = useState(defaults.name);
  const [namespace, setNamespace] = useState(defaults.namespace);
  const [froms, setFroms] = useState<FromItem[]>(defaults.froms);
  const [tos, setTos] = useState<ToItem[]>(defaults.tos);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const isEdit = mode === "edit";

  const updateFrom = (index: number, patch: Partial<FromItem>) => {
    setFroms((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const updateTo = (index: number, patch: Partial<ToItem>) => {
    setTos((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (!name.trim()) {
      setError(t("referencegrant.create.error_need_name"));
      setIsLoading(false);
      return;
    }

    const validFroms = froms.filter((f) => f.namespace.trim());
    if (validFroms.length === 0) {
      setError(t("referencegrant.create.error_need_from"));
      setIsLoading(false);
      return;
    }

    const fromYaml = validFroms
      .map(
        (f) => `    - group: ${f.group || "gateway.networking.k8s.io"}
      kind: ${f.kind}
      namespace: ${f.namespace}`
      )
      .join("\n");

    const validTos = tos.filter((t) => t.kind.trim());
    const toYaml = validTos
      .map(
        (t) =>
          `    - group: ${t.group || ""}
      kind: ${t.kind}${t.name.trim() ? `\n      name: ${t.name.trim()}` : ""}`
      )
      .join("\n");

    const yaml = `apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: ${name.trim()}
  namespace: ${namespace}
spec:
  from:
${fromYaml}
  to:
${toYaml}`;

    try {
      const path = isEdit
        ? `/v1/resources/referencegrant/${namespace}/${name.trim()}`
        : "/v1/resources";
      const response = await applyResource(yaml, path);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Failed to ${isEdit ? "update" : "create"}: ${response.status}`);
      }
      onSuccess?.();
    } catch (err) {
      setError((err as Error).message || t("referencegrant.create.error_failed"));
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center py-8">
      <div className="w-full max-w-3xl px-4">
        <div className="flex items-center gap-4 mb-8">
          <LocalizedLink href="/reference-grants">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </LocalizedLink>
          <div>
            <h1 className="text-3xl font-bold">{isEdit ? t("referencegrant.edit.title") : t("referencegrant.create.title")}</h1>
            <p className="text-muted-foreground">{isEdit ? t("referencegrant.edit.description") : t("referencegrant.create.description")}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("referencegrant.create.basic_info")}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">{t("referencegrant.create.name")} *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t("referencegrant.create.name_placeholder")}
                      required
                      disabled={isEdit}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="namespace">{t("referencegrant.create.namespace")} *</Label>
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
                    <p className="text-xs text-muted-foreground">{t("referencegrant.create.namespace_hint")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">{t("referencegrant.create.from_title")}</CardTitle>
                  <p className="text-sm text-muted-foreground">{t("referencegrant.create.from_desc")}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setFroms([...froms, { group: "gateway.networking.k8s.io", kind: "HTTPRoute", namespace: "default" }])
                  }
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t("referencegrant.create.add_from")}
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {froms.map((f, i) => (
                  <div key={i} className="flex gap-2 items-end border rounded-md p-3">
                    <div className="grid gap-1 flex-1">
                      <Label className="text-xs text-muted-foreground">{t("referencegrant.create.group")}</Label>
                      <Input
                        className="h-9 text-xs"
                        value={f.group}
                        onChange={(e) => updateFrom(i, { group: e.target.value })}
                        placeholder="gateway.networking.k8s.io"
                      />
                    </div>
                    <div className="grid gap-1 w-32">
                      <Label className="text-xs text-muted-foreground">{t("referencegrant.create.kind")}</Label>
                      <Select
                        value={f.kind}
                        onValueChange={(v) => updateFrom(i, { kind: v })}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HTTPRoute">HTTPRoute</SelectItem>
                          <SelectItem value="GRPCRoute">GRPCRoute</SelectItem>
                          <SelectItem value="TCPRoute">TCPRoute</SelectItem>
                          <SelectItem value="UDPRoute">UDPRoute</SelectItem>
                          <SelectItem value="TLSRoute">TLSRoute</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1 flex-1">
                      <Label className="text-xs text-muted-foreground">{t("referencegrant.create.source_ns")}</Label>
                      <Select
                        value={f.namespace}
                        onValueChange={(v) => updateFrom(i, { namespace: v })}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {namespaces.map((ns) => (
                            <SelectItem key={ns} value={ns}>{ns}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {froms.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => setFroms(froms.filter((_, j) => j !== i))}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">{t("referencegrant.create.to_title")}</CardTitle>
                  <p className="text-sm text-muted-foreground">{t("referencegrant.create.to_desc")}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setTos([...tos, { group: "", kind: "Service", name: "" }])
                  }
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t("referencegrant.create.add_to")}
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {tos.map((item, i) => (
                  <div key={i} className="flex gap-2 items-end border rounded-md p-3">
                    <div className="grid gap-1 flex-1">
                      <Label className="text-xs text-muted-foreground">{t("referencegrant.create.group")}</Label>
                      <Input
                        className="h-9 text-xs"
                        value={item.group}
                        onChange={(e) => updateTo(i, { group: e.target.value })}
                        placeholder={t("referencegrant.create.core_group_placeholder")}
                      />
                    </div>
                    <div className="grid gap-1 w-32">
                      <Label className="text-xs text-muted-foreground">{t("referencegrant.create.kind")}</Label>
                      <Select
                        value={item.kind}
                        onValueChange={(v) => updateTo(i, { kind: v })}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Service">Service</SelectItem>
                          <SelectItem value="Secret">Secret</SelectItem>
                          <SelectItem value="ConfigMap">ConfigMap</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1 flex-1">
                      <Label className="text-xs text-muted-foreground">{t("referencegrant.create.target_name")}</Label>
                      <Input
                        className="h-9 text-xs"
                        value={item.name}
                        onChange={(e) => updateTo(i, { name: e.target.value })}
                        placeholder={t("referencegrant.create.target_name_placeholder")}
                      />
                    </div>
                    {tos.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => setTos(tos.filter((_, j) => j !== i))}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex gap-4">
              <LocalizedLink href="/reference-grants">
                <Button variant="outline" type="button">
                  {t("referencegrant.create.cancel")}
                </Button>
              </LocalizedLink>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (isEdit ? t("referencegrant.edit.saving") : t("referencegrant.create.creating")) : (isEdit ? t("referencegrant.edit.submit") : t("referencegrant.create.submit"))}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
