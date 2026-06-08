"use client";

import { useTranslations } from "next-intl";
import { useBackendTls } from "@/hooks/use-api";
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
import Link from "next/link";

export default function BackendTlsPage() {
  const t = useTranslations();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("pages.backendtls.title")}</h1>
        <p className="text-muted-foreground">{t("pages.backendtls.subtitle")}</p>
      </div>
      <BackendTlsContent />
    </div>
  );
}

function BackendTlsContent() {
  const t = useTranslations();
  const { data, isLoading, error } = useBackendTls();

  const rows = Array.isArray(data) ? data : data?.policies || [];

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Failed to load backend TLS policies: {(error as Error).message}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">
          BackendTLSPolicy ({rows.length})
        </CardTitle>
        <Link href="/backend-tls/create">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            {t("actions.create_backend_tls")}
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("labels.name")}</TableHead>
              <TableHead>{t("labels.namespace")}</TableHead>
              <TableHead>{t("labels.target_ref")}</TableHead>
              <TableHead>{t("labels.ca_certificate")}</TableHead>
              <TableHead>{t("labels.status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((policy: any, idx: number) => (
              <TableRow key={idx}>
                <TableCell className="font-medium">
                  <Link href={`/backend-tls/${policy.namespace}/${policy.name}`} className="hover:underline text-primary">
                    {policy.name}
                  </Link>
                </TableCell>
                <TableCell>{policy.namespace}</TableCell>
                <TableCell className="text-sm">
                  {policy.targetRef
                    ? `${policy.targetRef.kind}/${policy.targetRef.name}`
                    : "—"}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {policy.caCertificate || "—"}
                </TableCell>
                <TableCell>
                  <StatusBadge status={policy.status || "Unknown"} />
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No backend TLS policies found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}