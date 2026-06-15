"use client";

import { useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { applyResource } from "@/lib/api";
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
import { Textarea } from "@/components/ui/textarea";
import { Upload, Loader2, FileUp, AlertCircle, CheckCircle } from "lucide-react";
import jsyaml from "js-yaml";

interface ImportResult {
  created: number;
  failed: number;
  errors: string[];
}

export function ImportDialog() {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"file" | "paste">("file");
  const [content, setContent] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setContent("");
    setResult(null);
  }, []);

  const parseDocuments = useCallback((text: string): unknown[] => {
    try {
      const trimmed = text.trim();
      if (trimmed.startsWith("{")) {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : [parsed];
      }
      const docs = jsyaml.loadAll(trimmed);
      return docs.filter((d) => d !== null && d !== undefined);
    } catch {
      return [];
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!content.trim()) {
      toast.error(t("import.empty_content"));
      return;
    }

    const docs = parseDocuments(content);
    if (docs.length === 0) {
      toast.error(t("import.parse_error"));
      return;
    }

    setImporting(true);
    setResult(null);

    const errors: string[] = [];
    let created = 0;
    let failed = 0;

    for (let i = 0; i < docs.length; i++) {
      try {
        const doc = docs[i];
        const yaml = typeof doc === "string" ? doc : jsyaml.dump(doc);
        const res = await applyResource(yaml);
        if (res.ok) {
          created++;
        } else {
          failed++;
          errors.push(`Document ${i + 1}: HTTP ${res.status}`);
        }
      } catch (e) {
        failed++;
        errors.push(`Document ${i + 1}: ${(e as Error).message}`);
      }
    }

    setResult({ created, failed, errors });
    if (failed === 0) {
      toast.success(t("import.import_success", { count: created }));
      setOpen(false);
      resetState();
    } else {
      toast.warning(t("import.import_partial", { created, failed }));
    }
    setImporting(false);
  }, [content, parseDocuments, t, resetState]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setContent((ev.target?.result as string) || "");
    };
    reader.readAsText(file);
  }, []);

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetState(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="mr-1.5 h-4 w-4" />
          {t("import.title")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("import.title")}</DialogTitle>
          <DialogDescription>{t("import.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex gap-2">
            <Button
              variant={mode === "file" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("file")}
            >
              <FileUp className="mr-1 h-3.5 w-3.5" />
              {t("import.file")}
            </Button>
            <Button
              variant={mode === "paste" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("paste")}
            >
              {t("import.paste")}
            </Button>
          </div>

          {mode === "file" ? (
            <div className="space-y-2">
              <Label>{t("import.select_file")}</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".yaml,.yml,.json"
                onChange={handleFileChange}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
              {content && (
                <p className="text-xs text-muted-foreground">
                  {t("import.file_loaded")}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label>{t("import.paste_content")}</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t("import.paste_placeholder")}
                className="min-h-[200px] font-mono text-sm"
              />
            </div>
          )}

          {result && (
            <div className={`rounded-md border px-3 py-2 text-sm ${
              result.failed === 0
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                : "border-amber-500/30 bg-amber-500/10 text-amber-600"
            }`}>
              <div className="flex items-center gap-2 font-medium">
                {result.failed === 0 ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                {t("import.result", { created: result.created, failed: result.failed })}
              </div>
              {result.errors.length > 0 && (
                <ul className="mt-1 list-inside list-disc text-xs">
                  {result.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { setOpen(false); resetState(); }}>
            {t("actions.cancel")}
          </Button>
          <Button onClick={handleImport} disabled={importing || !content.trim()}>
            {importing ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-1.5 h-4 w-4" />
            )}
            {t("import.import")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}