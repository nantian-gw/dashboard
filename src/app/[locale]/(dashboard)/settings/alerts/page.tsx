"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Bell, BellOff } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: "gt" | "lt" | "eq";
  threshold: number;
  duration: string;
  severity: "critical" | "warning" | "info";
  enabled: boolean;
}

const METRICS = [
  { value: "error_rate", labelKey: "alerts.metrics.error_rate" },
  { value: "latency_p95", labelKey: "alerts.metrics.latency_p95" },
  { value: "latency_p99", labelKey: "alerts.metrics.latency_p99" },
  { value: "request_rate", labelKey: "alerts.metrics.request_rate" },
  { value: "success_rate", labelKey: "alerts.metrics.success_rate" },
  { value: "cpu_usage", labelKey: "alerts.metrics.cpu_usage" },
  { value: "memory_usage", labelKey: "alerts.metrics.memory_usage" },
];

const CONDITIONS = [
  { value: "gt", labelKey: "alerts.conditions.gt" },
  { value: "lt", labelKey: "alerts.conditions.lt" },
  { value: "eq", labelKey: "alerts.conditions.eq" },
];

const SEVERITIES = [
  { value: "critical", labelKey: "alerts.severity.critical", variant: "destructive" as const },
  { value: "warning", labelKey: "alerts.severity.warning", variant: "secondary" as const },
  { value: "info", labelKey: "alerts.severity.info", variant: "outline" as const },
];

const DURATIONS = [
  { value: "1m", labelKey: "alerts.durations.1m" },
  { value: "5m", labelKey: "alerts.durations.5m" },
  { value: "15m", labelKey: "alerts.durations.15m" },
  { value: "30m", labelKey: "alerts.durations.30m" },
  { value: "1h", labelKey: "alerts.durations.1h" },
];

// ─── Mock data (replace with real API when backend is ready) ──────────────────

const MOCK_RULES: AlertRule[] = [
  {
    id: "1",
    name: "High Error Rate",
    metric: "error_rate",
    condition: "gt",
    threshold: 5,
    duration: "5m",
    severity: "critical",
    enabled: true,
  },
  {
    id: "2",
    name: "High Latency P95",
    metric: "latency_p95",
    condition: "gt",
    threshold: 500,
    duration: "5m",
    severity: "warning",
    enabled: true,
  },
  {
    id: "3",
    name: "Low Success Rate",
    metric: "success_rate",
    condition: "lt",
    threshold: 95,
    duration: "15m",
    severity: "critical",
    enabled: false,
  },
];

// ─── Components ──────────────────────────────────────────────────────────────

function severityVariant(severity: string): "destructive" | "secondary" | "outline" {
  const found = SEVERITIES.find((s) => s.value === severity);
  return found?.variant ?? "outline";
}

export default function AlertsPage() {
  const t = useTranslations();
  const [rules, setRules] = useState<AlertRule[]>(MOCK_RULES);
  const [createOpen, setCreateOpen] = useState(false);

  const handleDelete = useCallback(
    (id: string) => {
      setRules((prev) => prev.filter((r) => r.id !== id));
      toast.success(t("alerts.deleted"));
    },
    [t]
  );

  const handleToggle = useCallback(
    (id: string) => {
      setRules((prev) =>
        prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
      );
    },
    []
  );

  const handleCreate = useCallback(
    (rule: Omit<AlertRule, "id" | "enabled">) => {
      const newRule: AlertRule = {
        ...rule,
        id: crypto.randomUUID(),
        enabled: true,
      };
      setRules((prev) => [...prev, newRule]);
      setCreateOpen(false);
      toast.success(t("alerts.created"));
    },
    [t]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("alerts.title")}</h1>
          <p className="text-muted-foreground">{t("alerts.subtitle")}</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" />
              {t("alerts.create")}
            </Button>
          </DialogTrigger>
          <AlertRuleForm
            onSubmit={handleCreate}
            onCancel={() => setCreateOpen(false)}
          />
        </Dialog>
      </div>

      <div className="grid gap-4">
        {rules.map((rule) => (
          <Card key={rule.id}>
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleToggle(rule.id)}
                  title={rule.enabled ? t("alerts.disable") : t("alerts.enable")}
                >
                  {rule.enabled ? (
                    <Bell className="h-4 w-4 text-primary" />
                  ) : (
                    <BellOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{rule.name}</span>
                    <Badge variant={severityVariant(rule.severity)}>
                      {t(`alerts.severity.${rule.severity}`)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t(`alerts.metrics.${rule.metric}`)}{" "}
                    {t(`alerts.conditions.${rule.condition}`)}{" "}
                    {rule.threshold}
                    {rule.metric === "latency_p95" || rule.metric === "latency_p99"
                      ? "ms"
                      : rule.metric === "error_rate" || rule.metric === "success_rate"
                        ? "%"
                        : ""}{" "}
                    · {t(`alerts.durations.${rule.duration}`)}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(rule.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
        {rules.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">{t("alerts.empty")}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="mr-1 h-4 w-4" />
                {t("alerts.create_first")}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── Alert Rule Form Dialog ──────────────────────────────────────────────────

interface AlertRuleFormProps {
  onSubmit: (rule: Omit<AlertRule, "id" | "enabled">) => void;
  onCancel: () => void;
  initial?: Partial<AlertRule>;
}

function AlertRuleForm({ onSubmit, onCancel, initial }: AlertRuleFormProps) {
  const t = useTranslations();
  const [name, setName] = useState(initial?.name ?? "");
  const [metric, setMetric] = useState(initial?.metric ?? "error_rate");
  const [condition, setCondition] = useState<"gt" | "lt" | "eq">(initial?.condition ?? "gt");
  const [threshold, setThreshold] = useState(String(initial?.threshold ?? 5));
  const [duration, setDuration] = useState(initial?.duration ?? "5m");
  const [severity, setSeverity] = useState<"critical" | "warning" | "info">(
    initial?.severity ?? "warning"
  );

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      metric,
      condition,
      threshold: Number(threshold) || 0,
      duration,
      severity,
    });
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{t("alerts.create_rule")}</DialogTitle>
        <DialogDescription>{t("alerts.create_rule_desc")}</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="rule-name">{t("alerts.rule_name")}</Label>
          <Input
            id="rule-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("alerts.rule_name_placeholder")}
          />
        </div>
        <div className="grid gap-2">
          <Label>{t("alerts.metric")}</Label>
          <Select value={metric} onValueChange={setMetric}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METRICS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {t(m.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>{t("alerts.condition")}</Label>
            <Select value={condition} onValueChange={(v) => setCondition(v as "gt" | "lt" | "eq")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONDITIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {t(c.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="rule-threshold">{t("alerts.threshold")}</Label>
            <Input
              id="rule-threshold"
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>{t("alerts.duration")}</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATIONS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {t(d.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>{t("alerts.severity_label")}</Label>
            <Select value={severity} onValueChange={(v) => setSeverity(v as "critical" | "warning" | "info")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEVERITIES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {t(s.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          {t("actions.cancel")}
        </Button>
        <Button onClick={handleSubmit} disabled={!name.trim()}>
          {t("alerts.create")}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
