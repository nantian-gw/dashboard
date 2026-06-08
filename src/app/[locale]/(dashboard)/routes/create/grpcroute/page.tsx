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

interface MethodMatch {
  service: string;
  method: string;
}

interface GRPCRule {
  matches: MethodMatch[];
  backends: BackendRef[];
}

export default function CreateGRPCRoutePage() {
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
  const [hostnames, setHostnames] = useState("");
  
  const [rules, setRules] = useState<GRPCRule[]>([
    { matches: [{ service: "", method: "" }], backends: [{ name: "", namespace: "default", port: 50051, weight: 100 }] }
  ]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const addRule = () => {
    setRules([...rules, { matches: [{ service: "", method: "" }], backends: [{ name: "", namespace: "default", port: 50051, weight: 100 }] }]);
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const updateRuleMatch = (ruleIndex: number, field: keyof MethodMatch, value: string) => {
    const updated = [...rules];
    updated[ruleIndex].matches[0] = { ...updated[ruleIndex].matches[0], [field]: value };
    setRules(updated);
  };

  const addBackendToRule = (ruleIndex: number) => {
    const updated = [...rules];
    updated[ruleIndex].backends.push({ name: "", namespace: "default", port: 50051, weight: 100 });
    setRules(updated);
  };

  const removeBackendFromRule = (ruleIndex: number, backendIndex: number) => {
    const updated = [...rules];
    updated[ruleIndex].backends = updated[ruleIndex].backends.filter((_, i) => i !== backendIndex);
    setRules(updated);
  };

  const updateBackend = (ruleIndex: number, backendIndex: number, field: keyof BackendRef, value: string | number) => {
    const updated = [...rules];
    updated[ruleIndex].backends[backendIndex] = { 
      ...updated[ruleIndex].backends[backendIndex], 
      [field]: value 
    };
    setRules(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const hostnameList = hostnames.split(",").map(h => h.trim()).filter(h => h);
    
    const validRules = rules.filter(r => r.backends.some(b => b.name.trim() !== ""));
    if (validRules.length === 0) {
      setError(t("create.route.error_need_backend"));
      setIsLoading(false);
      return;
    }

    if (!gatewayName) {
      setError(t("create.route.error_need_gateway"));
      setIsLoading(false);
      return;
    }

    const rulesYaml = validRules.map(rule => {
      const validBackends = rule.backends.filter(b => b.name.trim() !== "");
      const backendRefsYaml = validBackends.map(b => 
`      - name: ${b.name}
        namespace: ${b.namespace}
        port: ${b.port}
        weight: ${b.weight}`
      ).join("\n");

      const match = rule.matches[0];
      if (match.service || match.method) {
        return `  - matches:
    - method:
        service: ${match.service || "*"}
        method: ${match.method || "*"}
    backendRefs:
${backendRefsYaml}`;
      } else {
        return `  - backendRefs:
${backendRefsYaml}`;
      }
    }).join("\n");

    const yaml = `apiVersion: gateway.networking.k8s.io/v1
kind: GRPCRoute
metadata:
  name: ${name}
  namespace: ${namespace}
spec:
  parentRefs:
  - kind: Gateway
    group: gateway.networking.k8s.io
    name: ${gatewayName}
    namespace: ${gatewayNamespace}
${hostnameList.length > 0 ? `  hostnames:\n${hostnameList.map(h => `    - "${h}"`).join("\n")}` : ""}
  rules:
${rulesYaml}`;

    try {
      const response = await applyResource(yaml);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Failed to create: ${response.status}`);
      }
      router.push(`/routes/GRPCRoute/${namespace}/${name}`);
    } catch (err) {
      setError((err as Error).message || t("create.route.error_failed_create"));
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
            <h1 className="text-3xl font-bold">{t("create.route.title", { kind: "GRPCRoute" })}</h1>
            <p className="text-muted-foreground">{t("create.route.description", { kind: "GRPCRoute" })}</p>
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
                    <Label htmlFor="route-namespace">{t("create.route.select_namespace")} *</Label>
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
                <div className="grid gap-2">
                  <Label htmlFor="hostnames">{t("create.route.hostnames")}</Label>
                  <Input
                    id="hostnames"
                    value={hostnames}
                    onChange={(e) => setHostnames(e.target.value)}
                    placeholder={t("create.route.hostnames_placeholder")}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{t("create.route.routing_rules_title")}</h2>
                <p className="text-sm text-muted-foreground">{t("create.route.routing_rules_desc")}</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addRule}>
                <Plus className="w-4 h-4 mr-1" />
                {t("create.route.add_rule")}
              </Button>
            </div>

            {rules.map((rule, ruleIndex) => (
              <Card key={ruleIndex}>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-base">{t("create.route.rule_n", { n: ruleIndex + 1 })}</CardTitle>
                  {rules.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRule(ruleIndex)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      {t("create.route.remove")}
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>{t("create.route.service_match")}</Label>
                      <Input
                        value={rule.matches[0].service}
                        onChange={(e) => updateRuleMatch(ruleIndex, "service", e.target.value)}
                        placeholder={t("create.route.service_match_placeholder")}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>{t("create.route.method_match")}</Label>
                      <Input
                        value={rule.matches[0].method}
                        onChange={(e) => updateRuleMatch(ruleIndex, "method", e.target.value)}
                        placeholder={t("create.route.method_placeholder")}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>{t("create.route.backend_services")}</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addBackendToRule(ruleIndex)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      {t("create.route.add_backend")}
                    </Button>
                  </div>

                  {rule.backends.map((backend, backendIndex) => (
                    <div key={backendIndex} className="flex gap-2 items-end p-3 border rounded-md bg-slate-50/50">
                      <div className="grid gap-1 flex-1">
                        <Label className="text-xs text-muted-foreground">{t("create.route.service")}</Label>
                        <Input
                          value={backend.name}
                          onChange={(e) => updateBackend(ruleIndex, backendIndex, "name", e.target.value)}
                          placeholder={t("create.route.service_placeholder")}
                        />
                      </div>
                      <div className="grid gap-1 w-24">
                        <Label className="text-xs text-muted-foreground">{t("create.route.namespace")}</Label>
                        <Select 
                          value={backend.namespace} 
                          onValueChange={(v) => updateBackend(ruleIndex, backendIndex, "namespace", v)}
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
                          onChange={(e) => updateBackend(ruleIndex, backendIndex, "port", parseInt(e.target.value) || 50051)}
                        />
                      </div>
                      <div className="grid gap-1 w-20">
                        <Label className="text-xs text-muted-foreground">{t("create.route.weight")}</Label>
                        <Input
                          type="number"
                          value={backend.weight}
                          onChange={(e) => updateBackend(ruleIndex, backendIndex, "weight", parseInt(e.target.value) || 0)}
                        />
                      </div>
                      {rule.backends.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeBackendFromRule(ruleIndex, backendIndex)}
                          className="text-red-500 hover:text-red-600 h-9"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex gap-4">
              <Link href="/routes">
                <Button variant="outline" type="button">{t("create.route.cancel")}</Button>
              </Link>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? t("create.route.creating") : t("create.route.submit", { kind: "GRPCRoute" })}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}