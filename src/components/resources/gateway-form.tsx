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
import { useNamespaces } from "@/hooks/use-api";
import { ManagedResource, KubernetesResource, unwrapResource } from "@/lib/admin-models";
import { Plus, Trash2, Loader2 } from "lucide-react";

interface CertRef {
  name: string;
  namespace: string;
  kind: string;
  group: string;
}

interface ListenerData {
  port: number;
  protocol: string;
  name: string;
  tls?: { mode: string; certificateRefs: CertRef[] };
}

export interface GatewayFormData {
  name: string;
  namespace: string;
  gatewayClass: string;
  listeners: ListenerData[];
}

interface GatewayFormProps {
  initialData?: GatewayFormData;
  mode: "create" | "edit";
  onSuccess?: () => void;
}

function emptyListener(): ListenerData {
  return { port: 80, protocol: "HTTP", name: "http" };
}

function emptyGatewayForm(): GatewayFormData {
  return {
    name: "",
    namespace: "default",
    gatewayClass: "nantian",
    listeners: [emptyListener()],
  };
}

export function gatewayResourceToFormData(resource: ManagedResource | KubernetesResource): GatewayFormData {
  const r = unwrapResource(resource);
  const spec: Record<string, any> = r.spec || {};
  const metadata = (r.metadata || {}) as { name?: string; namespace?: string };
  const listeners: ListenerData[] = (spec.listeners || []).map((l: any) => {
    const entry: ListenerData = {
      name: l.name || "",
      port: typeof l.port === "number" ? l.port : parseInt(String(l.port), 10) || 0,
      protocol: l.protocol || "HTTP",
    };
    if (l.tls) {
      entry.tls = {
        mode: l.tls.mode || "Terminate",
        certificateRefs: (l.tls.certificateRefs || []).map((ref: any) => ({
          name: ref.name || "",
          namespace: ref.namespace || "",
          kind: ref.kind || "Secret",
          group: ref.group || "",
        })),
      };
    }
    return entry;
  });

  return {
    name: metadata.name || (resource as ManagedResource).name || "",
    namespace: metadata.namespace || (resource as ManagedResource).namespace || "default",
    gatewayClass: spec.gatewayClassName || "nantian",
    listeners: listeners.length > 0 ? listeners : [emptyListener()],
  };
}

export function GatewayForm({ initialData, mode, onSuccess }: GatewayFormProps) {
  const t = useTranslations();
  const { data: namespacesData } = useNamespaces();
  const namespaces = (namespacesData as string[]) || ["default", "kube-system", "kube-public", "ingress"];

  const defaults = initialData || emptyGatewayForm();
  const [name, setName] = useState(defaults.name);
  const [namespace, setNamespace] = useState(defaults.namespace);
  const [gatewayClass, setGatewayClass] = useState(defaults.gatewayClass);
  const [listeners, setListeners] = useState<ListenerData[]>(defaults.listeners);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    for (const l of listeners) {
      if (l.protocol === "HTTPS" && l.tls?.mode === "Passthrough") {
        setError(t("create.gateway.error_https_terminate", { name: l.name }));
        setIsLoading(false);
        return;
      }
    }

    const listenersYaml = listeners.map(l => {
      let yaml = `    - name: ${l.name}
      port: ${l.port}
      protocol: ${l.protocol}`;
      if (l.tls && (l.protocol === "HTTPS" || l.protocol === "TLS")) {
        const mode = l.protocol === "HTTPS" ? "Terminate" : l.tls.mode;
        yaml += `\n      tls:
        mode: ${mode}`;
        const validRefs = l.tls.certificateRefs.filter(ref => ref.name.trim() !== "");
        if (validRefs.length > 0) {
          yaml += `\n        certificateRefs:`;
          validRefs.forEach(ref => {
            yaml += `\n        - name: ${ref.name}
          namespace: ${ref.namespace}`;
            if (ref.kind !== "Secret") yaml += `\n          kind: ${ref.kind}`;
            if (ref.group) yaml += `\n          group: ${ref.group}`;
          });
        }
      }
      return yaml;
    }).join("\n");

    const yaml = `apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: ${name}
  namespace: ${namespace}
spec:
  gatewayClassName: ${gatewayClass}
  listeners:
${listenersYaml}
`;

    try {
      const path =
        mode === "edit"
          ? `/v1/resources/gateway/${namespace}/${name}`
          : "/v1/resources";
      const response = await applyResource(yaml, path);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Failed to ${mode}: ${response.status}`);
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      setError((err as Error).message || `Failed to ${mode} gateway`);
      setIsLoading(false);
    }
  };

  const addListener = () => {
    setListeners([...listeners, { port: 8080, protocol: "HTTP", name: `http-${listeners.length}` }]);
  };

  const removeListener = (index: number) => {
    setListeners(listeners.filter((_, i) => i !== index));
  };

  const updateListener = (index: number, field: string, value: string | number) => {
    const updated = [...listeners];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "protocol") {
      const proto = value as string;
      if (proto === "HTTPS" || proto === "TLS") {
        if (!updated[index].tls) {
          updated[index].tls = { mode: "Terminate", certificateRefs: [{ name: "", namespace, kind: "Secret", group: "" }] };
        } else if (proto === "HTTPS") {
          updated[index].tls!.mode = "Terminate";
        }
      } else {
        delete updated[index].tls;
      }
    }
    setListeners(updated);
  };

  const updateListenerTLS = (index: number, field: string, value: string) => {
    const updated = [...listeners];
    if (!updated[index].tls) return;
    updated[index] = { ...updated[index], tls: { ...updated[index].tls, [field]: value } };
    setListeners(updated);
  };

  const addCertRef = (listenerIndex: number) => {
    const updated = [...listeners];
    const listener = updated[listenerIndex];
    if (!listener.tls) return;
    listener.tls.certificateRefs.push({ name: "", namespace, kind: "Secret", group: "" });
    setListeners(updated);
  };

  const removeCertRef = (listenerIndex: number, refIndex: number) => {
    const updated = [...listeners];
    const listener = updated[listenerIndex];
    if (!listener.tls) return;
    listener.tls.certificateRefs = listener.tls.certificateRefs.filter((_, i) => i !== refIndex);
    setListeners(updated);
  };

  const updateCertRef = (listenerIndex: number, refIndex: number, field: string, value: string) => {
    const updated = [...listeners];
    const listener = updated[listenerIndex];
    if (!listener.tls) return;
    listener.tls.certificateRefs[refIndex] = { ...listener.tls.certificateRefs[refIndex], [field]: value };
    setListeners(updated);
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
              {isEdit ? t("create.gateway.edit_title") || `Edit Gateway` : t("create.gateway.title")}
            </h1>
            <p className="text-muted-foreground">
              {isEdit
                ? t("create.gateway.edit_description") || `Modify gateway ${name}`
                : t("create.gateway.description")}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t("create.gateway.basic_info_title")}</CardTitle>
                <CardDescription>{t("create.gateway.basic_info_desc")}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">{t("create.gateway.gateway_name")}</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t("create.gateway.gateway_name_placeholder")}
                      required
                      disabled={isEdit}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="namespace">{t("create.gateway.namespace")}</Label>
                    <Select value={namespace} onValueChange={setNamespace} disabled={isEdit}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select namespace" />
                      </SelectTrigger>
                      <SelectContent>
                        {namespaces.map(ns => (
                          <SelectItem key={ns} value={ns}>{ns}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="gw-class">{t("create.gateway.gateway_class")}</Label>
                  <Input
                    id="gw-class"
                    value={gatewayClass}
                    onChange={(e) => setGatewayClass(e.target.value)}
                    placeholder={t("create.gateway.gateway_class_placeholder")}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base">{t("create.gateway.listeners_title")}</CardTitle>
                  <CardDescription>{t("create.gateway.listeners_desc")}</CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addListener}>
                  <Plus className="h-4 w-4 mr-1" /> {t("create.gateway.add_listener")}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {listeners.map((listener, lIdx) => (
                  <Card key={lIdx}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <Label className="text-sm font-medium">
                          {t("create.gateway.listener_n", { n: lIdx + 1 })}
                        </Label>
                        {listeners.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeListener(lIdx)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="grid gap-2">
                          <Label>{t("create.gateway.listener_name")}</Label>
                          <Input
                            value={listener.name}
                            onChange={(e) => updateListener(lIdx, "name", e.target.value)}
                            placeholder="e.g. http"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>{t("create.gateway.listener_port")}</Label>
                          <Input
                            type="number"
                            value={listener.port}
                            onChange={(e) => updateListener(lIdx, "port", parseInt(e.target.value, 10) || 0)}
                            placeholder="80"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>{t("create.gateway.listener_protocol")}</Label>
                          <Select
                            value={listener.protocol}
                            onValueChange={(v) => updateListener(lIdx, "protocol", v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {["HTTP", "HTTPS", "TLS", "TCP", "UDP"].map((p) => (
                                <SelectItem key={p} value={p}>{p}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {(listener.protocol === "HTTPS" || listener.protocol === "TLS") && (
                        <div className="mt-4 border rounded-md p-4 space-y-4">
                          <Label className="text-sm font-medium">TLS Configuration</Label>

                          {listener.protocol === "TLS" && (
                            <div className="grid gap-2">
                              <Label>{t("create.gateway.tls_mode")}</Label>
                              <Select
                                value={listener.tls?.mode || "Terminate"}
                                onValueChange={(v) => updateListenerTLS(lIdx, "mode", v)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Terminate">Terminate</SelectItem>
                                  <SelectItem value="Passthrough">Passthrough</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm">
                                {t("create.gateway.certificate_refs")}
                              </Label>
                              <Button type="button" variant="ghost" size="sm" onClick={() => addCertRef(lIdx)}>
                                <Plus className="h-3 w-3 mr-1" /> {t("create.gateway.add_cert_ref")}
                              </Button>
                            </div>
                            {(listener.tls?.certificateRefs || []).map((ref, rIdx) => (
                              <div key={rIdx} className="grid grid-cols-4 gap-2 items-end">
                                <div className="grid gap-1">
                                  <Label className="text-xs">{t("create.gateway.cert_name")}</Label>
                                  <Input
                                    value={ref.name}
                                    onChange={(e) => updateCertRef(lIdx, rIdx, "name", e.target.value)}
                                    placeholder="cert-name"
                                  />
                                </div>
                                <div className="grid gap-1">
                                  <Label className="text-xs">{t("create.gateway.cert_namespace")}</Label>
                                  <Input
                                    value={ref.namespace}
                                    onChange={(e) => updateCertRef(lIdx, rIdx, "namespace", e.target.value)}
                                    placeholder="default"
                                  />
                                </div>
                                <div className="grid gap-1">
                                  <Label className="text-xs">Kind</Label>
                                  <Input
                                    value={ref.kind}
                                    onChange={(e) => updateCertRef(lIdx, rIdx, "kind", e.target.value)}
                                    placeholder="Secret"
                                  />
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9"
                                  onClick={() => removeCertRef(lIdx, rIdx)}
                                >
                                  <Trash2 className="h-3 w-3 text-red-500" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
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
              <Button
                type="button"
                variant="outline"
                onClick={() => window.history.back()}
              >
                {t("create.gateway.cancel")}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEdit
                  ? (t("create.gateway.save") || "Save Changes")
                  : (t("create.gateway.submit") || "Create Gateway")}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
