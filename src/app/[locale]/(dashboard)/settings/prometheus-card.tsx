"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { controlplane } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Save, Wifi, CheckCircle, XCircle, Loader2 } from "lucide-react";

// ─── Utilities ───────────────────────────────────────────────────────────────

function isValidURL(value: string): boolean {
  return /^https?:\/\/.+/.test(value);
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface PrometheusConfig {
  prometheusUrl?: string;
}

// ─── Prometheus Config Card ──────────────────────────────────────────────────

export function PrometheusCard() {
  const t = useTranslations();

  const [url, setUrl] = useState("");
  const [loadedUrl, setLoadedUrl] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [prometheusLoaded, setPrometheusLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "fail" | null>(null);

  // Load current config on mount
  useEffect(() => {
    if (loaded) return;
    let cancelled = false;
    controlplane
      .get<PrometheusConfig>("/v1/metrics/config")
      .then((cfg) => {
        if (cancelled) return;
        const configuredUrl = cfg.prometheusUrl || "";
        setLoadedUrl(configuredUrl);
        setPrometheusLoaded(true);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) {
          setPrometheusLoaded(true);
          setLoaded(true);
          toast.error(t("settings.prometheus.loadError"));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [loaded, t]);

  // Save handler
  const handleSave = useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      toast.error(t("settings.prometheus.urlRequired"));
      return;
    }
    if (!isValidURL(trimmed)) {
      toast.error(t("settings.prometheus.urlInvalid"));
      return;
    }
    setSaving(true);
    try {
      await controlplane.put("/v1/metrics/config", {
        prometheusUrl: trimmed,
      } as PrometheusConfig);
      setLoadedUrl(trimmed);
      setUrl("");
      toast.success(t("settings.prometheus.saved"));
    } catch {
      toast.error(t("settings.prometheus.saveFailed"));
    } finally {
      setSaving(false);
    }
  }, [url, t]);

  // Test connection handler
  const handleTest = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    try {
      await controlplane.post("/v1/metrics/query", { query: "up" });
      setTestResult("ok");
      toast.success(t("settings.prometheus.connectionOk"));
    } catch {
      setTestResult("fail");
      toast.error(t("settings.prometheus.connectionFailed"));
    } finally {
      setTesting(false);
    }
  }, [t]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Wifi className="h-5 w-5" />
          {t("settings.prometheus.title")}
        </CardTitle>
        <CardDescription>
          {t("settings.prometheus.description")}
        </CardDescription>
      </CardHeader>
      <Separator />
      <CardContent className="space-y-4 pt-4">
        {/* URL Field */}
        <div className="space-y-2">
          <Label htmlFor="prometheus-url" className="text-xs font-medium">
            {t("settings.prometheus.url")}
          </Label>
          <div className="relative">
            <Input
              id="prometheus-url"
              placeholder={
                loadedUrl
                  ? loadedUrl
                  : t("settings.prometheus.urlPlaceholder")
              }
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="h-9 pr-8 text-sm"
            />
            {!prometheusLoaded ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : !loadedUrl ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <XCircle className="h-4 w-4" />
                {t("settings.prometheus.notConfigured")}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-emerald-600">
                <CheckCircle className="h-4 w-4" />
                {t("settings.prometheus.configured")}
              </div>
            )}
          </div>
        </div>

        {/* Test Connection Result */}
        {testResult && (
          <div
            className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
              testResult === "ok"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
            }`}
          >
            {testResult === "ok" ? (
              <CheckCircle className="h-4 w-4 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0" />
            )}
            <span>
              {testResult === "ok"
                ? t("settings.prometheus.connectionOk")
                : t("settings.prometheus.connectionFailed")}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-1">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1"
          >
            {saving ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-4 w-4" />
            )}
            {t("settings.prometheus.save")}
          </Button>
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={testing}
            className="flex-1"
          >
            {testing ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Wifi className="mr-1.5 h-4 w-4" />
            )}
            {testing
              ? t("settings.prometheus.testingConnection")
              : t("settings.prometheus.testConnection")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
