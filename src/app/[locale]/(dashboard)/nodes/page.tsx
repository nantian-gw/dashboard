"use client";

import { useTranslations } from "next-intl";
import { useNodes } from "@/hooks/use-api";
import type { NodeRow } from "@/lib/admin-models";
import { StatusBadge } from "@/components/dashboard/status-badge";
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

export default function NodesPage() {
  const t = useTranslations();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("pages.nodes.title")}</h1>
        <p className="text-muted-foreground">{t("pages.nodes.subtitle")}</p>
      </div>
      <NodesContent />
    </div>
  );
}

function NodesContent() {
  const t = useTranslations();
  const { data, isLoading, error } = useNodes();

  const rows = Array.isArray(data) ? data : data?.nodes || [];

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Failed to load nodes: {(error as Error).message}
        </CardContent>
      </Card>
    );
  }

  const readyCount = rows.filter((n) => n.status === "Ready").length;

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{rows.length}</div>
            <p className="text-sm text-muted-foreground">Total Nodes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{readyCount}</div>
            <p className="text-sm text-muted-foreground">Ready</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {rows.filter((n) => n.drifted || n.ackState === "Drifted").length}
            </div>
            <p className="text-sm text-muted-foreground">Drifted</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data Plane Nodes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("labels.name")}</TableHead>
                <TableHead>{t("labels.ready")}</TableHead>
                <TableHead>{t("labels.ack_state")}</TableHead>
                <TableHead>{t("labels.snapshot_version")}</TableHead>
                <TableHead>{t("labels.last_seen")}</TableHead>
                <TableHead>{t("labels.drifted")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((node: NodeRow, idx: number) => (
                <TableRow key={idx}>
                  <TableCell className="font-mono font-medium">{node.name}</TableCell>
                  <TableCell>
                    <StatusBadge status={node.status || (node.ready ? "Ready" : "Unknown")} />
                  </TableCell>
                  <TableCell>{node.ackState || "—"}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {node.snapshotVersion || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {node.lastSeen || "—"}
                  </TableCell>
                  <TableCell>
                    {node.drifted ? (
                      <StatusBadge status="Drifted" />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No nodes found
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
