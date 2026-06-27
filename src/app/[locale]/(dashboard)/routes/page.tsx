"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRoutes } from "@/hooks/use-api";
import { type RouteRow } from "@/lib/admin-models";
import { useAtomValue } from "jotai";
import { LocalizedLink } from "@/components/dashboard/localized-link";
import { searchAtom } from "@/lib/store";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ClampText } from "@/components/dashboard/clamp-text";
import { SelectRouteTypeDialog } from "@/components/dashboard/select-route-type-dialog";
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Filter, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

function FilterDropdown({
  label,
  values,
  selected,
  onToggle,
  onClear,
}: {
  label: string;
  values: string[];
  selected: Set<string>;
  onToggle: (v: string) => void;
  onClear: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div
          className={cn(
            "flex items-center gap-1 cursor-pointer select-none group",
            selected.size > 0 && "text-primary font-semibold"
          )}
        >
          {label}
          {selected.size > 0 ? (
            <Filter className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
          )}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
        {values.map((v) => (
          <DropdownMenuCheckboxItem
            key={v}
            checked={selected.has(v)}
            onSelect={(e) => {
              e.preventDefault();
              onToggle(v);
            }}
          >
            {v}
          </DropdownMenuCheckboxItem>
        ))}
        {selected.size > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={false}
              onSelect={(e) => {
                e.preventDefault();
                onClear();
              }}
            >
              <span className="text-muted-foreground">Clear</span>
            </DropdownMenuCheckboxItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function RoutesPage() {
  const t = useTranslations();
  const search = useAtomValue(searchAtom);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("pages.routes.title")}</h1>
        <p className="text-muted-foreground">{t("pages.routes.subtitle")}</p>
      </div>
      <RoutesContent search={search} />
    </div>
  );
}

function RoutesContent({ search }: { search: string }) {
  const t = useTranslations();
  const { data, isLoading, error } = useRoutes();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [kindFilter, setKindFilter] = useState<Set<string>>(new Set());
  const [namespaceFilter, setNamespaceFilter] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());

  const rows = Array.isArray(data) ? data : data?.routes || [];

  const allKinds = [...new Set(rows.map((r: RouteRow) => r.kind))].sort();
  const allNamespaces = [...new Set(rows.map((r: RouteRow) => r.namespace))].sort();
  const allStatuses = [
    ...new Set(rows.map((r: RouteRow) => r.status || "Unknown")),
  ].sort();

  const toggleSet = useCallback(
    (
      setter: React.Dispatch<React.SetStateAction<Set<string>>>,
      value: string
    ) => {
      setter((prev) => {
        const next = new Set(prev);
        if (next.has(value)) next.delete(value);
        else next.add(value);
        return next;
      });
    },
    []
  );

  const filtered = rows.filter((r) => {
    if (kindFilter.size > 0 && !kindFilter.has(r.kind)) return false;
    if (namespaceFilter.size > 0 && !namespaceFilter.has(r.namespace))
      return false;
    if (
      statusFilter.size > 0 &&
      !statusFilter.has(r.status || "Unknown")
    )
      return false;
    if (search) {
      const s = `${r.name} ${r.namespace} ${r.kind} ${r.parent || ""} ${r.backend || ""}`
        .toLowerCase();
      if (!s.includes(search.toLowerCase())) return false;
    }
    return true;
  });

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
          Failed to load routes: {(error as Error).message}
        </CardContent>
      </Card>
    );
  }

  const acceptedCount = rows.filter((r) => r.status === "Accepted").length;
  const hostnameCount = rows.reduce(
    (sum: number, r: RouteRow) => sum + (r.hostnames?.length || 0),
    0
  );
  const backendCount = rows.reduce(
    (sum: number, r: RouteRow) => sum + (r.backendCount || 0),
    0
  );

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Routes" value={rows.length} />
        <KpiCard label="Accepted" value={acceptedCount} />
        <KpiCard label="Hostnames" value={hostnameCount} />
        <KpiCard label="Backends" value={backendCount} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{t("pages.routes.title")}</CardTitle>
          <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            {t("actions.create_route")}
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("labels.name")}</TableHead>
                <TableHead>
                  <FilterDropdown
                    label={t("labels.kind")}
                    values={allKinds}
                    selected={kindFilter}
                    onToggle={(v) => toggleSet(setKindFilter, v)}
                    onClear={() => setKindFilter(new Set())}
                  />
                </TableHead>
                <TableHead>
                  <FilterDropdown
                    label={t("labels.namespace")}
                    values={allNamespaces}
                    selected={namespaceFilter}
                    onToggle={(v) => toggleSet(setNamespaceFilter, v)}
                    onClear={() => setNamespaceFilter(new Set())}
                  />
                </TableHead>
                <TableHead>{t("labels.parent")}</TableHead>
                <TableHead>{t("labels.hostnames")}</TableHead>
                <TableHead>
                  <FilterDropdown
                    label={t("labels.status")}
                    values={allStatuses}
                    selected={statusFilter}
                    onToggle={(v) => toggleSet(setStatusFilter, v)}
                    onClear={() => setStatusFilter(new Set())}
                  />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((route: RouteRow, idx: number) => {
                const detailHref = `/routes/${route.kind}/${route.namespace}/${route.name}`;

                return (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">
                      <LocalizedLink href={detailHref} className="hover:underline">
                        <ClampText value={route.name || "—"} head={18} tail={8} />
                      </LocalizedLink>
                    </TableCell>
                    <TableCell>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                        {route.kind}
                      </span>
                    </TableCell>
                    <TableCell>{route.namespace}</TableCell>
                    <TableCell>{route.parent || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {route.hostnames?.join(", ") || "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={route.status || "Unknown"} />
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No routes found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <SelectRouteTypeDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </>
  );
}
