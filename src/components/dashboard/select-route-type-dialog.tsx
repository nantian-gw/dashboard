"use client";

import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

const ROUTE_KINDS = ["HTTPRoute", "GRPCRoute", "TCPRoute", "UDPRoute", "TLSRoute"];

interface SelectRouteTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SelectRouteTypeDialog({ open, onOpenChange }: SelectRouteTypeDialogProps) {
  const t = useTranslations();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("select_route_type.title")}</DialogTitle>
          <DialogDescription>
            {t("select_route_type.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-4">
          {ROUTE_KINDS.map((kind) => (
            <Link
              key={kind}
              href={`/routes/create/${kind.toLowerCase()}`}
              className="block"
            >
              <Button
                variant="outline"
                className="w-full justify-between h-auto py-3 px-4"
              >
                <div className="text-left">
                  <div className="font-medium">{t(`route_types.${kind.toLowerCase()}.name`)}</div>
                  <div className="text-sm text-muted-foreground">{t(`route_types.${kind.toLowerCase()}.description`)}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Button>
            </Link>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}