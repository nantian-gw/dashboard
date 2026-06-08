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
import { applyResource } from "@/lib/api";

interface CreateGatewayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateGatewayDialog({ open, onOpenChange }: CreateGatewayDialogProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [namespace, setNamespace] = useState("default");
  const [gatewayClass, setGatewayClass] = useState("nantian");
  const [listeners, setListeners] = useState<{port: number; protocol: string; name: string}[]>([
    { port: 80, protocol: "HTTP", name: "http" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const listenersYaml = listeners.map(l => 
`    - name: ${l.name}
      port: ${l.port}
      protocol: ${l.protocol}`
    ).join("\n");

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
      const response = await applyResource(yaml);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Failed to create: ${response.status}`);
      }
      onOpenChange(false);
      setName("");
      setListeners([{ port: 80, protocol: "HTTP", name: "http" }]);
      router.refresh();
    } catch (err) {
      setError((err as Error).message || "Failed to create gateway");
    } finally {
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
    setListeners(updated);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Gateway</DialogTitle>
          <DialogDescription>
            Create a new Gateway to expose services externally.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Basic Information</CardTitle>
                <CardDescription>Gateway identity and metadata</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Gateway Name *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="my-gateway"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="namespace">Namespace *</Label>
                    <Input
                      id="namespace"
                      value={namespace}
                      onChange={(e) => setNamespace(e.target.value)}
                      placeholder="default"
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="gw-class">GatewayClass *</Label>
                  <Input
                    id="gw-class"
                    value={gatewayClass}
                    onChange={(e) => setGatewayClass(e.target.value)}
                    placeholder="nantian"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    The GatewayClass defines the controller that manages this Gateway
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Listeners</CardTitle>
                  <CardDescription>Define ports and protocols for the Gateway</CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addListener}>
                  Add Listener
                </Button>
              </CardHeader>
              <CardContent className="grid gap-4">
                {listeners.map((listener, index) => (
                  <div key={index} className="flex gap-4 items-end p-4 border rounded-md">
                    <div className="grid gap-2">
                      <Label>Name</Label>
                      <Input
                        value={listener.name}
                        onChange={(e) => updateListener(index, "name", e.target.value)}
                        placeholder="http"
                        className="w-24"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Port</Label>
                      <Input
                        type="number"
                        value={listener.port}
                        onChange={(e) => updateListener(index, "port", parseInt(e.target.value))}
                        placeholder="80"
                        className="w-24"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Protocol</Label>
                      <Input
                        value={listener.protocol}
                        onChange={(e) => updateListener(index, "protocol", e.target.value)}
                        placeholder="HTTP"
                        className="w-24"
                      />
                    </div>
                    {listeners.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeListener(index)}
                        className="text-red-500 hover:text-red-600"
                      >
                        ×
                      </Button>
                    )}
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  Supported protocols: HTTP, HTTPS, TCP, UDP, TLS, GRPC
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
              {isLoading ? "Creating..." : "Create Gateway"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}