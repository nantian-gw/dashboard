"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRoute } from "@/hooks/use-api";
import { useParams, useRouter } from "next/navigation";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Server, Network, Clock, Filter, Hash, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { CodeBlock } from "@/components/dashboard/code-block";
import { deleteResource } from "@/lib/api";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type RouteDetail = {
  name?: string;
  namespace?: string;
  kind?: string;
  status?: string;
  manifest?: string;
  parentRefs?: Record<string, unknown>[];
  hostnames?: string[];
  rules?: Record<string, unknown>[];
  filters?: Record<string, unknown>[];
  timeouts?: Record<string, unknown>;
};

export default function RouteDetailPage() {
  const router = useRouter();
  const t = useTranslations();
  const params = useParams();
  const namespace = String(params.namespace || "");
  const name = String(params.name || "");
  const kind = params.kind as string || "HTTPRoute";
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await deleteResource(`/v1/resources/${kind.toLowerCase()}/${namespace}/${name}`);
      router.push("/routes");
    } catch (err) {
      alert("Failed to delete: " + ((err as Error).message || "unknown error"));
      setDeleteLoading(false);
    }
  };

  const { data, isLoading, error } = useRoute(namespace, name, kind);

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
          Failed to load route: {error instanceof Error ? error.message : "not found"}
        </CardContent>
      </Card>
    );
  }

  const route = data?.route as RouteDetail | undefined;
  if (!route) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Route data not available
        </CardContent>
      </Card>
    );
  }

  const parentRefs = route.parentRefs || [];
  const hostnames = route?.hostnames || [];
  const rules = route?.rules || [];
  const filters = route?.filters || [];
  const timeouts = route?.timeouts as Record<string, unknown> | undefined;

  const rulesWithBackends = rules.map((rule: any) => {
    const pathMatches: string[] = [];
    if (rule.matches) {
      rule.matches.forEach((m: any) => {
        if (m.path) {
          pathMatches.push(`${m.path.type || "PathPrefix"}: ${m.path.value || "/"}`);
        }
        if (m.headers) {
          pathMatches.push(`Headers: ${m.headers.length}`);
        }
        if (m.method) {
          pathMatches.push(`Method: ${m.method}`);
        }
      });
    }
    const ruleBackends = (rule.backendRefs || []).map((br: any) => ({
      name: br.name,
      namespace: br.namespace || route?.namespace,
      port: br.port,
      weight: br.weight || 0,
    }));
    return { pathMatches, backends: ruleBackends, filters: rule.filters || [] };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/routes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{route.name}</h1>
          <p className="text-muted-foreground">{route.namespace}</p>
        </div>
        <span className="rounded bg-muted px-2 py-1 text-sm font-mono">{route.kind}</span>
        <div className="ml-auto flex items-center gap-2">
          <StatusBadge status={route.status || "Unknown"} />
          <Link href={`/routes/${kind.toLowerCase()}/${namespace}/${name}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
            </Button>
          </Link>
          <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Network className="h-4 w-4" />
              <CardTitle className="text-base">{t("route_detail.parent_gateway")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {parentRefs.length > 0 ? (
              <div className="space-y-2">
                {parentRefs.map((parent: any, idx: number) => (
                  <Link
                    key={idx}
                    href={`/gateways/${parent.namespace || "default"}/${parent.name}`}
                    className="flex items-center gap-2 hover:underline"
                  >
                    <span className="font-mono text-sm">
                      {parent.namespace ? `${parent.namespace}/${parent.name}` : parent.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({parent.kind || "Gateway"})
                    </span>
                    {parent.sectionName && (
                      <span className="text-xs bg-muted px-1 rounded">
                        port: {parent.port || "default"} {parent.sectionName && `section: ${parent.sectionName}`}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">{t("route_detail.no_parent_gateway")}</p>
            )}
          </CardContent>
        </Card>

        {hostnames.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4" />
                <CardTitle className="text-base">{t("route_detail.hostnames")}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {hostnames.map((hostname: string, idx: number) => (
                  <span key={idx} className="rounded bg-muted px-2 py-1 text-sm font-mono">
                    {hostname}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {rulesWithBackends.length > 0 ? (
        rulesWithBackends.map((ruleData: { pathMatches: string[]; backends: any[]; filters: any[] }, ruleIdx: number) => (
          <Card key={ruleIdx}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4" />
                <CardTitle className="text-base">{t("create.route.rule_n", { n: ruleIdx + 1 })}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {ruleData.pathMatches.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">{t("route_detail.path_matches")}</Label>
                  <div className="flex flex-wrap gap-2">
                    {ruleData.pathMatches.map((match, idx) => (
                      <span key={idx} className="rounded bg-blue-50 border border-blue-200 px-2 py-1 text-sm font-mono text-blue-700">
                        {match}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {ruleData.backends.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("labels.service")}</TableHead>
                      <TableHead>{t("labels.namespace")}</TableHead>
                      <TableHead>{t("labels.port")}</TableHead>
                      <TableHead>{t("create.route.weight")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ruleData.backends.map((backend, bIdx) => (
                      <TableRow key={bIdx}>
                        <TableCell className="font-mono">{backend.name}</TableCell>
                        <TableCell className="text-muted-foreground">{backend.namespace}</TableCell>
                        <TableCell>{backend.port}</TableCell>
                        <TableCell>{backend.weight}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-sm">{t("route_detail.no_backend_services")}</p>
              )}
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t("route_detail.no_backend_services")}
          </CardContent>
        </Card>
      )}

      {filters.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <CardTitle className="text-base">{t("route_detail.filters")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filters.map((filter: any, idx: number) => (
                <div key={idx} className="p-3 border rounded-md bg-slate-50/50">
                  <div className="font-mono text-sm font-medium">{filter.type}</div>
                  {filter.requestHeaderModifier && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      <div className="font-medium">Request Header Modifier:</div>
                      {filter.requestHeaderModifier.add && (
                        <div className="ml-2">Add: {JSON.stringify(filter.requestHeaderModifier.add)}</div>
                      )}
                      {filter.requestHeaderModifier.remove && (
                        <div className="ml-2">Remove: {JSON.stringify(filter.requestHeaderModifier.remove)}</div>
                      )}
                    </div>
                  )}
                  {filter.responseHeaderModifier && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      <div className="font-medium">Response Header Modifier:</div>
                      {filter.responseHeaderModifier.add && (
                        <div className="ml-2">Add: {JSON.stringify(filter.responseHeaderModifier.add)}</div>
                      )}
                    </div>
                  )}
                  {filter.requestRedirect && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      Request Redirect: {filter.requestRedirect.scheme}://{filter.requestRedirect.hostname}{filter.requestRedirect.path}
                    </div>
                  )}
                  {filter.urlRewrite && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      URL Rewrite: {filter.urlRewrite.pathType} → {filter.urlRewrite.path || filter.urlRewrite.hostname || ""}
                    </div>
                  )}
                  {filter.requestMirror && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      Request Mirror: {filter.requestMirror.backendRef?.name}:{filter.requestMirror.backendRef?.port}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {timeouts && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <CardTitle className="text-base">{t("route_detail.timeouts")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2">
              {timeouts.request != null && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{t("route_detail.timeout_request")}:</span>
                  <span className="font-mono">{String(timeouts.request)}</span>
                </div>
              )}
              {timeouts.backendRequest != null && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{t("route_detail.timeout_backend_request")}:</span>
                  <span className="font-mono">{String(timeouts.backendRequest)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

<Card>
          <CardHeader>
            <CardTitle className="text-base">{t("route_detail.manifest")}</CardTitle>
          </CardHeader>
        <CardContent>
          <CodeBlock code={route.manifest || ""} language="yaml" />
        </CardContent>
      </Card>
    <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${kind}`}
        description={`Delete ${kind} ${namespace}/${name}? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </div>
  );
}
