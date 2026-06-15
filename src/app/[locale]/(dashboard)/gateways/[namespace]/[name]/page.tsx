"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useGateway } from "@/hooks/use-api";
import type { ListenerRow, RouteRow } from "@/lib/admin-models";
import { useParams } from "next/navigation";
import { LocalizedLink } from "@/components/dashboard/localized-link";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { ClampText } from "@/components/dashboard/clamp-text";
import { Button } from "@/components/ui/button";
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
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ArrowLeft, ChevronDown, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { CodeBlock } from "@/components/dashboard/code-block";
import { deleteResource } from "@/lib/api";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { useLocalizedDashboardRouter } from "@/lib/use-localized-dashboard-router";

export default function GatewayDetailPage() {
  const { push } = useLocalizedDashboardRouter();
  const t = useTranslations();
  const params = useParams();
  const namespace = String(params.namespace || "");
  const name = String(params.name || "");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await deleteResource(`/v1/resources/gateway/${namespace}/${name}`);
      push("/gateways");
    } catch (err) {
      alert("Failed to delete: " + ((err as Error).message || "unknown error"));
      setDeleteLoading(false);
    }
  };

  const { data, isLoading, error } = useGateway(namespace, name);
  const [expandedListeners, setExpandedListeners] = useState<Set<number>>(new Set());

  const toggleListener = (idx: number) => {
    const newSet = new Set(expandedListeners);
    if (newSet.has(idx)) {
      newSet.delete(idx);
    } else {
      newSet.add(idx);
    }
    setExpandedListeners(newSet);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Failed to load gateway: {error instanceof Error ? error.message : "not found"}
        </CardContent>
      </Card>
    );
  }

  const gateway = data;
  const listeners: ListenerRow[] = gateway.listeners || [];
  const routes: RouteRow[] = gateway.routes || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <LocalizedLink href="/gateways">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </LocalizedLink>
        <div>
          <h1 className="text-3xl font-bold">{gateway.name}</h1>
          <p className="text-muted-foreground">{gateway.namespace}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <StatusBadge status={gateway.status || "Unknown"} />
          <LocalizedLink href={`/gateways/${namespace}/${name}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
            </Button>
          </LocalizedLink>
          <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
          </Button>
        </div>
      </div>

      {gateway.address && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("labels.address")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono">{gateway.address}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard label={t("gateway_detail.listener_total")} value={listeners.length} />
        <KpiCard
          label={t("gateway_detail.listener_ready")}
          value={listeners.filter((l: any) => l.status === "Ready").length}
        />
        <KpiCard
          label={t("gateway_detail.listener_warning")}
          value={listeners.filter(
            (l: any) =>
              l.status !== "Ready" &&
              l.status !== "Unknown" &&
              !/invalid|error|refused|failed/i.test(l.status)
          ).length}
        />
        <KpiCard
          label={t("gateway_detail.listener_failed")}
          value={listeners.filter((l: any) => /invalid|error|refused|failed/i.test(l.status)).length}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("gateway_detail.listeners_count", { count: listeners.length })}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>{t("labels.protocol")}</TableHead>
                <TableHead>{t("labels.name")}</TableHead>
                <TableHead>{t("labels.port")}</TableHead>
                <TableHead>{t("labels.hostnames")}</TableHead>
                <TableHead>{t("labels.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listeners.map((listener: any, idx: number) => {
                const isExpanded = expandedListeners.has(idx);
                return (
                  <>
                    <TableRow 
                      key={`row-${idx}`} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleListener(idx)}
                    >
                      <TableCell className="w-8">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{listener.protocol}</TableCell>
                      <TableCell>{listener.name || "—"}</TableCell>
                      <TableCell>{listener.port}</TableCell>
                      <TableCell>
                        {listener.hostnames?.join(", ") || "*"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={listener.status || "Unknown"} />
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow key={`detail-${idx}`}>
                        <TableCell colSpan={6} className="bg-muted/30 p-4">
                          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {listener.hostname && (
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">{t("gateway_detail.hostname")}</div>
                                <div className="font-mono text-sm">{listener.hostname}</div>
                              </div>
                            )}
                            {listener.allowedRoutes?.namespaces?.from && (
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">{t("gateway_detail.allowed_namespaces")}</div>
                                <div className="font-mono text-sm">{listener.allowedRoutes.namespaces.from}</div>
                              </div>
                            )}
                            {listener.allowedRoutes?.namespaces?.selector && (
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">{t("gateway_detail.namespace_selector")}</div>
                                <div className="font-mono text-sm">
                                  {JSON.stringify(listener.allowedRoutes.namespaces.selector)}
                                </div>
                              </div>
                            )}
                            {listener.allowedKinds && listener.allowedKinds.length > 0 && (
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">{t("gateway_detail.allowed_route_kinds")}</div>
                                <div className="flex flex-wrap gap-1">
                                  {listener.allowedKinds.map((k: any, ki: number) => (
                                    <span key={ki} className="text-xs bg-muted px-2 py-0.5 rounded">
                                      {k.kind}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {listener.tls && (
                              <>
                                {listener.tls.certificateRefs && (
                                  <div>
                                    <div className="text-xs text-muted-foreground mb-1">TLS Certificate</div>
                                    <div className="font-mono text-sm">
                                      {listener.tls.certificateRefs.map((c: any) => c.name).join(", ")}
                                    </div>
                                  </div>
                                )}
                                {listener.tls.mode && (
                                  <div>
                                    <div className="text-xs text-muted-foreground mb-1">TLS Mode</div>
                                    <div className="font-mono text-sm">{listener.tls.mode}</div>
                                  </div>
                                )}
                              </>
                            )}
                            {listener.filters && listener.filters.length > 0 && (
                              <div className="md:col-span-2 lg:col-span-3">
                                <div className="text-xs text-muted-foreground mb-1">{t("gateway_detail.filters")}</div>
                                <div className="space-y-2">
                                  {listener.filters.map((f: any, fi: number) => (
                                    <div key={fi} className="p-2 bg-muted rounded text-sm font-mono">
                                      {f.type}: {JSON.stringify(f[f.type === "RequestRedirect" ? "requestRedirect" : "requestHeaderModifier"] || {})}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
              {listeners.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {t("gateway_detail.no_listeners")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("gateway_detail.attached_routes_count", { count: routes.length })}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("labels.name")}</TableHead>
                <TableHead>{t("labels.kind")}</TableHead>
                <TableHead>{t("labels.namespace")}</TableHead>
                <TableHead>{t("labels.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {routes.map((route: any, idx: number) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">
                    <LocalizedLink
                      href={`/routes/${route.kind}/${route.namespace}/${route.name}`}
                      className="hover:underline"
                    >
                      <ClampText value={route.name || "—"} head={18} tail={8} />
                    </LocalizedLink>
                  </TableCell>
                  <TableCell>{route.kind}</TableCell>
                  <TableCell>{route.namespace}</TableCell>
                  <TableCell>
                    <StatusBadge status={route.status || "Unknown"} />
                  </TableCell>
                </TableRow>
              ))}
              {routes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    {t("gateway_detail.no_routes_attached")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {gateway.manifest && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("gateway_detail.manifest")}</CardTitle>
          </CardHeader>
          <CardContent>
            <CodeBlock code={gateway.manifest} language="yaml" />
          </CardContent>
        </Card>
      )}
    <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Gateway"
        description={`Delete gateway ${namespace}/${name}? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </div>
  );
}
