import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
  Ready: { label: "Ready", variant: "default", className: "bg-green-100 text-green-800" },
  Accepted: { label: "Accepted", variant: "default", className: "bg-green-100 text-green-800" },
  Warning: { label: "Warning", variant: "secondary", className: "bg-amber-100 text-amber-800" },
  Recovering: { label: "Recovering", variant: "secondary", className: "bg-amber-100 text-amber-800" },
  Failed: { label: "Failed", variant: "destructive", className: "bg-red-100 text-red-800" },
  Disconnected: { label: "Disconnected", variant: "destructive", className: "bg-red-100 text-red-800" },
  Unknown: { label: "Unknown", variant: "outline", className: "" },
  Pending: { label: "Pending", variant: "outline", className: "" },
  Drifted: { label: "Drifted", variant: "destructive", className: "bg-red-100 text-red-800" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const mapped = STATUS_MAP[status] || STATUS_MAP.Unknown;
  return (
    <Badge
      variant={mapped.variant}
      className={cn(mapped.className, className)}
    >
      {mapped.label}
    </Badge>
  );
}
