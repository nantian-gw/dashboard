"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { applyResource } from "@/lib/api";
import { useGateways, useNamespaces } from "@/hooks/use-api";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import {
  createEmptyHTTPRouteFormData,
  httpRouteEditorCodec,
  httpRouteManifestToFormData,
} from "./httproute-form-codec";
import { ResourceEditorShell } from "./resource-editor-shell";

export { httpRouteResourceToFormData } from "./httproute-form-codec";

export interface BackendRef {
  name: string;
  namespace: string;
  port: number;
  weight: number;
}

export interface HeaderMatch {
  type: "Exact" | "RegularExpression";
  name: string;
  value: string;
}

export interface QueryParamMatch {
  type: "Exact" | "RegularExpression";
  name: string;
  value: string;
}

export interface HeaderModifier {
  set: { name: string; value: string }[];
  add: { name: string; value: string }[];
  remove: string[];
}

export interface RuleFilter {
  type: "RequestHeaderModifier" | "ResponseHeaderModifier";
  config: HeaderModifier;
}

export interface RouteRule {
  pathMatch: string;
  method: string;
  headerMatches: HeaderMatch[];
  queryParamMatches: QueryParamMatch[];
  filters: RuleFilter[];
  requestTimeout: string;
  backends: BackendRef[];
}

export interface HTTPRouteFormData {
  name: string;
  namespace: string;
  gatewayName: string;
  gatewayNamespace: string;
  hostnames: string;
  rules: RouteRule[];
}

const HTTP_METHODS = ["__any__", "GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];
const FILTER_TYPES = ["RequestHeaderModifier", "ResponseHeaderModifier"];

function emptyHeaderModifier(): HeaderModifier {
  return { set: [], add: [], remove: [] };
}

function emptyFilter(): RuleFilter {
  return { type: "RequestHeaderModifier", config: emptyHeaderModifier() };
}

function emptyRule(): RouteRule {
  return createEmptyHTTPRouteFormData().rules[0];
}

function HeaderModifierSection({
  label,
  config,
  onChange,
  t,
}: {
  label: string;
  config: HeaderModifier;
  onChange: (next: HeaderModifier) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3 rounded-md border p-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-sm font-medium"
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {label}
      </button>
      {open ? (
        <div className="space-y-3 pl-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">{t("create.route.filter_set_headers")}</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  onChange({ ...config, set: [...config.set, { name: "", value: "" }] })
                }
              >
                <Plus className="mr-1 h-3 w-3" /> {t("create.route.add")}
              </Button>
            </div>
            {config.set.map((header, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  placeholder={t("create.route.header_name_placeholder")}
                  className="h-8 text-xs"
                  value={header.name}
                  onChange={(event) => {
                    const next = [...config.set];
                    next[index] = { ...next[index], name: event.target.value };
                    onChange({ ...config, set: next });
                  }}
                />
                <Input
                  placeholder={t("create.route.header_value_placeholder")}
                  className="h-8 text-xs"
                  value={header.value}
                  onChange={(event) => {
                    const next = [...config.set];
                    next[index] = { ...next[index], value: event.target.value };
                    onChange({ ...config, set: next });
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() =>
                    onChange({ ...config, set: config.set.filter((_, entryIndex) => entryIndex !== index) })
                  }
                >
                  <Trash2 className="h-3 w-3 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">{t("create.route.filter_add_headers")}</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  onChange({ ...config, add: [...config.add, { name: "", value: "" }] })
                }
              >
                <Plus className="mr-1 h-3 w-3" /> {t("create.route.add")}
              </Button>
            </div>
            {config.add.map((header, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  placeholder={t("create.route.header_name_placeholder")}
                  className="h-8 text-xs"
                  value={header.name}
                  onChange={(event) => {
                    const next = [...config.add];
                    next[index] = { ...next[index], name: event.target.value };
                    onChange({ ...config, add: next });
                  }}
                />
                <Input
                  placeholder={t("create.route.header_value_placeholder")}
                  className="h-8 text-xs"
                  value={header.value}
                  onChange={(event) => {
                    const next = [...config.add];
                    next[index] = { ...next[index], value: event.target.value };
                    onChange({ ...config, add: next });
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() =>
                    onChange({ ...config, add: config.add.filter((_, entryIndex) => entryIndex !== index) })
                  }
                >
                  <Trash2 className="h-3 w-3 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">{t("create.route.filter_remove_headers")}</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange({ ...config, remove: [...config.remove, ""] })}
              >
                <Plus className="mr-1 h-3 w-3" /> {t("create.route.add")}
              </Button>
            </div>
            {config.remove.map((header, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  placeholder={t("create.route.header_name_placeholder")}
                  className="h-8 flex-1 text-xs"
                  value={header}
                  onChange={(event) => {
                    const next = [...config.remove];
                    next[index] = event.target.value;
                    onChange({ ...config, remove: next });
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() =>
                    onChange({
                      ...config,
                      remove: config.remove.filter((_, entryIndex) => entryIndex !== index),
                    })
                  }
                >
                  <Trash2 className="h-3 w-3 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

interface HTTPRouteFormFieldsProps {
  value: HTTPRouteFormData;
  onChange: (next: HTTPRouteFormData) => void;
  disableIdentityFields: boolean;
}

function HTTPRouteFormFields({
  value,
  onChange,
  disableIdentityFields,
}: HTTPRouteFormFieldsProps) {
  const t = useTranslations();
  const { data: namespacesData } = useNamespaces();
  const namespaces =
    (namespacesData as string[]) || ["default", "kube-system", "kube-public", "ingress"];
  const { data: gatewaysData } = useGateways();
  const gateways =
    (gatewaysData?.gateways as Array<{ name: string; namespace: string }> | undefined) || [];

  const updateRule = (index: number, patch: Partial<RouteRule>) => {
    onChange({
      ...value,
      rules: value.rules.map((rule, ruleIndex) =>
        ruleIndex === index ? { ...rule, ...patch } : rule
      ),
    });
  };

  const addRule = () => {
    onChange({
      ...value,
      rules: [...value.rules, emptyRule()],
    });
  };

  const removeRule = (index: number) => {
    onChange({
      ...value,
      rules: value.rules.filter((_, ruleIndex) => ruleIndex !== index),
    });
  };

  const addBackendToRule = (ruleIndex: number) => {
    updateRule(ruleIndex, {
      backends: [
        ...value.rules[ruleIndex].backends,
        { name: "", namespace: "default", port: 80, weight: 100 },
      ],
    });
  };

  const removeBackendFromRule = (ruleIndex: number, backendIndex: number) => {
    updateRule(ruleIndex, {
      backends: value.rules[ruleIndex].backends.filter(
        (_, index) => index !== backendIndex
      ),
    });
  };

  const updateBackend = (
    ruleIndex: number,
    backendIndex: number,
    field: keyof BackendRef,
    fieldValue: string | number
  ) => {
    updateRule(ruleIndex, {
      backends: value.rules[ruleIndex].backends.map((backend, index) =>
        index === backendIndex ? { ...backend, [field]: fieldValue } : backend
      ),
    });
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("create.route.basic_info_title")}</CardTitle>
          <CardDescription>{t("create.route.basic_info_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">{t("create.route.route_name")}</Label>
              <Input
                id="name"
                value={value.name}
                onChange={(event) => onChange({ ...value, name: event.target.value })}
                placeholder={t("create.route.route_name_placeholder")}
                required
                disabled={disableIdentityFields}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="namespace">{t("create.route.namespace")}</Label>
              <Select
                value={value.namespace}
                onValueChange={(namespace) => onChange({ ...value, namespace })}
                disabled={disableIdentityFields}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select namespace" />
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
          </div>
          <div className="grid gap-2">
            <Label htmlFor="hostnames">{t("create.route.hostnames")}</Label>
            <Input
              id="hostnames"
              value={value.hostnames}
              onChange={(event) => onChange({ ...value, hostnames: event.target.value })}
              placeholder="example.com, api.example.com"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("create.route.gateway_ref_title")}</CardTitle>
          <CardDescription>{t("create.route.gateway_ref_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="gw-name">{t("create.route.parent_gateway")}</Label>
            <Select
              value={
                value.gatewayName
                  ? `${value.gatewayNamespace}/${value.gatewayName}`
                  : ""
              }
              onValueChange={(selection) => {
                // selection is "<namespace>/<name>"; keep both fields in sync
                // so the parentRef always points at the chosen gateway.
                const [namespace, ...nameParts] = selection.split("/");
                const name = nameParts.join("/");
                onChange({
                  ...value,
                  gatewayName: name,
                  gatewayNamespace: namespace || value.gatewayNamespace,
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("create.route.select_gateway")} />
              </SelectTrigger>
              <SelectContent>
                {gateways.map((gateway) => (
                  <SelectItem
                    key={`${gateway.namespace}/${gateway.name}`}
                    value={`${gateway.namespace}/${gateway.name}`}
                  >
                    {gateway.name} ({gateway.namespace})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="gw-ns">{t("create.route.gateway_namespace")}</Label>
            <Select
              value={value.gatewayNamespace}
              onValueChange={(gatewayNamespace) => onChange({ ...value, gatewayNamespace })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select namespace" />
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">{t("create.route.rules_title")}</CardTitle>
            <CardDescription>{t("create.route.rules_desc")}</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addRule}>
            <Plus className="mr-1 h-4 w-4" /> {t("create.route.add_rule")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {value.rules.map((rule, ruleIndex) => (
            <Card key={ruleIndex}>
              <CardContent className="space-y-4 pt-6">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    {t("create.route.rule_n", { n: ruleIndex + 1 })}
                  </Label>
                  {value.rules.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRule(ruleIndex)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>{t("create.route.path_match")}</Label>
                    <Input
                      value={rule.pathMatch}
                      onChange={(event) =>
                        updateRule(ruleIndex, { pathMatch: event.target.value })
                      }
                      placeholder="/api/*"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t("create.route.method")}</Label>
                    <Select
                      value={rule.method}
                      onValueChange={(method) => updateRule(ruleIndex, { method })}
                    >
                      <SelectTrigger>
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
                            updateRule(ruleIndex, {
                              headerMatches: rule.headerMatches.map((entry, entryIndex) =>
                                entryIndex === headerIndex
                                  ? {
                                      ...entry,
                                      type: type as "Exact" | "RegularExpression",
                                    }
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
                            updateRule(ruleIndex, {
                              headerMatches: rule.headerMatches.map((entry, entryIndex) =>
                                entryIndex === headerIndex
                                  ? { ...entry, name: event.target.value }
                                  : entry
                              ),
                            })
                          }
                        />
                        <Input
                          className="h-8 w-24 text-xs"
                          placeholder="value"
                          value={headerMatch.value}
                          onChange={(event) =>
                            updateRule(ruleIndex, {
                              headerMatches: rule.headerMatches.map((entry, entryIndex) =>
                                entryIndex === headerIndex
                                  ? { ...entry, value: event.target.value }
                                  : entry
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
                            updateRule(ruleIndex, {
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
                        updateRule(ruleIndex, {
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
                            updateRule(ruleIndex, {
                              queryParamMatches: rule.queryParamMatches.map((entry, entryIndex) =>
                                entryIndex === queryParamIndex
                                  ? {
                                      ...entry,
                                      type: type as "Exact" | "RegularExpression",
                                    }
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
                            updateRule(ruleIndex, {
                              queryParamMatches: rule.queryParamMatches.map(
                                (entry, entryIndex) =>
                                  entryIndex === queryParamIndex
                                    ? { ...entry, name: event.target.value }
                                    : entry
                              ),
                            })
                          }
                        />
                        <Input
                          className="h-8 w-20 text-xs"
                          placeholder="value"
                          value={queryParamMatch.value}
                          onChange={(event) =>
                            updateRule(ruleIndex, {
                              queryParamMatches: rule.queryParamMatches.map(
                                (entry, entryIndex) =>
                                  entryIndex === queryParamIndex
                                    ? { ...entry, value: event.target.value }
                                    : entry
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
                            updateRule(ruleIndex, {
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
                        updateRule(ruleIndex, {
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
                      updateRule(ruleIndex, { requestTimeout: event.target.value })
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
                          updateRule(ruleIndex, {
                            filters: rule.filters.map((entry, entryIndex) =>
                              entryIndex === filterIndex
                                ? {
                                    ...entry,
                                    type: type as
                                      | "RequestHeaderModifier"
                                      | "ResponseHeaderModifier",
                                  }
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
                          updateRule(ruleIndex, {
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
                          updateRule(ruleIndex, {
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
                      updateRule(ruleIndex, { filters: [...rule.filters, emptyFilter()] })
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
    </>
  );
}

interface HTTPRouteFormProps {
  initialData?: HTTPRouteFormData;
  mode: "create" | "edit";
  onSuccess?: () => void;
}

export function HTTPRouteForm({ initialData, mode, onSuccess }: HTTPRouteFormProps) {
  const t = useTranslations();
  const [formData, setFormData] = useState(initialData ?? createEmptyHTTPRouteFormData());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const isEdit = mode === "edit";

  return (
    <ResourceEditorShell
      title={
        isEdit
          ? t("create.route.edit_title", { kind: "HTTPRoute" })
          : t("create.route.title", { kind: "HTTPRoute" })
      }
      description={
        isEdit
          ? t("create.route.edit_description", { kind: "HTTPRoute" })
          : t("create.route.description", { kind: "HTTPRoute" })
      }
      backHref="/routes"
      submitLabel={
        isEdit
          ? t("create.route.save", { kind: "HTTPRoute" })
          : t("create.route.submit", { kind: "HTTPRoute" })
      }
      submittingLabel={isEdit ? t("create.route.saving") : t("create.route.creating")}
      formData={formData}
      onFormDataChange={setFormData}
      codec={httpRouteEditorCodec}
      expectedEditIdentity={isEdit ? httpRouteEditorCodec.getIdentity(formData) : null}
      isSubmitting={isLoading}
      submitError={error}
      onSubmitManifest={async (yamlText) => {
        setIsLoading(true);
        setError("");

        try {
          const nextFormData = httpRouteManifestToFormData(yamlText);
          const validRules = nextFormData.rules.filter((rule) =>
            rule.backends.some((backend) => backend.name.trim())
          );

          if (validRules.length === 0) {
            setError(t("create.route.error_need_backend"));
            setIsLoading(false);
            return;
          }

          if (!nextFormData.gatewayName.trim()) {
            setError(t("create.route.error_need_gateway"));
            setIsLoading(false);
            return;
          }

          if (!nextFormData.name.trim()) {
            setError(t("create.route.error_need_name"));
            setIsLoading(false);
            return;
          }

          const path = isEdit
            ? `/v1/resources/httproute/${formData.namespace}/${formData.name}`
            : "/v1/resources";
          const response = await applyResource(yamlText, path);
          if (!response.ok) {
            throw new Error((await response.text()) || `Failed to ${mode}: ${response.status}`);
          }

          setFormData(nextFormData);
          onSuccess?.();
        } catch (submitError) {
          setError((submitError as Error).message || `Failed to ${mode} route`);
          setIsLoading(false);
          return;
        }

        setIsLoading(false);
      }}
      renderForm={({ value, onChange }) => (
        <HTTPRouteFormFields
          value={value}
          onChange={onChange}
          disableIdentityFields={isEdit}
        />
      )}
    />
  );
}
