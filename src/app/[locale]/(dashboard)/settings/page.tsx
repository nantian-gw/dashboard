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
import {
  Save,
  Wifi,
  CheckCircle,
  XCircle,
  Loader2,
  Zap,
} from "lucide-react";
import { ExportDialog } from "@/components/dashboard/export-dialog";
import { ImportDialog } from "@/components/dashboard/import-dialog";

// ─── Utilities ───────────────────────────────────────────────────────────────

function isValidURL(value: string): boolean {
  return /^https?:\/\/.+/.test(value);
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface PrometheusConfig {
  prometheusUrl?: string;
}

interface LLMConfig {
  configured?: boolean;
  provider?: string;
  apiEndpoint?: string;
  apiKey?: string;
  model?: string;
  temperature?: number;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const t = useTranslations();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("settings.title")}</h1>
        <p className="text-muted-foreground">{t("settings.subtitle")}</p>
      </div>
      <div className="flex gap-2">
        <ExportDialog />
        <ImportDialog />
      </div>
      <PrometheusCard />
      <Separator className="my-2" />
      <LLMConfigCard />
    </div>
  );
}

// ─── Prometheus Config Card ──────────────────────────────────────────────────

function PrometheusCard() {
  const t = useTranslations();

  const [url, setUrl] = useState("");
  const [loadedUrl, setLoadedUrl] = useState("");
  const [loaded, setLoaded] = useState(false);
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
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) {
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
            {loadedUrl && !url && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
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

// ─── LLM Config Card ──────────────────────────────────────────────────────

function LLMConfigCard() {
  const t = useTranslations();

  const [endpoint, setEndpoint] = useState("");
  const [key, setKey] = useState("");
  const [model, setModel] = useState("");
  const [temp, setTemp] = useState("0.7");
  const [loaded, setLoaded] = useState(false);
  const [loadedEndpoint, setLoadedEndpoint] = useState("");
  const [loadedModel, setLoadedModel] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load current config on mount
  useEffect(() => {
    if (loaded) return;
    let cancelled = false;
    controlplane
      .get<LLMConfig>("/v1/chatbot/config")
      .then((cfg) => {
        if (cancelled) return;
        setLoadedEndpoint(cfg.apiEndpoint || "");
        setHasKey(!!cfg.apiKey);
        setLoadedModel(cfg.model || "");
        setTemp(
          cfg.temperature !== undefined ? String(cfg.temperature) : "0.7"
        );
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) {
          setLoaded(true);
          toast.error(t("settings.llm.loadError"));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [loaded, t]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await controlplane.put("/v1/chatbot/config", {
        provider: "openai",
        apiEndpoint: endpoint || loadedEndpoint,
        apiKey: key || undefined,
        model: model || loadedModel,
        temperature: temp ? parseFloat(temp) : 0.7,
      });
      if (endpoint) setLoadedEndpoint(endpoint);
      if (key) setHasKey(true);
      if (model) setLoadedModel(model);
      setEndpoint("");
      setKey("");
      setModel("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      toast.error(t("settings.llm.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Zap className="h-5 w-5" />
          {t("settings.llm.title")}
        </CardTitle>
        <CardDescription>
          {t("settings.llm.description")}
        </CardDescription>
      </CardHeader>
      <Separator />
      <CardContent className="space-y-4 pt-4">
        <div className="space-y-2">
          <Label htmlFor="llm-endpoint" className="text-xs font-medium">
            {t("settings.llm.endpoint")}
          </Label>
          <div className="relative">
            <Input
              id="llm-endpoint"
              placeholder={
                loadedEndpoint || t("settings.llm.endpointPlaceholder")
              }
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              className="h-9 pr-8 text-sm"
            />
            {loadedEndpoint && !endpoint && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="llm-key" className="text-xs font-medium">
            {t("settings.llm.key")}
          </Label>
          <div className="relative">
            <Input
              id="llm-key"
              type={key ? "text" : "password"}
              placeholder={hasKey ? "••••••••" : t("settings.llm.keyPlaceholder")}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="h-9 pr-8 text-sm"
            />
            {hasKey && !key && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="llm-model" className="text-xs font-medium">
            {t("settings.llm.model")}
          </Label>
          <Input
            id="llm-model"
            placeholder={loadedModel || t("settings.llm.modelPlaceholder")}
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="llm-temp" className="text-xs font-medium">
            {t("settings.llm.temperature")}
          </Label>
          <Input
            id="llm-temp"
            type="number"
            min="0"
            max="2"
            step="0.1"
            value={temp}
            onChange={(e) => setTemp(e.target.value)}
            className="h-9 text-sm"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1"
            size="sm"
          >
            {saving ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : saved ? (
              <CheckCircle className="mr-1.5 h-4 w-4" />
            ) : (
              <Save className="mr-1.5 h-4 w-4" />
            )}
            {saved ? t("settings.llm.saved") : t("settings.llm.save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}