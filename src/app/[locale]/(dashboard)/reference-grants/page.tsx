"use client";

import { useTranslations } from "next-intl";
import { useReferenceGrants } from "@/hooks/use-api";
import { type ManagedResource } from "@/lib/admin-models";
import { LocalizedLink } from "@/components/dashboard/localized-link";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

function formatFrom(spec: Record<string, unknown> | undefined): string {
  const froms = (spec?.from as Record<string, unknown>[]) || [];
  return froms
    .map((f: Record<string, unknown>) => `${f.kind}(${f.namespace})`)
    .join(", ");
}

function formatTo(spec: Record<string, unknown> | undefined): string {
  const tos = (spec?.to as Record<string, unknown>[]) || [];
  return tos
    .map((t: Record<string, unknown>) => `${t.kind}${t.name ? `/${t.name}` : ""}`)
    .join(", ");
}

export default function ReferenceGrantsPage() {
  const t = useTranslations();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("pages.referencegrants.title")}</h1>
        <p className="text-muted-foreground">{t("pages.referencegrants.subtitle")}</p>
      </div>
      <ReferenceGrantsContent />
    </div>
  );
}

function ReferenceGrantsContent() {
  const t = useTranslations();
  const { data, isLoading, error } = useReferenceGrants();

  const rows = data?.grants || [];

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Failed to load ReferenceGrants: {(error as Error).message}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">
          Reference Grants ({rows.length})
        </CardTitle>
        <LocalizedLink href="/reference-grants/create">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            {t("actions.create_reference_grant")}
          </Button>
        </LocalizedLink>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("labels.name")}</TableHead>
              <TableHead>{t("labels.namespace")}</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((grant: ManagedResource, idx: number) => {
              const spec = grant.resource?.spec || {};
              return (
                <TableRow key={idx}>
                  <TableCell className="font-medium">
                    <LocalizedLink
                      href={`/reference-grants/${grant.namespace}/${grant.name}`}
                      className="hover:underline"
                    >
                      {grant.name}
                    </LocalizedLink>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{grant.namespace}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatFrom(spec)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatTo(spec)}
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No ReferenceGrants found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
