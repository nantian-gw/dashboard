"use client";

import { useTranslations } from "next-intl";
import { useTokenPolicies } from "@/hooks/use-api";
import type { TokenPolicyRow } from "@/lib/admin-models";
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

export default function TokenPoliciesPage() {
  const t = useTranslations();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("pages.ai.tokenPolicies.title")}</h1>
        <p className="text-muted-foreground">{t("pages.ai.tokenPolicies.subtitle")}</p>
      </div>
      <TokenPoliciesContent />
    </div>
  );
}

function TokenPoliciesContent() {
  const t = useTranslations();
  const { data, isLoading, error } = useTokenPolicies();

  const rows = Array.isArray(data) ? data : data?.policies || [];

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {t("pages.ai.tokenPolicies.load_error")}: {(error as Error).message}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">
          TokenPolicy ({rows.length})
        </CardTitle>
        <LocalizedLink href="/ai/token-policies/create">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            {t("pages.ai.tokenPolicies.create_action")}
          </Button>
        </LocalizedLink>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("labels.name")}</TableHead>
              <TableHead>{t("labels.namespace")}</TableHead>
              <TableHead>{t("pages.ai.tokenPolicies.table.target")}</TableHead>
              <TableHead>{t("pages.ai.tokenPolicies.table.limits")}</TableHead>
              <TableHead>{t("labels.status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((policy: TokenPolicyRow, idx: number) => (
              <TableRow key={idx}>
                <TableCell className="font-medium">
                  <LocalizedLink
                    href={`/ai/token-policies/${policy.name}`}
                    className="hover:underline text-primary"
                  >
                    {policy.name}
                  </LocalizedLink>
                </TableCell>
                <TableCell>{policy.namespace}</TableCell>
                <TableCell className="text-sm">
                  {policy.targetRefs && policy.targetRefs.length > 0
                    ? policy.targetRefs.map((ref) => `${String(ref.kind)}/${String(ref.name)}`).join(", ")
                    : "—"}
                </TableCell>
                <TableCell className="text-sm">
                  {[
                    policy.tokensPerMinute && `TPM: ${policy.tokensPerMinute}`,
                    policy.requestsPerMinute && `RPM: ${policy.requestsPerMinute}`,
                    policy.scope && `scope: ${policy.scope}`,
                  ]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </TableCell>
                <TableCell>
                  <StatusBadge status={policy.status || "Unknown"} />
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {t("pages.ai.tokenPolicies.empty")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
