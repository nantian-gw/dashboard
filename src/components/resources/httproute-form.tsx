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
  createEmptyHTTPRouteFormData,
  httpRouteEditorCodec,
  httpRouteManifestToFormData,
} from "./httproute-form-codec";
import { RouteFormShell } from "./route-form-skeleton";
import { RulesSection } from "./httproute-form/rules-section";

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

function emptyRule(): RouteRule {
  return createEmptyHTTPRouteFormData().rules[0];
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
    onChange({ ...value, rules: [...value.rules, emptyRule()] });
  };

  const removeRule = (index: number) => {
    onChange({ ...value, rules: value.rules.filter((_, ruleIndex) => ruleIndex !== index) });
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

      <RulesSection
        rules={value.rules}
        namespaces={namespaces}
        t={t}
        onUpdateRule={updateRule}
        onAddRule={addRule}
        onRemoveRule={removeRule}
      />
    </>
  );
}

interface HTTPRouteFormProps {
  initialData?: HTTPRouteFormData;
  mode: "create" | "edit";
  onSuccess?: () => void;
}

export function HTTPRouteForm({ initialData, mode, onSuccess }: HTTPRouteFormProps) {
  return (
    <RouteFormShell
      kind="HTTPRoute"
      mode={mode}
      initialData={initialData}
      onSuccess={onSuccess}
      createEmpty={createEmptyHTTPRouteFormData}
      codec={httpRouteEditorCodec}
      manifestToFormData={httpRouteManifestToFormData}
      resourcePath="httproute"
      validateRules={(nextFormData, t) => {
        const validRules = nextFormData.rules.filter((rule) =>
          rule.backends.some((backend) => backend.name.trim())
        );
        if (validRules.length === 0) return t("create.route.error_need_backend");
        return null;
      }}
      renderForm={({ value, onChange }) => (
        <HTTPRouteFormFields
          value={value}
          onChange={onChange}
          disableIdentityFields={mode === "edit"}
        />
      )}
    />
  );
}
