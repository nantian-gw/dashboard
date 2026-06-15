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
import { useBackendTls } from "@/hooks/use-api";
import { deleteResource } from "@/lib/api";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { useLocalizedDashboardRouter } from "@/lib/use-localized-dashboard-router";

export default function BackendTlsDetailPage() {
  const { push } = useLocalizedDashboardRouter();
  const params = useParams();
  const namespace = String(params.namespace || "");
  const name = String(params.name || "");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await deleteResource(`/v1/resources/backendtlspolicy/${namespace}/${name}`);
      push("/backend-tls");
    } catch (err) {
      alert("Failed to delete: " + ((err as Error).message || "unknown error"));
      setDeleteLoading(false);
    }
  };

  const { data, isLoading, error } = useBackendTls();
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
          Failed to load BackendTLSPolicy: {error ? (error as Error).message : "not found"}
        </CardContent>
      </Card>
    );
  }

  const targetRef = policy.targetRef || {};
  const caCert = policy.caCertificate || "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <LocalizedLink href="/backend-tls">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </LocalizedLink>
        <div>
          <h1 className="text-3xl font-bold">{policy.name}</h1>
          <p className="text-muted-foreground">
            BackendTLSPolicy · {policy.namespace}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <StatusBadge status={policy.status || "Unknown"} />
          <LocalizedLink href={`/backend-tls/${namespace}/${name}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
            </Button>
          </LocalizedLink>
          <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Target Ref</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Kind</Label>
              <p className="text-sm font-medium">{targetRef.kind || "—"}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Name</Label>
              <p className="text-sm font-medium">{targetRef.name || "—"}</p>
            </div>
            {targetRef.group && (
              <div>
                <Label className="text-xs text-muted-foreground">Group</Label>
                <p className="text-sm font-medium">{targetRef.group}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Validation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Hostname</Label>
              <p className="text-sm font-medium">{policy.hostname || "—"}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">CA Certificate</Label>
              <p className="text-sm font-medium">{caCert}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete BackendTLSPolicy"
        description={`Delete BackendTLSPolicy ${namespace}/${name}? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </div>
  );
}
