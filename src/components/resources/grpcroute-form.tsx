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
import { Plus, Trash2 } from "lucide-react";
import {
  createEmptyGRPCRouteFormData,
  grpcRouteEditorCodec,
  grpcRouteManifestToFormData,
} from "./grpcroute-form-codec";
import { ResourceEditorShell } from "./resource-editor-shell";

export interface BackendRef {
  name: string;
  namespace: string;
  port: number;
  weight: number;
}

export interface MethodMatch {
  service: string;
  method: string;
}

export interface GRPCRule {
  matches: MethodMatch[];
  backends: BackendRef[];
}

export interface GRPCRouteFormData {
  name: string;
  namespace: string;
  gatewayName: string;
  gatewayNamespace: string;
  hostnames: string;
  rules: GRPCRule[];
}

interface GRPCRouteFormProps {
  initialData?: GRPCRouteFormData;
  mode: "create" | "edit";
  onSuccess?: () => void;
}

interface GRPCRouteFormFieldsProps {
  value: GRPCRouteFormData;
  onChange: (next: GRPCRouteFormData) => void;
  disableIdentityFields: boolean;
}

function GRPCRouteFormFields({
  value,
  onChange,
  disableIdentityFields,
}: GRPCRouteFormFieldsProps) {
  const t = useTranslations();
  const { data: namespacesData } = useNamespaces();
  const namespaces =
    (namespacesData as string[]) || ["default", "kube-system", "kube-public", "ingress"];
  const { data: gatewaysData } = useGateways();
  const gateways =
    (gatewaysData?.gateways as Array<{ name: string; namespace: string }> | undefined) || [];

  const addRule = () => {
    onChange({
      ...value,
      rules: [
        ...value.rules,
        {
          matches: [{ service: "", method: "" }],
          backends: [{ name: "", namespace: "default", port: 50051, weight: 100 }],
        },
      ],
    });
  };

  const removeRule = (index: number) => {
    onChange({
      ...value,
      rules: value.rules.filter((_, ruleIndex) => ruleIndex !== index),
    });
  };

  const updateRuleMatch = (
    ruleIndex: number,
    field: keyof MethodMatch,
    fieldValue: string
  ) => {
    onChange({
      ...value,
      rules: value.rules.map((rule, index) =>
        index === ruleIndex
          ? {
              ...rule,
              matches: [{ ...rule.matches[0], [field]: fieldValue }],
            }
          : rule
      ),
    });
  };

  const addBackendToRule = (ruleIndex: number) => {
    onChange({
      ...value,
      rules: value.rules.map((rule, index) =>
        index === ruleIndex
          ? {
              ...rule,
              backends: [
                ...rule.backends,
                { name: "", namespace: "default", port: 50051, weight: 100 },
              ],
            }
          : rule
      ),
    });
  };

  const removeBackendFromRule = (ruleIndex: number, backendIndex: number) => {
    onChange({
      ...value,
      rules: value.rules.map((rule, index) =>
        index === ruleIndex
          ? {
              ...rule,
              backends: rule.backends.filter((_, index) => index !== backendIndex),
            }
          : rule
      ),
    });
  };

  const updateBackend = (
    ruleIndex: number,
    backendIndex: number,
    field: keyof BackendRef,
    fieldValue: string | number
  ) => {
    onChange({
      ...value,
      rules: value.rules.map((rule, index) =>
        index === ruleIndex
          ? {
              ...rule,
              backends: rule.backends.map((backend, index) =>
                index === backendIndex ? { ...backend, [field]: fieldValue } : backend
              ),
            }
          : rule
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
              <Label htmlFor="route-name">{t("create.route.route_name")} *</Label>
              <Input
                id="route-name"
                value={value.name}
                onChange={(event) => onChange({ ...value, name: event.target.value })}
                placeholder={t("create.route.route_name_placeholder")}
                required
                disabled={disableIdentityFields}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="route-namespace">{t("create.route.select_namespace")} *</Label>
              <Select
                value={value.namespace}
                onValueChange={(namespace) => onChange({ ...value, namespace })}
                disabled={disableIdentityFields}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("create.route.select_namespace")} />
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("create.route.gateway_attachment_title")}</CardTitle>
          <CardDescription>{t("create.route.gateway_attachment_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="gw-name">{t("create.route.gateway_name")} *</Label>
              <Select
                value={value.gatewayName}
                onValueChange={(gatewayName) => onChange({ ...value, gatewayName })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("create.route.select_gateway")} />
                </SelectTrigger>
                <SelectContent>
                  {gateways
                    .filter((gateway) => gateway.namespace === value.gatewayNamespace)
                    .map((gateway) => (
                      <SelectItem
                        key={`${gateway.namespace}/${gateway.name}`}
                        value={gateway.name}
                      >
                        {gateway.name}
                      </SelectItem>
                    ))}
                  {gateways.filter((gateway) => gateway.namespace === value.gatewayNamespace)
                    .length === 0 ? (
                    <SelectItem value="__none__" disabled>
                      {t("create.route.no_gateways_in", { ns: value.gatewayNamespace })}
                    </SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="gw-namespace">{t("create.route.gateway_namespace")} *</Label>
              <Select
                value={value.gatewayNamespace}
                onValueChange={(gatewayNamespace) =>
                  onChange({ ...value, gatewayNamespace, gatewayName: "" })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("create.route.select_namespace")} />
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
              placeholder={t("create.route.hostnames_placeholder")}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t("create.route.routing_rules_title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("create.route.routing_rules_desc")}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addRule}>
          <Plus className="mr-1 h-4 w-4" />
          {t("create.route.add_rule")}
        </Button>
      </div>

      {value.rules.map((rule, ruleIndex) => (
        <Card key={ruleIndex}>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">
              {t("create.route.rule_n", { n: ruleIndex + 1 })}
            </CardTitle>
            {value.rules.length > 1 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeRule(ruleIndex)}
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
                    updateRuleMatch(ruleIndex, "service", event.target.value)
                  }
                  placeholder={t("create.route.service_match_placeholder")}
                />
              </div>
              <div className="grid gap-2">
                <Label>{t("create.route.method_match")}</Label>
                <Input
                  value={rule.matches[0].method}
                  onChange={(event) =>
                    updateRuleMatch(ruleIndex, "method", event.target.value)
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
                onClick={() => addBackendToRule(ruleIndex)}
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
                      updateBackend(ruleIndex, backendIndex, "name", event.target.value)
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
                      updateBackend(ruleIndex, backendIndex, "namespace", namespace)
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
                      updateBackend(
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
                      updateBackend(
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
                    onClick={() => removeBackendFromRule(ruleIndex, backendIndex)}
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

export function GRPCRouteForm({ initialData, mode, onSuccess }: GRPCRouteFormProps) {
  const t = useTranslations();
  const [formData, setFormData] = useState(initialData ?? createEmptyGRPCRouteFormData());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const isEdit = mode === "edit";

  return (
    <ResourceEditorShell
      title={
        isEdit
          ? t("create.route.edit_title", { kind: "GRPCRoute" })
          : t("create.route.title", { kind: "GRPCRoute" })
      }
      description={
        isEdit
          ? t("create.route.edit_description", { kind: "GRPCRoute" })
          : t("create.route.description", { kind: "GRPCRoute" })
      }
      backHref="/routes"
      submitLabel={
        isEdit
          ? t("create.route.save", { kind: "GRPCRoute" })
          : t("create.route.submit", { kind: "GRPCRoute" })
      }
      submittingLabel={isEdit ? t("create.route.saving") : t("create.route.creating")}
      formData={formData}
      onFormDataChange={setFormData}
      codec={grpcRouteEditorCodec}
      expectedEditIdentity={isEdit ? grpcRouteEditorCodec.getIdentity(formData) : null}
      isSubmitting={isLoading}
      submitError={error}
      onSubmitManifest={async (yamlText) => {
        setIsLoading(true);
        setError("");

        try {
          const nextFormData = grpcRouteManifestToFormData(yamlText);
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

          const path = isEdit
            ? `/v1/resources/grpcroute/${formData.namespace}/${formData.name}`
            : "/v1/resources";
          const response = await applyResource(yamlText, path);
          if (!response.ok) {
            throw new Error((await response.text()) || `Failed to ${mode}: ${response.status}`);
          }

          setFormData(nextFormData);
          onSuccess?.();
        } catch (submitError) {
          setError((submitError as Error).message || t("create.route.error_failed_create"));
          setIsLoading(false);
          return;
        }

        setIsLoading(false);
      }}
      renderForm={({ value, onChange }) => (
        <GRPCRouteFormFields
          value={value}
          onChange={onChange}
          disableIdentityFields={isEdit}
        />
      )}
    />
  );
}
