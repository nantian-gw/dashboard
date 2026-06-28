"use client";

import { useTranslations } from "next-intl";
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
import { useGateways, useNamespaces } from "@/hooks/use-api";
import {
  createEmptyGRPCRouteFormData,
  grpcRouteEditorCodec,
  grpcRouteManifestToFormData,
} from "./grpcroute-form-codec";
import { RouteFormShell } from "./route-form-skeleton";
import { RulesSection } from "./grpcroute-form/rules-section";

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
          ? { ...rule, matches: [{ ...rule.matches[0], [field]: fieldValue }] }
          : rule
      ),
    });
  };

  const addBackendToRule = (ruleIndex: number) => {
    onChange({
      ...value,
      rules: value.rules.map((rule, index) =>
        index === ruleIndex
          ? { ...rule, backends: [...rule.backends, { name: "", namespace: "default", port: 50051, weight: 100 }] }
          : rule
      ),
    });
  };

  const removeBackendFromRule = (ruleIndex: number, backendIndex: number) => {
    onChange({
      ...value,
      rules: value.rules.map((rule, index) =>
        index === ruleIndex
          ? { ...rule, backends: rule.backends.filter((_, idx) => idx !== backendIndex) }
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
      rules: value.rules.map((rule, idx) =>
        idx === ruleIndex
          ? {
              ...rule,
              backends: rule.backends.map((backend, bidx) =>
                bidx === backendIndex ? { ...backend, [field]: fieldValue } : backend
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
                  {gateways.filter((g) => g.namespace === value.gatewayNamespace).length === 0 ? (
                    <SelectItem value="__none__" disabled>
                      {t("create.route.no_gateways_in", { ns: value.gatewayNamespace })}
                    </SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="gw-namespace">{t("create.route.gateway_namespace")}</Label>
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

      <RulesSection
        rules={value.rules}
        namespaces={namespaces}
        t={t}
        onUpdateRuleMatch={updateRuleMatch}
        onAddBackendToRule={addBackendToRule}
        onRemoveBackendFromRule={removeBackendFromRule}
        onUpdateBackend={updateBackend}
        onAddRule={addRule}
        onRemoveRule={removeRule}
      />
    </>
  );
}

export function GRPCRouteForm({ initialData, mode, onSuccess }: GRPCRouteFormProps) {
  return (
    <RouteFormShell
      kind="GRPCRoute"
      mode={mode}
      initialData={initialData}
      onSuccess={onSuccess}
      createEmpty={createEmptyGRPCRouteFormData}
      codec={grpcRouteEditorCodec}
      manifestToFormData={grpcRouteManifestToFormData}
      resourcePath="grpcroute"
      validateRules={(nextFormData, t) => {
        const validRules = nextFormData.rules.filter((rule) =>
          rule.backends.some((backend) => backend.name.trim())
        );
        if (validRules.length === 0) return t("create.route.error_need_backend");
        return null;
      }}
      renderForm={({ value, onChange }) => (
        <GRPCRouteFormFields
          value={value}
          onChange={onChange}
          disableIdentityFields={mode === "edit"}
        />
      )}
    />
  );
}
