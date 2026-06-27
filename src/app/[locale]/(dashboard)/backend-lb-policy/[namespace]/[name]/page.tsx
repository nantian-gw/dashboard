"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { LocalizedLink } from "@/components/dashboard/localized-link";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { useBackendLb } from "@/hooks/use-api";
import { deleteResource } from "@/lib/api";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { useLocalizedDashboardRouter } from "@/lib/use-localized-dashboard-router";

export default function BackendLbPolicyDetailPage() {
  const { push } = useLocalizedDashboardRouter();
  const params = useParams();
  const namespace = String(params.namespace || "");
  const name = String(params.name || "");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await deleteResource(`/v1/resources/backendlbpolicy/${namespace}/${name}`);
      push("/backend-lb-policy");
    } catch (err) {
      alert("Failed to delete: " + ((err as Error).message || "unknown error"));
      setDeleteLoading(false);
    }
  };

  const { data, isLoading, error } = useBackendLb();
  const policies = Array.isArray(data) ? data : data?.policies || [];
  const policy = policies.find(
    (p: any) => p.name === name && p.namespace === namespace
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !policy) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Failed to load BackendLBPolicy:{" "}
          {error ? (error as Error).message : "not found"}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <LocalizedLink href="/backend-lb-policy">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </LocalizedLink>
        <div>
          <h1 className="text-3xl font-bold">{policy.name}</h1>
          <p className="text-muted-foreground">
            BackendLBPolicy — {policy.namespace}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <StatusBadge status={policy.status || "Unknown"} />
          <LocalizedLink
            href={`/backend-lb-policy/${policy.namespace}/${policy.name}/edit`}
          >
            <Button variant="outline" size="sm">
              <Pencil className="mr-1 h-4 w-4" /> Edit
            </Button>
          </LocalizedLink>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="mr-1 h-4 w-4 text-red-500" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Target Refs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(policy.targetRefs || []).length === 0 && (
              <p className="text-sm text-muted-foreground">—</p>
            )}
            {(policy.targetRefs || []).map((ref: any, idx: number) => (
              <div key={idx} className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {ref.kind || "Service"} #{idx + 1}
                </Label>
                <p className="text-sm font-medium">{ref.name}</p>
                {ref.group && (
                  <p className="text-xs text-muted-foreground">
                    Group: {ref.group}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Session Persistence</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Type</Label>
              <p className="text-sm font-medium">
                {policy.sessionPersistence || "Disabled"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Load Balancing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Strategy</Label>
              <p className="text-sm font-medium">
                {policy.loadBalancing || "Round Robin"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Circuit Breaker</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Config</Label>
              <p className="text-sm font-medium">
                {policy.circuitBreaker || "Disabled"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete BackendLBPolicy"
        description={`Delete BackendLBPolicy ${namespace}/${name}? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </div>
  );
}
