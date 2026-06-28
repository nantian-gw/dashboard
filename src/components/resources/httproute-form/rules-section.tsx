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
                <div className="space-y-2">
                  <Label className="text-xs">{t("create.route.header_matches")}</Label>
                  {rule.headerMatches.map((headerMatch, headerIndex) => (
                    <div key={headerIndex} className="flex items-center gap-1">
                      <Select
                        value={headerMatch.type}
                        onValueChange={(type) =>
                          onUpdateRule(ruleIndex, {
                            headerMatches: rule.headerMatches.map((entry, entryIndex) =>
                              entryIndex === headerIndex
                                ? { ...entry, type: type as "Exact" | "RegularExpression" }
                                : entry
                            ),
                          })
                        }
                      >
                        <SelectTrigger className="h-8 w-24 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Exact">Exact</SelectItem>
                          <SelectItem value="RegularExpression">Regex</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        className="h-8 w-24 text-xs"
                        placeholder="name"
                        value={headerMatch.name}
                        onChange={(event) =>
                          onUpdateRule(ruleIndex, {
                            headerMatches: rule.headerMatches.map((entry, entryIndex) =>
                              entryIndex === headerIndex ? { ...entry, name: event.target.value } : entry
                            ),
                          })
                        }
                      />
                      <Input
                        className="h-8 w-24 text-xs"
                        placeholder="value"
                        value={headerMatch.value}
                        onChange={(event) =>
                          onUpdateRule(ruleIndex, {
                            headerMatches: rule.headerMatches.map((entry, entryIndex) =>
                              entryIndex === headerIndex ? { ...entry, value: event.target.value } : entry
                            ),
                          })
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          onUpdateRule(ruleIndex, {
                            headerMatches: rule.headerMatches.filter(
                              (_, entryIndex) => entryIndex !== headerIndex
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
                      onUpdateRule(ruleIndex, {
                        headerMatches: [
                          ...rule.headerMatches,
                          { type: "Exact", name: "", value: "" },
                        ],
                      })
                    }
                  >
                    <Plus className="mr-1 h-3 w-3" /> Add Header Match
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">{t("create.route.query_param_matches")}</Label>
                  {rule.queryParamMatches.map((queryParamMatch, queryParamIndex) => (
                    <div key={queryParamIndex} className="flex items-center gap-1">
                      <Select
                        value={queryParamMatch.type}
                        onValueChange={(type) =>
                          onUpdateRule(ruleIndex, {
                            queryParamMatches: rule.queryParamMatches.map((entry, entryIndex) =>
                              entryIndex === queryParamIndex
                                ? { ...entry, type: type as "Exact" | "RegularExpression" }
                                : entry
                            ),
                          })
                        }
                      >
                        <SelectTrigger className="h-8 w-24 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Exact">Exact</SelectItem>
                          <SelectItem value="RegularExpression">Regex</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        className="h-8 w-20 text-xs"
                        placeholder="name"
                        value={queryParamMatch.name}
                        onChange={(event) =>
                          onUpdateRule(ruleIndex, {
                            queryParamMatches: rule.queryParamMatches.map((entry, entryIndex) =>
                              entryIndex === queryParamIndex ? { ...entry, name: event.target.value } : entry
                            ),
                          })
                        }
                      />
                      <Input
                        className="h-8 w-20 text-xs"
                        placeholder="value"
                        value={queryParamMatch.value}
                        onChange={(event) =>
                          onUpdateRule(ruleIndex, {
                            queryParamMatches: rule.queryParamMatches.map((entry, entryIndex) =>
                              entryIndex === queryParamIndex ? { ...entry, value: event.target.value } : entry
                            ),
                          })
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          onUpdateRule(ruleIndex, {
                            queryParamMatches: rule.queryParamMatches.filter(
                              (_, entryIndex) => entryIndex !== queryParamIndex
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
                      onUpdateRule(ruleIndex, {
                        queryParamMatches: [
                          ...rule.queryParamMatches,
                          { type: "Exact", name: "", value: "" },
                        ],
                      })
                    }
                  >
                    <Plus className="mr-1 h-3 w-3" /> Add Query Param
                  </Button>
                </div>
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

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">{t("create.route.backend_refs")}</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => addBackendToRule(ruleIndex)}
                  >
                    <Plus className="mr-1 h-3 w-3" /> {t("create.route.add_backend")}
                  </Button>
                </div>
                {rule.backends.map((backend, backendIndex) => (
                  <div key={backendIndex} className="flex items-center gap-2">
                    <Input
                      className="h-8 w-36 text-xs"
                      placeholder="Service name"
                      value={backend.name}
                      onChange={(event) =>
                        updateBackend(ruleIndex, backendIndex, "name", event.target.value)
                      }
                    />
                    <Select
                      value={backend.namespace}
                      onValueChange={(namespace) =>
                        updateBackend(ruleIndex, backendIndex, "namespace", namespace)
                      }
                    >
                      <SelectTrigger className="h-8 w-28 text-xs">
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
                    <Input
                      className="h-8 w-20 text-xs"
                      type="number"
                      placeholder="Port"
                      value={backend.port}
                      onChange={(event) =>
                        updateBackend(
                          ruleIndex,
                          backendIndex,
                          "port",
                          parseInt(event.target.value, 10) || 0
                        )
                      }
                    />
                    <Input
                      className="h-8 w-20 text-xs"
                      type="number"
                      placeholder="Weight"
                      value={backend.weight}
                      onChange={(event) =>
                        updateBackend(
                          ruleIndex,
                          backendIndex,
                          "weight",
                          parseInt(event.target.value, 10) || 0
                        )
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => removeBackendFromRule(ruleIndex, backendIndex)}
                    >
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}
