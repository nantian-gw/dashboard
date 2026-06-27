"use client";

import { useTranslations } from "next-intl";
import { useCircuitBreakerBackends } from "@/hooks/use-api";
import type { CircuitBreakerRow } from "@/hooks/use-api";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function CircuitBreakerStatusBadge({ status }: { status: CircuitBreakerRow["status"] }) {
  const variants: Record<
    CircuitBreakerRow["status"],
    { label: string; className: string }
  > = {
    ok: {
      label: "OK",
      className: "bg-green-100 text-green-800",
    },
    warning: {
      label: "Near Limit",
      className: "bg-amber-100 text-amber-800",
    },
    critical: {
      label: "At Limit",
      className: "bg-red-100 text-red-800",
    },
  };

  const v = variants[status];
  return <Badge variant="outline" className={v.className}>{v.label}</Badge>;
}

function CircuitBreakerTable({ rows }: { rows: CircuitBreakerRow[] }) {
  const t = useTranslations();

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {t("pages.circuitBreaker.empty")}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("labels.name")}</TableHead>
              <TableHead>{t("labels.namespace")}</TableHead>
              <TableHead>{t("pages.circuitBreaker.maxInflight")}</TableHead>
              <TableHead>{t("pages.circuitBreaker.currentInflight")}</TableHead>
              <TableHead>{t("pages.circuitBreaker.rejected")}</TableHead>
              <TableHead>{t("labels.status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const usagePct =
                row.maxInflight > 0
                  ? Math.round((row.currentInflight / row.maxInflight) * 100)
                  : 0;

              return (
                <TableRow key={`${row.namespace}/${row.name}`}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.namespace}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {row.maxInflight}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    <span
                      className={cn(
                        usagePct >= 90 && "text-red-600 font-semibold",
                        usagePct >= 70 &&
                          usagePct < 90 &&
                          "text-amber-600 font-semibold",
                      )}
                    >
                      {row.currentInflight}
                    </span>
                    {row.maxInflight > 0 && (
                      <span className="text-muted-foreground ml-1">
                        ({usagePct}%)
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {row.rejectedTotal.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <CircuitBreakerStatusBadge status={row.status} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function SummaryCards({ rows }: { rows: CircuitBreakerRow[] }) {
  const t = useTranslations();
  const total = rows.length;
  const okCount = rows.filter((r) => r.status === "ok").length;
  const warningCount = rows.filter((r) => r.status === "warning").length;
  const criticalCount = rows.filter((r) => r.status === "critical").length;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold tabular-nums">{total}</div>
          <p className="text-sm text-muted-foreground">
            {t("pages.circuitBreaker.totalBackends")}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold tabular-nums text-green-600">
            {okCount}
          </div>
          <p className="text-sm text-muted-foreground">
            {t("pages.circuitBreaker.underLimit")}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold tabular-nums text-amber-600">
            {warningCount}
          </div>
          <p className="text-sm text-muted-foreground">
            {t("pages.circuitBreaker.nearLimit")}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold tabular-nums text-red-600">
            {criticalCount}
          </div>
          <p className="text-sm text-muted-foreground">
            {t("pages.circuitBreaker.atLimit")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CircuitBreakerPage() {
  const t = useTranslations();
  const { data, isLoading, error } = useCircuitBreakerBackends();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          {t("pages.circuitBreaker.title")}
        </h1>
        <p className="text-muted-foreground">
          {t("pages.circuitBreaker.subtitle")}
        </p>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-8 w-12" />
                  <Skeleton className="mt-2 h-4 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t("pages.circuitBreaker.loadError", {
              message: (error as Error).message,
            })}
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          <SummaryCards rows={data} />
          <CircuitBreakerTable rows={data} />
        </>
      )}
    </div>
  );
}
