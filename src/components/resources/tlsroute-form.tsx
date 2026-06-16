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
  createEmptyTLSRouteFormData,
  tlsRouteEditorCodec,
  tlsRouteManifestToFormData,
} from "./tlsroute-form-codec";
import { ResourceEditorShell } from "./resource-editor-shell";

export interface BackendRef {
  name: string;
  namespace: string;
  port: number;
  weight: number;
}

export interface TLSRouteFormData {
  name: string;
  namespace: string;
  gatewayName: string;
  gatewayNamespace: string;
  sniHosts: string;
  backends: BackendRef[];
}

interface TLSRouteFormProps {
  initialData?: TLSRouteFormData;
  mode: "create" | "edit";
  onSuccess?: () => void;
}

interface TLSRouteFormFieldsProps {
  value: TLSRouteFormData;
  onChange: (next: TLSRouteFormData) => void;
  disableIdentityFields: boolean;
}

function TLSRouteFormFields({
  value,
  onChange,
  disableIdentityFields,
}: TLSRouteFormFieldsProps) {
  const t = useTranslations();
  const { data: namespacesData } = useNamespaces();
  const namespaces =
    (namespacesData as string[]) || ["default", "kube-system", "kube-public", "ingress"];
  const { data: gatewaysData } = useGateways();
  const gateways =
    (gatewaysData?.gateways as Array<{ name: string; namespace: string }> | undefined) || [];
  const filteredGateways = gateways.filter(
    (gateway) => gateway.namespace === value.gatewayNamespace
  );

  const addBackend = () => {
    onChange({
      ...value,
      backends: [...value.backends, { name: "", namespace: "default", port: 443, weight: 100 }],
    });
  };

  const removeBackend = (index: number) => {
    onChange({
      ...value,
      backends: value.backends.filter((_, backendIndex) => backendIndex !== index),
    });
  };

  const updateBackend = (
    index: number,
    field: keyof BackendRef,
    fieldValue: string | number
  ) => {
    onChange({
      ...value,
      backends: value.backends.map((backend, backendIndex) =>
        backendIndex === index ? { ...backend, [field]: fieldValue } : backend
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
              <Label htmlFor="route-namespace">{t("create.route.namespace")} *</Label>
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
                <SelectTrigger id="gw-name">
                  <SelectValue placeholder={t("create.route.select_gateway")} />
                </SelectTrigger>
                <SelectContent>
                  {filteredGateways.length === 0 ? (
                    <SelectItem value="__none__" disabled>
                      {t("create.route.no_gateways_in", { ns: value.gatewayNamespace })}
                    </SelectItem>
                  ) : (
                    filteredGateways.map((gateway) => (
                      <SelectItem
                        key={`${gateway.namespace}/${gateway.name}`}
                        value={gateway.name}
                      >
                        {gateway.name}
                      </SelectItem>
                    ))
                  )}
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
            <Label htmlFor="sni-hosts">{t("create.route.sni_hostnames")}</Label>
            <Input
              id="sni-hosts"
              value={value.sniHosts}
              onChange={(event) => onChange({ ...value, sniHosts: event.target.value })}
              placeholder={t("create.route.sni_hostnames_placeholder")}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">{t("create.route.backend_services")}</CardTitle>
            <CardDescription>{t("create.route.backend_services_desc")}</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addBackend}>
            <Plus className="mr-1 h-4 w-4" />
            {t("create.route.add_backend")}
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4">
          {value.backends.map((backend, index) => (
            <div
              key={index}
              className="flex items-end gap-2 rounded-md border bg-slate-50/50 p-3"
            >
              <div className="grid flex-1 gap-1">
                <Label className="text-xs text-muted-foreground">
                  {t("create.route.service")}
                </Label>
                <Input
                  value={backend.name}
                  onChange={(event) => updateBackend(index, "name", event.target.value)}
                  placeholder={t("create.route.service_placeholder")}
                />
              </div>
              <div className="grid w-24 gap-1">
                <Label className="text-xs text-muted-foreground">
                  {t("create.route.namespace")}
                </Label>
                <Select
                  value={backend.namespace}
                  onValueChange={(namespace) => updateBackend(index, "namespace", namespace)}
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
                    updateBackend(index, "port", parseInt(event.target.value, 10) || 443)
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
                    updateBackend(index, "weight", parseInt(event.target.value, 10) || 0)
                  }
                />
              </div>
              {value.backends.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeBackend(index)}
                  className="h-9 text-red-500 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}

export function TLSRouteForm({ initialData, mode, onSuccess }: TLSRouteFormProps) {
  const t = useTranslations();
  const [formData, setFormData] = useState(initialData ?? createEmptyTLSRouteFormData());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const isEdit = mode === "edit";

  return (
    <ResourceEditorShell
      title={
        isEdit
          ? t("create.route.edit_title", { kind: "TLSRoute" })
          : t("create.route.title", { kind: "TLSRoute" })
      }
      description={
        isEdit
          ? t("create.route.edit_description", { kind: "TLSRoute" })
          : t("create.route.description", { kind: "TLSRoute" })
      }
      backHref="/routes"
      submitLabel={
        isEdit
          ? t("create.route.save", { kind: "TLSRoute" })
          : t("create.route.submit", { kind: "TLSRoute" })
      }
      submittingLabel={isEdit ? t("create.route.saving") : t("create.route.creating")}
      formData={formData}
      onFormDataChange={setFormData}
      codec={tlsRouteEditorCodec}
      expectedEditIdentity={isEdit ? tlsRouteEditorCodec.getIdentity(formData) : null}
      isSubmitting={isLoading}
      submitError={error}
      onSubmitManifest={async (yamlText) => {
        setIsLoading(true);
        setError("");

        try {
          const nextFormData = tlsRouteManifestToFormData(yamlText);
          const validBackends = nextFormData.backends.filter((backend) => backend.name.trim());

          if (!nextFormData.gatewayName.trim()) {
            setError(t("create.route.error_need_gateway"));
            setIsLoading(false);
            return;
          }

          if (validBackends.length === 0) {
            setError(t("create.route.error_need_backend"));
            setIsLoading(false);
            return;
          }

          const path = isEdit
            ? `/v1/resources/tlsroute/${formData.namespace}/${formData.name}`
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
        <TLSRouteFormFields
          value={value}
          onChange={onChange}
          disableIdentityFields={isEdit}
        />
      )}
    />
  );
}
