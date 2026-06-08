"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FormatBadgeProps {
  format: string;
  className?: string;
}

const FORMAT_CONFIG: Record<string, { label: string; className: string }> = {
  openai: {
    label: "OpenAI",
    className: "border-transparent text-white",
  },
  anthropic: {
    label: "Anthropic",
    className: "border-transparent text-white",
  },
  ollama: {
    label: "Ollama",
    className: "border-transparent text-white",
  },
};

export function FormatBadge({ format, className }: FormatBadgeProps) {
  const config = FORMAT_CONFIG[format.toLowerCase()] ?? {
    label: format,
    className: "border-transparent bg-secondary text-secondary-foreground",
  };

  const style =
    format.toLowerCase() === "openai"
      ? { backgroundColor: "var(--ai-accent-openai)" }
      : format.toLowerCase() === "anthropic"
        ? { backgroundColor: "var(--ai-accent-anthropic)" }
        : format.toLowerCase() === "ollama"
          ? { backgroundColor: "var(--ai-accent-ollama)" }
          : {};

  return (
    <Badge
      variant="default"
      className={cn("border-transparent text-white", config.className, className)}
      style={style}
    >
      {config.label}
    </Badge>
  );
}