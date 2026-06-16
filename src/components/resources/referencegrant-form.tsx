"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useNamespaces } from "@/hooks/use-api";
import { applyResource } from "@/lib/api";
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
import {
  createEmptyReferenceGrantFormData,
  referenceGrantEditorCodec,
} from "./referencegrant-form-codec";
import { ResourceEditorShell } from "./resource-editor-shell";

interface FromItem {
  group: string;
  kind: string;
  namespace: string;
}

interface ToItem {
  group: string;
  kind: string;
  name: string;
}

export interface ReferenceGrantFormData {
  name: string;
  namespace: string;
  froms: FromItem[];
  tos: ToItem[];
}

interface ReferenceGrantFormProps {
  initialData?: ReferenceGrantFormData;
  mode: "create" | "edit";
  onSuccess?: () => void;
}

interface ReferenceGrantFormFieldsProps {
  value: ReferenceGrantFormData;
  onChange: (next: ReferenceGrantFormData) => void;
  disableIdentityFields: boolean;
}

function ReferenceGrantFormFields({
  value,
  onChange,
  disableIdentityFields,
}: ReferenceGrantFormFieldsProps) {
  const t = useTranslations();
  const { data: namespacesData } = useNamespaces();
  const namespaces =
    (namespacesData as string[]) || ["default", "kube-system", "kube-public", "ingress"];

  const updateFrom = (index: number, patch: Partial<FromItem>) => {
    onChange({
      ...value,
      froms: value.froms.map((from, fromIndex) =>
        fromIndex === index ? { ...from, ...patch } : from
      ),
    });
  };

  const updateTo = (index: number, patch: Partial<ToItem>) => {
    onChange({
      ...value,
      tos: value.tos.map((to, toIndex) => (toIndex === index ? { ...to, ...patch } : to)),
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("referencegrant.create.basic_info")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">{t("referencegrant.create.name")} *</Label>
              <Input
                id="name"
                value={value.name}
                onChange={(event) => onChange({ ...value, name: event.target.value })}
                placeholder={t("referencegrant.create.name_placeholder")}
                required
                disabled={disableIdentityFields}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="namespace">{t("referencegrant.create.namespace")} *</Label>
              <Select
                value={value.namespace}
                onValueChange={(namespace) => onChange({ ...value, namespace })}
                disabled={disableIdentityFields}
              >
                <SelectTrigger>
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
              <p className="text-xs text-muted-foreground">
                {t("referencegrant.create.namespace_hint")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">{t("referencegrant.create.from_title")}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {t("referencegrant.create.from_desc")}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              onChange({
                ...value,
                froms: [
                  ...value.froms,
                  {
                    group: "gateway.networking.k8s.io",
                    kind: "HTTPRoute",
                    namespace: "default",
                  },
                ],
              })
            }
          >
            <Plus className="mr-1 h-4 w-4" />
            {t("referencegrant.create.add_from")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {value.froms.map((from, index) => (
            <div key={index} className="flex items-end gap-2 rounded-md border p-3">
              <div className="grid flex-1 gap-1">
                <Label className="text-xs text-muted-foreground">
                  {t("referencegrant.create.group")}
                </Label>
                <Input
                  className="h-9 text-xs"
                  value={from.group}
                  onChange={(event) => updateFrom(index, { group: event.target.value })}
                  placeholder="gateway.networking.k8s.io"
                />
              </div>
              <div className="grid w-32 gap-1">
                <Label className="text-xs text-muted-foreground">
                  {t("referencegrant.create.kind")}
                </Label>
                <Select value={from.kind} onValueChange={(kind) => updateFrom(index, { kind })}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HTTPRoute">HTTPRoute</SelectItem>
                    <SelectItem value="GRPCRoute">GRPCRoute</SelectItem>
                    <SelectItem value="TCPRoute">TCPRoute</SelectItem>
                    <SelectItem value="UDPRoute">UDPRoute</SelectItem>
                    <SelectItem value="TLSRoute">TLSRoute</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid flex-1 gap-1">
                <Label className="text-xs text-muted-foreground">
                  {t("referencegrant.create.source_ns")}
                </Label>
                <Select
                  value={from.namespace}
                  onValueChange={(namespace) => updateFrom(index, { namespace })}
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
              {value.froms.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() =>
                    onChange({
                      ...value,
                      froms: value.froms.filter((_, fromIndex) => fromIndex !== index),
                    })
                  }
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">{t("referencegrant.create.to_title")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("referencegrant.create.to_desc")}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              onChange({
                ...value,
                tos: [...value.tos, { group: "", kind: "Service", name: "" }],
              })
            }
          >
            <Plus className="mr-1 h-4 w-4" />
            {t("referencegrant.create.add_to")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {value.tos.map((item, index) => (
            <div key={index} className="flex gap-2 items-end border rounded-md p-3">
              <div className="grid gap-1 flex-1">
                <Label className="text-xs text-muted-foreground">
                  {t("referencegrant.create.group")}
                </Label>
                <Input
                  className="h-9 text-xs"
                  value={item.group}
                  onChange={(event) => updateTo(index, { group: event.target.value })}
                  placeholder={t("referencegrant.create.core_group_placeholder")}
                />
              </div>
              <div className="grid gap-1 w-32">
                <Label className="text-xs text-muted-foreground">
                  {t("referencegrant.create.kind")}
                </Label>
                <Select value={item.kind} onValueChange={(kind) => updateTo(index, { kind })}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Service">Service</SelectItem>
                    <SelectItem value="Secret">Secret</SelectItem>
                    <SelectItem value="ConfigMap">ConfigMap</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1 flex-1">
                <Label className="text-xs text-muted-foreground">
                  {t("referencegrant.create.target_name")}
                </Label>
                <Input
                  className="h-9 text-xs"
                  value={item.name}
                  onChange={(event) => updateTo(index, { name: event.target.value })}
                  placeholder={t("referencegrant.create.target_name_placeholder")}
                />
              </div>
              {value.tos.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() =>
                    onChange({
                      ...value,
                      tos: value.tos.filter((_, toIndex) => toIndex !== index),
                    })
                  }
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}

export function ReferenceGrantForm({ initialData, mode, onSuccess }: ReferenceGrantFormProps) {
  const t = useTranslations();
  const [formData, setFormData] = useState(initialData ?? createEmptyReferenceGrantFormData());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const isEdit = mode === "edit";

  return (
    <ResourceEditorShell
      title={isEdit ? t("referencegrant.edit.title") : t("referencegrant.create.title")}
      description={
        isEdit
          ? t("referencegrant.edit.description")
          : t("referencegrant.create.description")
      }
      backHref="/reference-grants"
      submitLabel={
        isEdit ? t("referencegrant.edit.submit") : t("referencegrant.create.submit")
      }
      submittingLabel={
        isEdit ? t("referencegrant.edit.saving") : t("referencegrant.create.creating")
      }
      formData={formData}
      onFormDataChange={setFormData}
      codec={referenceGrantEditorCodec}
      expectedEditIdentity={isEdit ? referenceGrantEditorCodec.getIdentity(formData) : null}
      isSubmitting={isLoading}
      submitError={error}
      onSubmitManifest={async (yamlText) => {
        setIsLoading(true);
        setError("");

        try {
          const path = isEdit
            ? `/v1/resources/referencegrant/${formData.namespace}/${formData.name}`
            : "/v1/resources";
          const response = await applyResource(yamlText, path);
          if (!response.ok) {
            throw new Error((await response.text()) || `Failed to ${mode}: ${response.status}`);
          }
          onSuccess?.();
        } catch (submitError) {
          setError(
            (submitError as Error).message || t("referencegrant.create.error_failed")
          );
          setIsLoading(false);
          return;
        }

        setIsLoading(false);
      }}
      renderForm={({ value, onChange }) => (
        <ReferenceGrantFormFields
          value={value}
          onChange={onChange}
          disableIdentityFields={isEdit}
        />
      )}
    />
  );
}
