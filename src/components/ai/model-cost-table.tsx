"use client";

import { memo, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AICostByModel } from "@/hooks/use-api";

interface ModelCostTableProps {
  data: AICostByModel[];
}

export const ModelCostTable = memo(function ModelCostTable({ data }: ModelCostTableProps) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => b.cost - a.cost);
  }, [data]);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("ai.model")}</TableHead>
          <TableHead className="text-right">{t("ai.cost.requests")}</TableHead>
          <TableHead className="text-right">{t("ai.cost.input_tokens")}</TableHead>
          <TableHead className="text-right">{t("ai.cost.output_tokens")}</TableHead>
          <TableHead className="text-right">{t("ai.cost.cost")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((item) => (
          <TableRow
            key={item.model}
            className="cursor-pointer"
            onClick={() => router.push(`/${locale}/ai/cost/${encodeURIComponent(item.model)}`)}
          >
            <TableCell className="font-mono text-sm font-medium">{item.model}</TableCell>
            <TableCell className="text-right tabular-nums">{item.requests.toLocaleString()}</TableCell>
            <TableCell className="text-right tabular-nums">{item.inputTokens.toLocaleString()}</TableCell>
            <TableCell className="text-right tabular-nums">{item.outputTokens.toLocaleString()}</TableCell>
            <TableCell className="text-right tabular-nums font-medium">
              ${item.cost.toFixed(4)}
            </TableCell>
          </TableRow>
        ))}
        {sorted.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
              {t("ai.cost.no_data")}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
});
