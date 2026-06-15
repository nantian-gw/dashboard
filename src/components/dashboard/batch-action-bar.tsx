"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface BatchActionBarProps {
  selectedCount: number;
  onDelete: () => void;
  onClear: () => void;
  className?: string;
}

export function BatchActionBar({ selectedCount, onDelete, onClear, className }: BatchActionBarProps) {
  const t = useTranslations();

  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-accent/50 px-4 py-2 text-sm",
        className
      )}
    >
      <span className="font-medium">
        {t("batch.selected_count", { count: selectedCount })}
      </span>
      <Button variant="destructive" size="sm" onClick={onDelete}>
        <Trash2 className="mr-1 h-3.5 w-3.5" />
        {t("batch.delete")}
      </Button>
      <Button variant="ghost" size="sm" onClick={onClear}>
        <X className="mr-1 h-3.5 w-3.5" />
        {t("batch.clear")}
      </Button>
    </div>
  );
}