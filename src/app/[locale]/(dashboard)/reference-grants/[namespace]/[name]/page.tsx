"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useReferenceGrant } from "@/hooks/use-api";
import { LocalizedLink } from "@/components/dashboard/localized-link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { toYaml } from "@/lib/admin-models";
import { deleteResource } from "@/lib/api";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { useLocalizedDashboardRouter } from "@/lib/use-localized-dashboard-router";

export default function ReferenceGrantDetailPage() {
  const { push } = useLocalizedDashboardRouter();
  const params = useParams();
  const namespace = params.namespace as string;
  const name = params.name as string;
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await deleteResource(`/v1/resources/referencegrant/${namespace}/${name}`);
      push("/reference-grants");
    } catch (err) {
      alert("Failed to delete: " + ((err as Error).message || "unknown error"));
      setDeleteLoading(false);
    }
  };

  const { data: grant, isLoading, error } = useReferenceGrant(namespace, name);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !grant) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Failed to load ReferenceGrant: {(error as Error)?.message || "Not found"}
        </CardContent>
      </Card>
    );
  }

  const spec = (grant?.resource as Record<string, unknown> | undefined)?.spec as Record<string, unknown> | undefined;
  const froms = (spec?.from as unknown[]) || [];
  const tos = (spec?.to as unknown[]) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <LocalizedLink href="/reference-grants">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </LocalizedLink>
        <div>
          <h1 className="text-3xl font-bold">{grant.name}</h1>
          <p className="text-muted-foreground">
            ReferenceGrant · {grant.namespace}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <LocalizedLink href={`/reference-grants/${namespace}/${name}/edit`}>
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
            <CardTitle className="text-base">From (Sources)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {froms.length === 0 && (
              <p className="text-sm text-muted-foreground">No sources configured</p>
            )}
            {froms.map((f: any, i: number) => (
              <div key={i} className="border rounded-md p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{f.kind}</Badge>
                  <span className="text-sm text-muted-foreground">{f.group || "core"}</span>
                </div>
                <p className="text-sm">
                  Namespace: <code className="rounded bg-muted px-1">{f.namespace}</code>
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">To (Targets)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tos.length === 0 && (
              <p className="text-sm text-muted-foreground">No targets configured</p>
            )}
            {tos.map((t: any, i: number) => (
              <div key={i} className="border rounded-md p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{t.kind}</Badge>
                  <span className="text-sm text-muted-foreground">{t.group || "core"}</span>
                </div>
                {t.name && (
                  <p className="text-sm">
                    Name: <code className="rounded bg-muted px-1">{t.name}</code>
                  </p>
                )}
                {!t.name && (
                  <p className="text-xs text-muted-foreground">All resources of this kind</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Manifest</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="rounded bg-muted p-4 text-xs overflow-x-auto">
            {toYaml(grant.resource || grant)}
          </pre>
        </CardContent>
      </Card>
    <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete ReferenceGrant"
        description={`Delete ReferenceGrant ${namespace}/${name}? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </div>
  );
}
