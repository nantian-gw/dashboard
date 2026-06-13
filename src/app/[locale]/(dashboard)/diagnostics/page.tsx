"use client";

import { useTranslations } from "next-intl";
import { useDiagnostics } from "@/hooks/use-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";

export default function DiagnosticsPage() {
  const t = useTranslations();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("pages.diagnostics.title")}</h1>
        <p className="text-muted-foreground">{t("pages.diagnostics.subtitle")}</p>
      </div>
      <DiagnosticsContent />
    </div>
  );
}

function DiagnosticsContent() {
  const { data, isLoading, error } = useDiagnostics();

  const issues = Array.isArray(data)
    ? data
    : data?.issues || [];

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Failed to load diagnostics: {(error as Error).message}
        </CardContent>
      </Card>
    );
  }

  if (issues.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No issues detected</p>
        </CardContent>
      </Card>
    );
  }

  const critical = issues.filter((i) => i.severity === "critical" || i.severity === "error");
  const warning = issues.filter((i) => i.severity === "warning");
  const info = issues.filter((i) => i.severity === "info");

  function IssueIcon({ severity }: { severity: string }) {
    if (severity === "critical" || severity === "error")
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    if (severity === "warning") return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    return <Info className="h-4 w-4 text-blue-500" />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <span className="text-2xl font-bold">{critical.length}</span>
            </div>
            <p className="text-sm text-muted-foreground">Critical</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <span className="text-2xl font-bold">{warning.length}</span>
            </div>
            <p className="text-sm text-muted-foreground">Warning</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{info.length}</span>
            </div>
            <p className="text-sm text-muted-foreground">Info</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Issues ({issues.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {issues.map((issue: any, idx: number) => (
            <div
              key={idx}
              className="flex items-start gap-3 rounded-md border p-3"
            >
              <IssueIcon severity={issue.severity} />
              <div className="flex-1">
                <p className="font-medium">{issue.title || issue.message}</p>
                {issue.description && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {issue.description}
                  </p>
                )}
                <div className="mt-2 flex gap-2">
                  {issue.source && (
                    <Badge variant="outline">{issue.source}</Badge>
                  )}
                  {issue.resource && (
                    <Badge variant="outline">{issue.resource}</Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
