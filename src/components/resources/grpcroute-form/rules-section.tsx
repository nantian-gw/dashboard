"use client";

import type { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import type { BackendRef, GRPCRule, MethodMatch } from "../grpcroute-form";

interface RulesSectionProps {
  rules: GRPCRule[];
  namespaces: string[];
  t: ReturnType<typeof useTranslations>;
  onUpdateRuleMatch: (ruleIndex: number, field: keyof MethodMatch, fieldValue: string) => void;
  onAddBackendToRule: (ruleIndex: number) => void;
  onRemoveBackendFromRule: (ruleIndex: number, backendIndex: number) => void;
  onUpdateBackend: (
    ruleIndex: number,
    backendIndex: number,
    field: keyof BackendRef,
    fieldValue: string | number
  ) => void;
  onAddRule: () => void;
  onRemoveRule: (index: number) => void;
}

export function RulesSection({
  rules,
  namespaces,
  t,
  onUpdateRuleMatch,
  onAddBackendToRule,
  onRemoveBackendFromRule,
  onUpdateBackend,
  onAddRule,
  onRemoveRule,
}: RulesSectionProps) {
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t("create.route.routing_rules_title")}</h2>
          <p className="text-sm text-muted-foreground">{t("create.route.routing_rules_desc")}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onAddRule}>
          <Plus className="mr-1 h-4 w-4" />
          {t("create.route.add_rule")}
        </Button>
      </div>

      {rules.map((rule, ruleIndex) => (
        <Card key={ruleIndex}>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">
              {t("create.route.rule_n", { n: ruleIndex + 1 })}
            </CardTitle>
            {rules.length > 1 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemoveRule(ruleIndex)}
                className="text-red-500 hover:text-red-600"
              >
                <Trash2 className="mr-1 h-4 w-4" />
                {t("create.route.remove")}
              </Button>
            ) : null}
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t("create.route.service_match")}</Label>
                <Input
                  value={rule.matches[0].service}
                  onChange={(event) =>
                    onUpdateRuleMatch(ruleIndex, "service", event.target.value)
                  }
                  placeholder={t("create.route.service_match_placeholder")}
                />
              </div>
              <div className="grid gap-2">
                <Label>{t("create.route.method_match")}</Label>
                <Input
                  value={rule.matches[0].method}
                  onChange={(event) =>
                    onUpdateRuleMatch(ruleIndex, "method", event.target.value)
                  }
                  placeholder={t("create.route.method_placeholder")}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>{t("create.route.backend_services")}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onAddBackendToRule(ruleIndex)}
              >
                <Plus className="mr-1 h-4 w-4" />
                {t("create.route.add_backend")}
              </Button>
            </div>

            {rule.backends.map((backend, backendIndex) => (
              <div
                key={backendIndex}
                className="flex items-end gap-2 rounded-md border bg-slate-50/50 p-3"
              >
                <div className="grid flex-1 gap-1">
                  <Label className="text-xs text-muted-foreground">
                    {t("create.route.service")}
                  </Label>
                  <Input
                    value={backend.name}
                    onChange={(event) =>
                      onUpdateBackend(ruleIndex, backendIndex, "name", event.target.value)
                    }
                    placeholder={t("create.route.service_placeholder")}
                  />
                </div>
                <div className="grid w-24 gap-1">
                  <Label className="text-xs text-muted-foreground">
                    {t("create.route.namespace")}
                  </Label>
                  <Select
                    value={backend.namespace}
                    onValueChange={(namespace) =>
                      onUpdateBackend(ruleIndex, backendIndex, "namespace", namespace)
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {namespaces.map((namespace) => (
                        <SelectItem key={namespace} value={namespace}>
                          {namespace}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid w-20 gap-1">
                  <Label className="text-xs text-muted-foreground">
                    {t("create.route.port")}
                  </Label>
                  <Input
                    type="number"
                    value={backend.port}
                    onChange={(event) =>
                      onUpdateBackend(
                        ruleIndex,
                        backendIndex,
                        "port",
                        parseInt(event.target.value, 10) || 50051
                      )
                    }
                  />
                </div>
                <div className="grid w-20 gap-1">
                  <Label className="text-xs text-muted-foreground">
                    {t("create.route.weight")}
                  </Label>
                  <Input
                    type="number"
                    value={backend.weight}
                    onChange={(event) =>
                      onUpdateBackend(
                        ruleIndex,
                        backendIndex,
                        "weight",
                        parseInt(event.target.value, 10) || 0
                      )
                    }
                  />
                </div>
                {rule.backends.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveBackendFromRule(ruleIndex, backendIndex)}
                    className="h-9 text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </>
  );
}
