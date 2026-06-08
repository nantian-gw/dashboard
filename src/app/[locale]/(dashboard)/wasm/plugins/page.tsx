"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useWasmPlugins } from "@/hooks/use-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { deleteResource } from "@/lib/api";
import Link from "next/link";

function getHooks(spec: Record<string, unknown> | undefined): string[] {
  const hooks: string[] = [];
  if (!spec) return hooks;
  if (spec.httpFilters) hooks.push("HTTP Filters");
  if (spec.networkFilters) hooks.push("Network Filters");
  if (spec.streamFilters) hooks.push("Stream Filters");
  return hooks;
}

function getStatusConditions(
  status: Record<string, unknown> | undefined
): string {
  if (!status) return "Unknown";
  const conditions = (status.conditions as Array<Record<string, unknown>>) || [];
  if (conditions.length === 0) return "Active";
  const ready = conditions.find((c) => c.type === "Ready");
  if (!ready) return "Active";
  return ready.status === "True" ? "Ready" : "Not Ready";
}

export default function WasmPluginsPage() {
  const t = useTranslations();
  const locale = (useParams() as { locale: string }).locale;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("wasm.plugins.title")}</h1>
        </div>
        <Link href={`/${locale}/wasm/plugins/create`}>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            {t("wasm.plugins.create_button")}
          </Button>
        </Link>
      </div>
      <WasmPluginsContent />
    </div>
  );
}

function WasmPluginsContent() {
  const t = useTranslations();
  const { data, isLoading, error } = useWasmPlugins();
  const queryClient = useQueryClient();
  const params = useParams();
  const locale = (params as { locale: string }).locale;

  const [deleteTarget, setDeleteTarget] = useState<{ name: string; namespace: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const rows = data?.plugins || [];

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError("");
    try {
      const res = await deleteResource(`/v1/resources/wasmplugin/${deleteTarget.namespace}/${deleteTarget.name}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Delete failed: ${res.status}`);
      }
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["wasm", "plugins"] });
    } catch (err) {
      setDeleteError((err as Error).message);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Failed to load Wasm Plugins: {(error as Error).message}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            {t("wasm.plugins.count", { count: rows.length })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("wasm.plugins.columns.name")}</TableHead>
                <TableHead>{t("wasm.plugins.columns.namespace")}</TableHead>
                <TableHead>{t("wasm.plugins.columns.hooks")}</TableHead>
                <TableHead>{t("wasm.plugins.columns.status")}</TableHead>
                <TableHead className="text-right">{t("wasm.plugins.columns.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((plugin: any) => {
                const spec = plugin?.resource?.spec as
                  | Record<string, unknown>
                  | undefined;
                const status = plugin?.resource?.status as
                  | Record<string, unknown>
                  | undefined;
                const hooks = getHooks(spec);
                const statusSummary = getStatusConditions(status);
                return (
                  <TableRow key={`${plugin.namespace}-${plugin.name}`}>
                    <TableCell>
                      <Link
                        href={`/${locale}/wasm/plugins/${encodeURIComponent(plugin.name)}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {plugin.name}
                      </Link>
                    </TableCell>
                    <TableCell>{plugin.namespace}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {hooks.map((h) => (
                          <Badge key={h} variant="secondary">
                            {h}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          statusSummary === "Ready" ? "default" : "secondary"
                        }
                      >
                        {statusSummary}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget({ name: plugin.name, namespace: plugin.namespace })}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {t("wasm.plugins.empty")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("wasm.plugins.delete_title")}</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? t("wasm.plugins.delete_confirm", { name: deleteTarget.name, namespace: deleteTarget.namespace })
                : ""}
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p className="text-sm text-red-600">{deleteError}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {t("wasm.plugins.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("wasm.plugins.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
