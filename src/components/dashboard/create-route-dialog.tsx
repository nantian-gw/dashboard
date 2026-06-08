"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { applyResource } from "@/lib/api";

interface CreateRouteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface BackendRef {
  name: string;
  namespace: string;
  port: number;
  weight: number;
}

export function CreateRouteDialog({ open, onOpenChange }: CreateRouteDialogProps) {
  const router = useRouter();
  
  const [name, setName] = useState("");
  const [namespace, setNamespace] = useState("default");
  const [gatewayName, setGatewayName] = useState("");
  const [gatewayNamespace, setGatewayNamespace] = useState("default");
  const [hostnames, setHostnames] = useState("");
  const [pathMatch, setPathMatch] = useState("/");
  
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

    const hostnameList = hostnames.split(",").map(h => h.trim()).filter(h => h);
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

    let rulesYaml = "";
    if (pathMatch && pathMatch !== "/") {
      rulesYaml = `  rules:
  - matches:
    - path:
        type: PathPrefix
        value: ${pathMatch}
    backendRefs:
${backendRefsYaml}
`;
    } else {
      rulesYaml = `  rules:
  - backendRefs:
${backendRefsYaml}
`;
    }

    const yaml = `apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
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
${rulesYaml}`;

    try {
      const response = await applyResource(yaml);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Failed to create: ${response.status}`);
      }
      onOpenChange(false);
      resetForm();
      router.refresh();
    } catch (err) {
      setError((err as Error).message || "Failed to create route");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setGatewayName("");
    setHostnames("");
    setPathMatch("/");
    setBackends([{ name: "", namespace: "default", port: 80, weight: 100 }]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create HTTPRoute</DialogTitle>
          <DialogDescription>
            Define an HTTP routing rule to direct traffic to backend services.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Basic Information</CardTitle>
                <CardDescription>HTTPRoute identity and metadata</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="route-name">Route Name *</Label>
                    <Input
                      id="route-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="my-http-route"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="route-namespace">Namespace *</Label>
                    <Input
                      id="route-namespace"
                      value={namespace}
                      onChange={(e) => setNamespace(e.target.value)}
                      placeholder="default"
                      required
                    />
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
                    <Input
                      id="gw-name"
                      value={gatewayName}
                      onChange={(e) => setGatewayName(e.target.value)}
                      placeholder="my-gateway"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="gw-namespace">Gateway Namespace *</Label>
                    <Input
                      id="gw-namespace"
                      value={gatewayNamespace}
                      onChange={(e) => setGatewayNamespace(e.target.value)}
                      placeholder="default"
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="hostnames">Hostnames (optional)</Label>
                  <Input
                    id="hostnames"
                    value={hostnames}
                    onChange={(e) => setHostnames(e.target.value)}
                    placeholder="example.com, *.example.com (comma separated)"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to match all hostnames
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Routing Rules</CardTitle>
                <CardDescription>Match incoming requests and route to backends</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="path-match">Path Match Type</Label>
                  <Input
                    id="path-match"
                    value={pathMatch}
                    onChange={(e) => setPathMatch(e.target.value)}
                    placeholder="/"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use / for catch-all, or /api, /v1 etc. for path prefix matching
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Backend Services</CardTitle>
                  <CardDescription>Define destinations for traffic (supports multiple for traffic splitting)</CardDescription>
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
                        placeholder="my-service"
                      />
                    </div>
                    <div className="grid gap-1 w-24">
                      <Label className="text-xs text-muted-foreground">Namespace</Label>
                      <Input
                        value={backend.namespace}
                        onChange={(e) => updateBackend(index, "namespace", e.target.value)}
                        placeholder="default"
                      />
                    </div>
                    <div className="grid gap-1 w-20">
                      <Label className="text-xs text-muted-foreground">Port</Label>
                      <Input
                        type="number"
                        value={backend.port}
                        onChange={(e) => updateBackend(index, "port", parseInt(e.target.value) || 80)}
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
                        className="text-red-500 hover:text-red-600 h-10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  Multiple backends enable traffic splitting (canary deployments). Weights should sum to 100.
                </p>
              </CardContent>
            </Card>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create HTTPRoute"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}