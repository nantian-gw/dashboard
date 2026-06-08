"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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

export default function CreateTLSRoutePage() {
  const router = useRouter();
  const t = useTranslations();
  const { data: namespacesData } = useNamespaces();
  const namespaces = (namespacesData as string[]) || ["default", "kube-system", "kube-public", "ingress"];
  const { data: gatewaysData } = useGateways();
  const gateways = (gatewaysData?.gateways) || [];
  const filteredGateways = gateways.filter(g => g.namespace === gatewayNamespace);
  
  const [name, setName] = useState("");
  const [namespace, setNamespace] = useState("default");
  const [gatewayName, setGatewayName] = useState("");
  const [gatewayNamespace, setGatewayNamespace] = useState("default");
  const [sniHosts, setSniHosts] = useState("");
  
  const [backends, setBackends] = useState<BackendRef[]>([
    { name: "", namespace: "default", port: 443, weight: 100 }
  ]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const addBackend = () => {
    setBackends([...backends, { name: "", namespace: "default", port: 443, weight: 100 }]);
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

    const sniList = sniHosts.split(",").map(h => h.trim()).filter(h => h);
    const validBackends = backends.filter(b => b.name.trim() !== "");
    
    if (validBackends.length === 0) {
      setError("At least one backend service is required");
      setIsLoading(false);
      return;
    }

    if (!gatewayName.trim()) {
      setError("Gateway name is required");
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
kind: TLSRoute
metadata:
  name: ${name}
  namespace: ${namespace}
spec:
  parentRefs:
  - kind: Gateway
    group: gateway.networking.k8s.io
    name: ${gatewayName}
    namespace: ${gatewayNamespace}
${sniList.length > 0 ? `  hostnames:\n${sniList.map(h => `    - "${h}"`).join("\n")}` : ""}
  rules:
  - backendRefs:
${backendRefsYaml}`;

    try {
      const response = await applyResource(yaml);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Failed to create: ${response.status}`);
      }
      router.push(`/routes/TLSRoute/${namespace}/${name}`);
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
            <h1 className="text-3xl font-bold">{t("create.route.title", { kind: "TLSRoute" })}</h1>
            <p className="text-muted-foreground">{t("create.route.description", { kind: "TLSRoute" })}</p>
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Gateway Attachment</CardTitle>
                <CardDescription>Attach this route to a Gateway</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="gw-name">Gateway Name *</Label>
                    <Select value={gatewayName} onValueChange={setGatewayName}>
                      <SelectTrigger id="gw-name">
                        <SelectValue placeholder="Select gateway" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredGateways.length === 0 ? (
                          <SelectItem value="" disabled>No gateways available</SelectItem>
                        ) : (
                          filteredGateways.map(gw => (
                            <SelectItem key={`${gw.namespace}/${gw.name}`} value={gw.name}>{gw.name}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="gw-namespace">Gateway Namespace *</Label>
                    <Select value={gatewayNamespace} onValueChange={setGatewayNamespace}>
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
                  <Label htmlFor="sni-hosts">SNI Hosts (optional)</Label>
                  <Input
                    id="sni-hosts"
                    value={sniHosts}
                    onChange={(e) => setSniHosts(e.target.value)}
                    placeholder="example.com, *.example.com (comma separated)"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Backend Services</CardTitle>
                  <CardDescription>Define destinations for TLS traffic</CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addBackend}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Backend
                </Button>
              </CardHeader>
              <CardContent className="grid gap-4">
                {backends.map((backend, index) => (
                  <div key={index} className="flex gap-2 items-end p-3 border rounded-md bg-slate-50/50">
                    <div className="grid gap-1 flex-1">
                      <Label className="text-xs text-muted-foreground">Service</Label>
                      <Input
                        value={backend.name}
                        onChange={(e) => updateBackend(index, "name", e.target.value)}
                        placeholder="my-tls-service"
                      />
                    </div>
                    <div className="grid gap-1 w-24">
                      <Label className="text-xs text-muted-foreground">Namespace</Label>
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
                      <Label className="text-xs text-muted-foreground">Port</Label>
                      <Input
                        type="number"
                        value={backend.port}
                        onChange={(e) => updateBackend(index, "port", parseInt(e.target.value) || 443)}
                      />
                    </div>
                    <div className="grid gap-1 w-20">
                      <Label className="text-xs text-muted-foreground">Weight</Label>
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
                        <Trash2 className="w-4 h-4" />
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
                {isLoading ? "Creating..." : "Create TLSRoute"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}