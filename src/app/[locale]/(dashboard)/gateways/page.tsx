"use client";

import { useTranslations } from "next-intl";
import { useGateways } from "@/hooks/use-api";
import { useAtomValue } from "jotai";
import { searchAtom } from "@/lib/store";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { KpiCard } from "@/components/dashboard/kpi-card";
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
import { Plus } from "lucide-react";
import Link from "next/link";

export default function GatewaysPage() {
  const t = useTranslations();
  const search = useAtomValue(searchAtom);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("pages.gateways.title")}</h1>
        <p className="text-muted-foreground">{t("pages.gateways.subtitle")}</p>
      </div>
      <GatewaysContent search={search} />
    </div>
  );
}

function GatewaysContent({ search }: { search: string }) {
  const t = useTranslations();
  const { data, isLoading, error } = useGateways();

  const rows = Array.isArray(data) ? data : data?.gateways || [];

  const filtered = search
    ? rows.filter(
        (r) =>
          `${r.name} ${r.namespace} ${r.address} ${r.status}`
            .toLowerCase()
            .includes(search.toLowerCase())
      )
    : rows;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Failed to load gateways: {(error as Error).message}
        </CardContent>
      </Card>
    );
  }

  const readyCount = rows.filter((r) => r.status === "Ready").length;

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Gateways" value={rows.length} />
        <KpiCard label="Ready" value={readyCount} />
        <KpiCard label="HTTP Routes" value={data?.httpRouteCount ?? 0} />
        <KpiCard label="gRPC Routes" value={data?.grpcRouteCount ?? 0} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{t("labels.gateways")}</CardTitle>
          <Link href="/gateways/create">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              {t("actions.create_gateway")}
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("labels.name")}</TableHead>
                <TableHead>{t("labels.gatewayclass")}</TableHead>
                <TableHead>{t("labels.status")}</TableHead>
                <TableHead>{t("labels.address")}</TableHead>
                <TableHead>{t("labels.listeners")}</TableHead>
                <TableHead>{t("labels.routes")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((gateway: any) => (
                <TableRow key={`${gateway.namespace}-${gateway.name}`}>
                  <TableCell>
                    <Link
                      href={`/gateways/${gateway.namespace}/${gateway.name}`}
                      className="font-medium hover:underline"
                    >
                      <ClampText value={gateway.name} head={18} tail={8} />
                    </Link>
                    <p className="text-xs text-muted-foreground">{gateway.namespace}</p>
                  </TableCell>
                  <TableCell>{gateway.gatewayClass || "nantian"}</TableCell>
                  <TableCell>
                    <StatusBadge status={gateway.status || "Unknown"} />
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {gateway.address || "—"}
                  </TableCell>
                  <TableCell>{gateway.listenerCount ?? 0}</TableCell>
                  <TableCell>{gateway.routeCount ?? 0}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No gateways found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
