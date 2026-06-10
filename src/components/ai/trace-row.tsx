"use client";

import { memo } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { AITraceSummary } from "@/hooks/use-api";

interface TraceRowProps {
  trace: AITraceSummary;
}

export const TraceRow = memo(function TraceRow({ trace }: TraceRowProps) {
  const truncatedId =
    trace.id.length > 12 ? trace.id.slice(0, 8) + "..." + trace.id.slice(-4) : trace.id;

  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{truncatedId}</TableCell>
      <TableCell className="font-mono text-xs">{trace.model}</TableCell>
      <TableCell className="tabular-nums">{trace.duration.toFixed(1)} ms</TableCell>
      <TableCell className="tabular-nums">{trace.tokens.toLocaleString()}</TableCell>
      <TableCell>
        <Badge
          variant={trace.status === "success" ? "default" : "destructive"}
          className={
            trace.status === "success"
              ? "bg-emerald-100 text-emerald-800"
              : "bg-red-100 text-red-800"
          }
        >
          {trace.status}
        </Badge>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {new Date(trace.timestamp).toLocaleString()}
      </TableCell>
    </TableRow>
  );
});