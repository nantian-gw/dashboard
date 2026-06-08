"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useWasmPlugins } from "@/hooks/use-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil, Trash2, Loader2 } from "lucide-react";
import { deleteResource } from "@/lib/api";
import Link from "next/link";

interface WasmSource {
  url?: string;
  configMap?: { namespace: string; name: string; key: string };
  inline?: string;
}

interface SandboxSettings {
  maxMemory?: number;
  maxExecutionTime?: number;
  allowNetwork?: boolean;
  allowFileSystem?: boolean;
}

interface Condition {
  type: string;
  status: string;
  reason?: string;
  message?: string;
  lastTransitionTime?: string;
}

function getHooks(spec: Record<string, unknown> | undefined): string[] {
  const hooks: string[] = [];
  if (!spec) return hooks;
  if (spec.httpFilters) hooks.push("HTTP Filters");
  if (spec.networkFilters) hooks.push("Network Filters");
  if (spec.streamFilters) hooks.push("Stream Filters");
  return hooks;
}

function getWasmSource(
  spec: Record<string, unknown> | undefined
): WasmSource | null {
  if (!spec?.wasm) return null;
  return spec.wasm as WasmSource;
}

function getSandbox(
  spec: Record<string, unknown> | undefined
): SandboxSettings | null {
  if (!spec?.sandbox) return null;
  return spec.sandbox as SandboxSettings;
}

function getConfig(spec: Record<string, unknown> | undefined): unknown {
  if (!spec?.config) return null;
  return spec.config;
}

function getConditions(
  status: Record<string, unknown> | undefined
): Condition[] {
  if (!status?.conditions) return [];
  return status.conditions as Condition[];
}

export default function WasmPluginDetailPage() {
  const t = useTranslations();
  const params = useParams();
  const name = decodeURIComponent(params.name as string);
  const locale = (params as { locale: string }).locale;

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const { data, isLoading, error } = useWasmPlugins();
  const plugins = data?.plugins || [];
  const plugin = plugins.find((p) => p.name === name);

  const handleDelete = async () => {
    if (!plugin) return;
    setDeleteLoading(true);
    setDeleteError("");
    try {
      const res = await deleteResource(`/v1/resources/wasmplugin/${plugin.namespace}/${plugin.name}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Delete failed: ${res.status}`);
      }
      window.location.href = `/${locale}/wasm/plugins`;
    } catch (err) {
      setDeleteError((err as Error).message);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Failed to load Wasm Plugin: {(error as Error).message}
        </CardContent>
      </Card>
    );
  }

  if (!plugin) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Wasm Plugin not found.
        </CardContent>
      </Card>
    );
  }

  const spec = plugin?.resource?.spec as Record<string, unknown> | undefined;
  const status = plugin?.resource?.status as Record<string, unknown> | undefined;
  const hooks = getHooks(spec);
  const wasmSource = getWasmSource(spec);
  const sandbox = getSandbox(spec);
  const config = getConfig(spec);
  const conditions = getConditions(status);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/${locale}/wasm/plugins`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{plugin.name ?? ""}</h1>
          <p className="text-muted-foreground">
            {t("wasm.plugins.detail.subtitle", { namespace: plugin.namespace ?? "" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/${locale}/wasm/plugins/${encodeURIComponent(plugin.name ?? "")}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="h-4 w-4 mr-1" />
              {t("wasm.plugins.edit")}
            </Button>
          </Link>
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4 mr-1" />
            {t("wasm.plugins.delete")}
          </Button>
        </div>
      </div>

      <Dialog open={deleteOpen} onOpenChange={(o) => { if (!o) setDeleteOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("wasm.plugins.delete_title")}</DialogTitle>
            <DialogDescription>
              {t("wasm.plugins.delete_confirm", { name: plugin.name ?? "", namespace: plugin.namespace ?? "" })}
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p className="text-sm text-red-600">{deleteError}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              {t("wasm.plugins.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("wasm.plugins.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("wasm.plugins.detail.wasmSource")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!wasmSource && (
              <p className="text-sm text-muted-foreground">
                No WASM source configured.
              </p>
            )}
            {wasmSource?.url && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">URL</span>
                <p className="font-mono text-sm break-all">{wasmSource.url}</p>
              </div>
            )}
            {wasmSource?.configMap && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">ConfigMap</span>
                <p className="font-mono text-sm">
                  {wasmSource.configMap.namespace}/
                  {wasmSource.configMap.name}/{wasmSource.configMap.key}
                </p>
              </div>
            )}
            {wasmSource?.inline && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Inline</span>
                <pre className="text-xs bg-muted rounded p-2 max-h-32 overflow-auto">
                  {wasmSource.inline.length > 200
                    ? wasmSource.inline.substring(0, 200) + "..."
                    : wasmSource.inline}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("wasm.plugins.detail.sandbox")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!sandbox && (
              <p className="text-sm text-muted-foreground">
                No sandbox settings configured.
              </p>
            )}
            {sandbox?.maxMemory !== undefined && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("wasm.plugins.detail.maxMemory")}
                </span>
                <span className="text-sm font-mono">
                  {sandbox.maxMemory.toLocaleString()}
                </span>
              </div>
            )}
            {sandbox?.maxExecutionTime !== undefined && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("wasm.plugins.detail.maxExecutionTime")}
                </span>
                <span className="text-sm font-mono">
                  {sandbox.maxExecutionTime}ms
                </span>
              </div>
            )}
            {sandbox?.allowNetwork !== undefined && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("wasm.plugins.detail.allowNetwork")}
                </span>
                <Badge
                  variant={sandbox.allowNetwork ? "default" : "secondary"}
                >
                  {sandbox.allowNetwork ? "Allowed" : "Blocked"}
                </Badge>
              </div>
            )}
            {sandbox?.allowFileSystem !== undefined && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("wasm.plugins.detail.allowFileSystem")}
                </span>
                <Badge
                  variant={sandbox.allowFileSystem ? "default" : "secondary"}
                >
                  {sandbox.allowFileSystem ? "Allowed" : "Blocked"}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("wasm.plugins.detail.hooks")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hooks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hooks configured.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {hooks.map((hook) => (
                  <Badge key={hook} variant="secondary">
                    {hook}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("wasm.plugins.detail.config")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {config === null ? (
              <p className="text-sm text-muted-foreground">
                No configuration provided.
              </p>
            ) : (
              <pre className="text-xs bg-muted rounded p-3 max-h-48 overflow-auto font-mono">
                {JSON.stringify(config, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("wasm.plugins.detail.status")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {conditions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No status conditions reported.
            </p>
          ) : (
            <div className="border rounded-md">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-2 font-medium">Type</th>
                    <th className="text-left px-4 py-2 font-medium">Status</th>
                    <th className="text-left px-4 py-2 font-medium">Reason</th>
                    <th className="text-left px-4 py-2 font-medium">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {conditions.map((cond, i) => (
                    <tr
                      key={i}
                      className={i < conditions.length - 1 ? "border-b" : ""}
                    >
                      <td className="px-4 py-2 font-medium">{cond.type}</td>
                      <td className="px-4 py-2">
                        <Badge
                          variant={
                            cond.status === "True" ? "default" : "destructive"
                          }
                        >
                          {cond.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {cond.reason || "-"}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground max-w-xs truncate">
                        {cond.message || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
