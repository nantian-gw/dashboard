"use client";

import { useState, useEffect } from "react";
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
import { Save, Zap, CheckCircle, XCircle, Loader2 } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface LLMConfig {
  configured?: boolean;
  provider?: string;
  apiEndpoint?: string;
  apiKey?: string;
  model?: string;
  temperature?: number;
}

// ─── LLM Config Card ──────────────────────────────────────────────────────

export function LLMConfigCard() {
  const t = useTranslations();

  const [endpoint, setEndpoint] = useState("");
  const [key, setKey] = useState("");
  const [model, setModel] = useState("");
  const [temp, setTemp] = useState("0.7");
  const [loaded, setLoaded] = useState(false);
  const [llmLoaded, setLlmloaded] = useState(false);
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
        setLlmloaded(true);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) {
          setLlmloaded(true);
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
        {/* Loading / Not Configured Status */}
        {!llmLoaded ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : !loadedEndpoint && !hasKey ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <XCircle className="h-4 w-4" />
            {t("settings.llm.notConfigured")}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle className="h-4 w-4" />
            {t("settings.llm.configured")}
          </div>
        )}
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
