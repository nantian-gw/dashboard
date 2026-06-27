"use client";

import { useTranslations } from "next-intl";
import { useBackendLb } from "@/hooks/use-api";
import type { BackendLbPolicyRow } from "@/lib/admin-models";
import { LocalizedLink } from "@/components/dashboard/localized-link";
import { StatusBadge } from "@/components/dashboard/status-badge";
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

export default function BackendLbPolicyPage() {
  const t = useTranslations();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("pages.backendlb.title")}</h1>
        <p className="text-muted-foreground">{t("pages.backendlb.subtitle")}</p>
      </div>
      <BackendLbPolicyContent />
    </div>
  );
}

function BackendLbPolicyContent() {
  const t = useTranslations();
  const { data, isLoading, error } = useBackendLb();

  const rows = Array.isArray(data) ? data : data?.policies || [];

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Failed to load backend LB policies: {(error as Error).message}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">
          BackendLBPolicy ({rows.length})
        </CardTitle>
        <LocalizedLink href="/backend-lb-policy/create">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            {t("actions.create_backend_lb")}
          </Button>
        </LocalizedLink>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("labels.name")}</TableHead>
              <TableHead>{t("labels.namespace")}</TableHead>
              <TableHead>{t("labels.target_refs")}</TableHead>
              <TableHead>{t("labels.session_persistence")}</TableHead>
              <TableHead>{t("labels.load_balancing")}</TableHead>
              <TableHead>{t("labels.circuit_breaker")}</TableHead>
              <TableHead>{t("labels.status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((policy: BackendLbPolicyRow, idx: number) => (
              <TableRow key={idx}>
                <TableCell className="font-medium">
                  <LocalizedLink
                    href={`/backend-lb-policy/${policy.namespace}/${policy.name}`}
                    className="hover:underline text-primary"
                  >
                    {policy.name}
                  </LocalizedLink>
                </TableCell>
                <TableCell>{policy.namespace}</TableCell>
                <TableCell className="text-sm">
                  {policy.targetRefs && policy.targetRefs.length > 0
                    ? policy.targetRefs
                        .map((ref: any) => `${ref.kind}/${ref.name}`)
                        .join(", ")
                    : "—"}
                </TableCell>
                <TableCell className="text-sm">
                  {policy.sessionPersistence || "—"}
                </TableCell>
                <TableCell className="text-sm">
                  {policy.loadBalancing || "—"}
                </TableCell>
                <TableCell className="text-sm">
                  {policy.circuitBreaker || "—"}
                </TableCell>
                <TableCell>
                  <StatusBadge status={policy.status || "Unknown"} />
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-8 text-muted-foreground"
                >
                  No backend LB policies found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
