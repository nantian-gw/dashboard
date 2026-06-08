"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";

interface BackendRef {
  name: string;
  namespace: string;
  port: number;
  weight: number;
}

export default function CreateTCPRoutePage() {
  const t = useTranslations();
  const router = useRouter();
  const { data: namespacesData } = useNamespaces();
  const namespaces = (namespacesData as string[]) || ["default", "kube-system", "kube-public", "ingress"];
  
  const { data: gatewaysData } = useGateways();
  const gateways = (gatewaysData?.gateways as Array<{ name: string; namespace: string }> | undefined) || [];
  
  const [name, setName] = useState("");
  const [namespace, setNamespace] = useState("default");
  const [gatewayName, setGatewayName] = useState("");
  const [gatewayNamespace, setGatewayNamespace] = useState("default");
  
  const [backends, setBackends] = useState<BackendRef[]>([
    { name: "", namespace: "default", port: 80, weight: 100 }
  ]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const addBackend = () => {
    setBackends([...backends, { name: "", namespace: "default", port: 80, weight: 100 }]);
  };

  const removeBackend = (index: number) => {
    setBackends(backends.filter((_, i) => i !== index));
  };

  const updateBackend = (index: number, field: keyof BackendRef, value: string | number) => {
    const updated = [...backends];
    updated[index] = { ...updated[index], [field]: value };
    setBackends(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (!gatewayName.trim()) {
      setError(t("create.route.error_need_gateway"));
      setIsLoading(false);
      return;
    }

    const validBackends = backends.filter(b => b.name.trim() !== "");
    if (validBackends.length === 0) {
      setError("At least one backend service is required");
      setIsLoading(false);
      return;
    }

    const backendRefsYaml = validBackends.map(b => 
`    - name: ${b.name}
      namespace: ${b.namespace}
      port: ${b.port}
      weight: ${b.weight}`
    ).join("\n");

    const yaml = `apiVersion: gateway.networking.k8s.io/v1
kind: TCPRoute
metadata:
  name: ${name}
  namespace: ${namespace}
spec:
  parentRefs:
  - kind: Gateway
    group: gateway.networking.k8s.io
    name: ${gatewayName}
    namespace: ${gatewayNamespace}
  rules:
  - backendRefs:
${backendRefsYaml}`;

    try {
      const response = await applyResource(yaml);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Failed to create: ${response.status}`);
      }
      router.push(`/routes/TCPRoute/${namespace}/${name}`);
    } catch (err) {
      setError((err as Error).message || "Failed to create route");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center py-8">
      <div className="w-full max-w-5xl px-4">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/routes">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{t("create.route.title", { kind: "TCPRoute" })}</h1>
            <p className="text-muted-foreground">{t("create.route.description", { kind: "TCPRoute" })}</p>
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
                    <Label htmlFor="route-name">{t("create.route.route_name")} *</Label>
                    <Input
                      id="route-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t("create.route.route_name_placeholder")}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="route-namespace">{t("create.route.namespace")} *</Label>
                    <Select value={namespace} onValueChange={setNamespace}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("create.route.select_namespace")} />
                      </SelectTrigger>
                      <SelectContent>
                        {namespaces.map(ns => (
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
                <CardTitle className="text-base">{t("create.route.gateway_attachment_title")}</CardTitle>
                <CardDescription>{t("create.route.gateway_attachment_desc")}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="gw-name">{t("create.route.gateway_name")} *</Label>
                      <Select value={gatewayName} onValueChange={setGatewayName}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("create.route.select_gateway")} />
                        </SelectTrigger>
                        <SelectContent>
                          {gateways
                            .filter(g => g.namespace === gatewayNamespace)
                            .map(g => (
                              <SelectItem key={`${g.namespace}/${g.name}`} value={g.name}>
                                {g.name}
                              </SelectItem>
                            ))}
                          {gateways.filter(g => g.namespace === gatewayNamespace).length === 0 && (
                            <SelectItem value="__none__" disabled>
                              {t("create.route.no_gateways_in", { ns: gatewayNamespace })}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  <div className="grid gap-2">
                    <Label htmlFor="gw-namespace">{t("create.route.gateway_namespace")} *</Label>
                    <Select value={gatewayNamespace} onValueChange={setGatewayNamespace}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("create.route.select_namespace")} />
                      </SelectTrigger>
                      <SelectContent>
                        {namespaces.map(ns => (
                          <SelectItem key={ns} value={ns}>{ns}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">{t("create.route.backend_services")}</CardTitle>
                  <CardDescription>{t("create.route.backend_services_desc")}</CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addBackend}>
                  <Plus className="w-4 h-4 mr-1" />
                  {t("create.route.add_backend")}
                </Button>
              </CardHeader>
              <CardContent className="grid gap-4">
                {backends.map((backend, index) => (
                  <div key={index} className="flex gap-2 items-end p-3 border rounded-md bg-slate-50/50">
                    <div className="grid gap-1 flex-1">
                      <Label className="text-xs text-muted-foreground">{t("create.route.service")}</Label>
                      <Input
                        value={backend.name}
                        onChange={(e) => updateBackend(index, "name", e.target.value)}
                        placeholder={t("create.route.service_placeholder")}
                      />
                    </div>
                    <div className="grid gap-1 w-24">
                      <Label className="text-xs text-muted-foreground">{t("create.route.namespace")}</Label>
                      <Select 
                        value={backend.namespace} 
                        onValueChange={(v) => updateBackend(index, "namespace", v)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {namespaces.map(ns => (
                            <SelectItem key={ns} value={ns}>{ns}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1 w-20">
                      <Label className="text-xs text-muted-foreground">{t("create.route.port")}</Label>
                      <Input
                        type="number"
                        value={backend.port}
                        onChange={(e) => updateBackend(index, "port", parseInt(e.target.value) || 80)}
                      />
                    </div>
                    <div className="grid gap-1 w-20">
                      <Label className="text-xs text-muted-foreground">{t("create.route.weight")}</Label>
                      <Input
                        type="number"
                        value={backend.weight}
                        onChange={(e) => updateBackend(index, "weight", parseInt(e.target.value) || 0)}
                      />
                    </div>
                    {backends.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeBackend(index)}
                        className="text-red-500 hover:text-red-600 h-9"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        {t("create.route.remove")}
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
              <Link href="/routes">
                <Button variant="outline" type="button">Cancel</Button>
              </Link>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create TCPRoute"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
