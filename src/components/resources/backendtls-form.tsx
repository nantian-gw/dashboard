"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useNamespaces } from "@/hooks/use-api";
import { applyResource } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  backendTlsEditorCodec,
  createEmptyBackendTlsFormData,
} from "./backendtls-form-codec";
import { ResourceEditorShell } from "./resource-editor-shell";

interface CertRef {
  name: string;
  group: string;
  kind: string;
}

export interface BackendTlsFormData {
  name: string;
  namespace: string;
  targetGroup: string;
  targetKind: string;
  targetName: string;
  hostname: string;
  caRefs: CertRef[];
}

interface BackendTlsFormProps {
  initialData?: BackendTlsFormData;
  mode: "create" | "edit";
  onSuccess?: () => void;
}

interface BackendTlsFormFieldsProps {
  value: BackendTlsFormData;
  onChange: (next: BackendTlsFormData) => void;
  disableIdentityFields: boolean;
}

function BackendTlsFormFields({
  value,
  onChange,
  disableIdentityFields,
}: BackendTlsFormFieldsProps) {
  const t = useTranslations();
  const { data: namespacesData } = useNamespaces();
  const namespaces =
    (namespacesData as string[]) || ["default", "kube-system", "kube-public", "ingress"];

  const updateCaRef = (index: number, field: keyof CertRef, fieldValue: string) => {
    onChange({
      ...value,
      caRefs: value.caRefs.map((ref, refIndex) =>
        refIndex === index ? { ...ref, [field]: fieldValue } : ref
      ),
    });
  };

  const addCaRef = () => {
    onChange({
      ...value,
      caRefs: [...value.caRefs, { name: "", group: "", kind: "ConfigMap" }],
    });
  };

  const removeCaRef = (index: number) => {
    onChange({
      ...value,
      caRefs: value.caRefs.filter((_, refIndex) => refIndex !== index),
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("backendtls.create.basic_info")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">{t("backendtls.create.name")} *</Label>
              <Input
                id="name"
                value={value.name}
                onChange={(event) => onChange({ ...value, name: event.target.value })}
                placeholder={t("backendtls.create.name_placeholder")}
                required
                disabled={disableIdentityFields}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="namespace">{t("backendtls.create.namespace")} *</Label>
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
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("backendtls.create.target_title")}</CardTitle>
          <CardDescription>{t("backendtls.create.target_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label>{t("backendtls.create.target_group")}</Label>
              <Input
                value={value.targetGroup}
                onChange={(event) => onChange({ ...value, targetGroup: event.target.value })}
                placeholder={t("backendtls.create.target_group_placeholder")}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("backendtls.create.target_kind")}</Label>
              <Select
                value={value.targetKind}
                onValueChange={(targetKind) => onChange({ ...value, targetKind })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Service">Service</SelectItem>
                  <SelectItem value="Secret">Secret</SelectItem>
                  <SelectItem value="ConfigMap">ConfigMap</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t("backendtls.create.target_name")} *</Label>
              <Input
                value={value.targetName}
                onChange={(event) => onChange({ ...value, targetName: event.target.value })}
                placeholder={t("backendtls.create.target_name_placeholder")}
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("backendtls.create.validation_title")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>{t("backendtls.create.hostname")}</Label>
            <Input
              value={value.hostname}
              onChange={(event) => onChange({ ...value, hostname: event.target.value })}
              placeholder={t("backendtls.create.hostname_placeholder")}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">{t("backendtls.create.ca_certificate_refs")}</Label>
              <Button type="button" variant="outline" size="sm" onClick={addCaRef}>
                <Plus className="mr-1 h-4 w-4" /> {t("backendtls.create.add_ca_ref")}
              </Button>
            </div>
            {value.caRefs.map((ref, index) => (
              <div key={index} className="flex items-end gap-2">
                <div className="grid flex-1 gap-1">
                  <Label className="text-xs">{t("backendtls.create.ca_name")}</Label>
                  <Input
                    value={ref.name}
                    onChange={(event) => updateCaRef(index, "name", event.target.value)}
                    placeholder="ca-name"
                  />
                </div>
                <div className="grid flex-1 gap-1">
                  <Label className="text-xs">{t("backendtls.create.ca_group")}</Label>
                  <Input
                    value={ref.group}
                    onChange={(event) => updateCaRef(index, "group", event.target.value)}
                    placeholder="group"
                  />
                </div>
                <div className="grid w-32 gap-1">
                  <Label className="text-xs">Kind</Label>
                  <Select
                    value={ref.kind}
                    onValueChange={(kind) => updateCaRef(index, "kind", kind)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ConfigMap">ConfigMap</SelectItem>
                      <SelectItem value="Secret">Secret</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mb-0 h-9 w-9"
                  onClick={() => removeCaRef(index)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export function BackendTlsForm({ initialData, mode, onSuccess }: BackendTlsFormProps) {
  const t = useTranslations();
  const [formData, setFormData] = useState(initialData ?? createEmptyBackendTlsFormData());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const isEdit = mode === "edit";

  return (
    <ResourceEditorShell
      title={isEdit ? t("backendtls.edit.title") : t("backendtls.create.title")}
      description={
        isEdit ? t("backendtls.edit.description") : t("backendtls.create.description")
      }
      backHref="/backend-tls"
      submitLabel={isEdit ? t("backendtls.edit.submit") : t("backendtls.create.submit")}
      submittingLabel={
        isEdit ? t("backendtls.edit.saving") : t("backendtls.create.creating")
      }
      formData={formData}
      onFormDataChange={setFormData}
      codec={backendTlsEditorCodec}
      expectedEditIdentity={isEdit ? backendTlsEditorCodec.getIdentity(formData) : null}
      isSubmitting={isLoading}
      submitError={error}
      onSubmitManifest={async (yamlText) => {
        setIsLoading(true);
        setError("");

        try {
          const path = isEdit
            ? `/v1/resources/backendtlspolicy/${formData.namespace}/${formData.name}`
            : "/v1/resources";
          const response = await applyResource(yamlText, path);
          if (!response.ok) {
            throw new Error((await response.text()) || `Failed to ${mode}: ${response.status}`);
          }
          onSuccess?.();
        } catch (submitError) {
          setError((submitError as Error).message || t("backendtls.create.error_failed"));
          setIsLoading(false);
          return;
        }

        setIsLoading(false);
      }}
      renderForm={({ value, onChange }) => (
        <BackendTlsFormFields
          value={value}
          onChange={onChange}
          disableIdentityFields={isEdit}
        />
      )}
    />
  );
}
