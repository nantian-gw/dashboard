"use client";

import { useTranslations } from "next-intl";
import { useAITraces } from "@/hooks/use-api";
import { TraceRow } from "@/components/ai/trace-row";
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

export default function AITracesPage() {
  const t = useTranslations();
  const { data, isLoading, error } = useAITraces();

  const traces = Array.isArray(data) ? data : [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t("pages.ai.traces.title")}</h1>
          <p className="text-muted-foreground">{t("pages.ai.traces.subtitle")}</p>
        </div>
        <Card>
          <CardContent className="py-4">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t("pages.ai.traces.title")}</h1>
          <p className="text-muted-foreground">{t("pages.ai.traces.subtitle")}</p>
        </div>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Failed to load AI traces: {(error as Error).message}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("pages.ai.traces.title")}</h1>
        <p className="text-muted-foreground">{t("pages.ai.traces.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("ai.traces")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("ai.id")}</TableHead>
                <TableHead>{t("ai.model")}</TableHead>
                <TableHead>{t("ai.duration")}</TableHead>
                <TableHead>{t("ai.tokens")}</TableHead>
                <TableHead>{t("ai.status")}</TableHead>
                <TableHead>{t("ai.timestamp")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {traces.map((trace) => (
                <TraceRow key={trace.id} trace={trace} />
              ))}
              {traces.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No traces found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}