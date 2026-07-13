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
import type { RouteRule } from "../httproute-form";
import { HeaderModifierSection, emptyFilter } from "./filters-section";
import { HeaderMatchEditor } from "./rules-section/header-match-editor";
import { QueryParamEditor } from "./rules-section/query-param-editor";
import { BackendRefsEditor } from "./rules-section/backend-refs-editor";

const HTTP_METHODS = ["__any__", "GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];
const FILTER_TYPES = ["RequestHeaderModifier", "ResponseHeaderModifier"];

interface RulesSectionProps {
  rules: RouteRule[];
  namespaces: string[];
  t: ReturnType<typeof useTranslations>;
  onUpdateRule: (index: number, patch: Partial<RouteRule>) => void;
  onAddRule: () => void;
  onRemoveRule: (index: number) => void;
}

export function RulesSection({
  rules,
  namespaces,
  t,
  onUpdateRule,
  onAddRule,
  onRemoveRule,
}: RulesSectionProps) {
  const addBackendToRule = (ruleIndex: number) => {
    onUpdateRule(ruleIndex, {
      backends: [
        ...rules[ruleIndex].backends,
        { name: "", namespace: "default", port: 80, weight: 100 },
      ],
    });
  };

  const removeBackendFromRule = (ruleIndex: number, backendIndex: number) => {
    onUpdateRule(ruleIndex, {
      backends: rules[ruleIndex].backends.filter((_, index) => index !== backendIndex),
    });
  };

  const updateBackend = (
    ruleIndex: number,
    backendIndex: number,
    field: "name" | "namespace" | "port" | "weight",
    fieldValue: string | number
  ) => {
    onUpdateRule(ruleIndex, {
      backends: rules[ruleIndex].backends.map((backend, index) =>
        index === backendIndex ? { ...backend, [field]: fieldValue } : backend
      ),
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base">{t("create.route.routing_rules_title")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("create.route.routing_rules_desc")}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onAddRule}>
          <Plus className="mr-1 h-4 w-4" /> {t("create.route.add_rule")}
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4">
        {rules.map((rule, ruleIndex) => (
          <Card key={ruleIndex}>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">{t("create.route.rule_n", { n: ruleIndex + 1 })}</CardTitle>
              {rules.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveRule(ruleIndex)}
                  className="text-red-500 hover:text-red-600"
                >
                  <Trash2 className="mr-1 h-4 w-4" /> {t("create.route.remove")}
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-xs">{t("create.route.path_match")}</Label>
                  <Input
                    className="h-8 text-xs"
                    value={rule.pathMatch}
                    onChange={(event) =>
                      onUpdateRule(ruleIndex, { pathMatch: event.target.value })
                    }
                    placeholder={t("create.route.path_match_placeholder")}
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs">{t("create.route.method")}</Label>
                  <Select
                    value={rule.method}
                    onValueChange={(method) => onUpdateRule(ruleIndex, { method })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HTTP_METHODS.map((method) => (
                        <SelectItem key={method} value={method}>
                          {method === "__any__" ? "Any" : method}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <HeaderMatchEditor
                  matches={rule.headerMatches}
                  ruleIndex={ruleIndex}
                  t={t}
                  onUpdate={onUpdateRule}
                />
                <QueryParamEditor
                  matches={rule.queryParamMatches}
                  ruleIndex={ruleIndex}
                  t={t}
                  onUpdate={onUpdateRule}
                />
              </div>

              <div className="grid gap-2">
                <Label className="text-xs">{t("create.route.request_timeout")}</Label>
                <Input
                  className="h-8 w-48 text-xs"
                  value={rule.requestTimeout}
                  onChange={(event) =>
                    onUpdateRule(ruleIndex, { requestTimeout: event.target.value })
                  }
                  placeholder="e.g. 5s, 30s"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">{t("create.route.filters")}</Label>
                {rule.filters.map((filter, filterIndex) => (
                  <div key={filterIndex} className="flex items-start gap-2">
                    <Select
                      value={filter.type}
                      onValueChange={(type) =>
                        onUpdateRule(ruleIndex, {
                          filters: rule.filters.map((entry, entryIndex) =>
                            entryIndex === filterIndex
                              ? { ...entry, type: type as "RequestHeaderModifier" | "ResponseHeaderModifier" }
                              : entry
                          ),
                        })
                      }
                    >
                      <SelectTrigger className="h-8 w-56 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FILTER_TYPES.map((filterType) => (
                          <SelectItem key={filterType} value={filterType}>
                            {filterType}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <HeaderModifierSection
                      label="Headers"
                      config={filter.config}
                      t={t}
                      onChange={(config) =>
                        onUpdateRule(ruleIndex, {
                          filters: rule.filters.map((entry, entryIndex) =>
                            entryIndex === filterIndex ? { ...entry, config } : entry
                          ),
                        })
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() =>
                        onUpdateRule(ruleIndex, {
                          filters: rule.filters.filter(
                            (_, entryIndex) => entryIndex !== filterIndex
                          ),
                        })
                      }
                    >
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() =>
                    onUpdateRule(ruleIndex, { filters: [...rule.filters, emptyFilter()] })
                  }
                >
                  <Plus className="mr-1 h-3 w-3" /> {t("create.route.add_filter")}
                </Button>
              </div>

              <BackendRefsEditor
                backends={rule.backends}
                namespaces={namespaces}
                ruleIndex={ruleIndex}
                t={t}
                onUpdateBackend={updateBackend}
                onAddBackend={addBackendToRule}
                onRemoveBackend={removeBackendFromRule}
              />
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}
