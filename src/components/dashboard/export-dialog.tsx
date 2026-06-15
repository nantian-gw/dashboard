"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { controlplane } from "@/lib/api";
import { toYaml, type ManagedResource } from "@/lib/admin-models";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Loader2, FileDown } from "lucide-react";

const RESOURCE_KINDS = [
  { value: "all", labelKey: "export.all_resources" },
  { value: "Gateway", labelKey: "export.gateways" },
  { value: "HTTPRoute", labelKey: "export.http_routes" },
  { value: "BackendTLSPolicy", labelKey: "export.backend_tls" },
  { value: "ReferenceGrant", labelKey: "export.reference_grants" },
  { value: "TokenPolicy", labelKey: "export.token_policies" },
  { value: "WasmPlugin", labelKey: "export.wasm_plugins" },
];

export function ExportDialog() {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<"yaml" | "json">("yaml");
  const [kind, setKind] = useState("all");
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const params: Record<string, string> = {};
      if (kind !== "all") params.kind = kind;

      const resources = await controlplane.get<ManagedResource[]>("/v1/resources", params);

      let content: string;
      let mimeType: string;
      let ext: string;

      if (format === "json") {
        content = JSON.stringify(resources, null, 2);
        mimeType = "application/json";
        ext = "json";
      } else {
        content = resources.map((r) => toYaml(r)).join("---\n");
        mimeType = "text/yaml";
        ext = "yaml";
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nantian-export-${kind}-${Date.now()}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(t("export.export_success"));
      setOpen(false);
    } catch {
      toast.error(t("export.export_failed"));
    } finally {
      setExporting(false);
    }
  }, [format, kind, t]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileDown className="mr-1.5 h-4 w-4" />
          {t("export.title")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("export.title")}</DialogTitle>
          <DialogDescription>{t("export.description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{t("export.format")}</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as "yaml" | "json")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yaml">YAML</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("export.resource_type")}</Label>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESOURCE_KINDS.map((k) => (
                  <SelectItem key={k.value} value={k.value}>
                    {t(k.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("actions.cancel")}
          </Button>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-1.5 h-4 w-4" />
            )}
            {t("export.export")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}