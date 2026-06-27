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
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";
import {
  backendLbPolicyEditorCodec,
  createEmptyBackendLbPolicyFormData,
} from "./backendlbpolicy-form-codec";
import { ResourceEditorShell } from "./resource-editor-shell";

interface TargetRef {
  group: string;
  kind: string;
  name: string;
}

export interface BackendLbPolicyFormData {
  name: string;
  namespace: string;
  targetRefs: TargetRef[];
  sessionEnabled: boolean;
  sessionName: string;
  sessionType: string;
  cookieLifetimeType: string;
  absoluteTimeout: string;
  idleTimeout: string;
  lbType: string;
  consistentHashKeyType: string;
  consistentHashHeaderName: string;
  circuitBreakerEnabled: boolean;
  maxInflightRequests: string;
}

interface BackendLbPolicyFormProps {
  initialData?: BackendLbPolicyFormData;
  mode: "create" | "edit";
  onSuccess?: () => void;
}

interface BackendLbPolicyFormFieldsProps {
  value: BackendLbPolicyFormData;
  onChange: (next: BackendLbPolicyFormData) => void;
  disableIdentityFields: boolean;
}

function BackendLbPolicyFormFields({
  value,
  onChange,
  disableIdentityFields,
}: BackendLbPolicyFormFieldsProps) {
  const t = useTranslations();
  const { data: namespacesData } = useNamespaces();
  const namespaces =
    (namespacesData as string[]) || ["default", "kube-system", "kube-public", "ingress"];

  const updateTargetRef = (index: number, field: keyof TargetRef, fieldValue: string) => {
    onChange({
      ...value,
      targetRefs: value.targetRefs.map((ref, refIndex) =>
        refIndex === index ? { ...ref, [field]: fieldValue } : ref
      ),
    });
  };

  const addTargetRef = () => {
    onChange({
      ...value,
      targetRefs: [...value.targetRefs, { group: "", kind: "Service", name: "" }],
    });
  };

  const removeTargetRef = (index: number) => {
    onChange({
      ...value,
      targetRefs: value.targetRefs.filter((_, refIndex) => refIndex !== index),
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("backendlb.create.basic_info")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">{t("backendlb.create.name")} *</Label>
              <Input
                id="name"
                value={value.name}
                onChange={(event) => onChange({ ...value, name: event.target.value })}
                placeholder={t("backendlb.create.name_placeholder")}
                required
                disabled={disableIdentityFields}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="namespace">{t("backendlb.create.namespace")} *</Label>
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
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">{t("backendlb.create.target_title")}</CardTitle>
            <CardDescription>{t("backendlb.create.target_desc")}</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addTargetRef}>
            <Plus className="mr-1 h-4 w-4" /> {t("backendlb.create.add_target_ref")}
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4">
          {value.targetRefs.map((ref, index) => (
            <div key={index} className="flex items-end gap-2">
              <div className="grid w-32 gap-1">
                <Label className="text-xs">{t("backendlb.create.target_group")}</Label>
                <Input
                  value={ref.group}
                  onChange={(event) => updateTargetRef(index, "group", event.target.value)}
                  placeholder="group"
                />
              </div>
              <div className="grid w-32 gap-1">
                <Label className="text-xs">{t("backendlb.create.target_kind")}</Label>
                <Select
                  value={ref.kind}
                  onValueChange={(kind) => updateTargetRef(index, "kind", kind)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Service">Service</SelectItem>
                    <SelectItem value="ServiceImport">ServiceImport</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid flex-1 gap-1">
                <Label className="text-xs">{t("backendlb.create.target_name")} *</Label>
                <Input
                  value={ref.name}
                  onChange={(event) => updateTargetRef(index, "name", event.target.value)}
                  placeholder="my-service"
                  required
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mb-0 h-9 w-9"
                onClick={() => removeTargetRef(index)}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">{t("backendlb.create.session_title")}</CardTitle>
              <CardDescription>{t("backendlb.create.session_desc")}</CardDescription>
            </div>
            <Checkbox
              checked={value.sessionEnabled}
              onCheckedChange={(checked) =>
                onChange({ ...value, sessionEnabled: checked })
              }
            />
          </div>
        </CardHeader>
        {value.sessionEnabled && (
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t("backendlb.create.session_type")}</Label>
                <Select
                  value={value.sessionType}
                  onValueChange={(sessionType) => onChange({ ...value, sessionType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cookie">Cookie</SelectItem>
                    <SelectItem value="Header">Header</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t("backendlb.create.session_name")}</Label>
                <Input
                  value={value.sessionName}
                  onChange={(event) =>
                    onChange({ ...value, sessionName: event.target.value })
                  }
                  placeholder={t("backendlb.create.session_name_placeholder")}
                />
              </div>
            </div>
            {value.sessionType === "Cookie" && (
              <div className="grid gap-2">
                <Label>{t("backendlb.create.cookie_lifetime")}</Label>
                <Select
                  value={value.cookieLifetimeType}
                  onValueChange={(cookieLifetimeType) =>
                    onChange({ ...value, cookieLifetimeType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Session">Session</SelectItem>
                    <SelectItem value="Permanent">Permanent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t("backendlb.create.absolute_timeout")}</Label>
                <Input
                  value={value.absoluteTimeout}
                  onChange={(event) =>
                    onChange({ ...value, absoluteTimeout: event.target.value })
                  }
                  placeholder="30m"
                />
              </div>
              <div className="grid gap-2">
                <Label>{t("backendlb.create.idle_timeout")}</Label>
                <Input
                  value={value.idleTimeout}
                  onChange={(event) =>
                    onChange({ ...value, idleTimeout: event.target.value })
                  }
                  placeholder="5m"
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("backendlb.create.lb_title")}</CardTitle>
          <CardDescription>{t("backendlb.create.lb_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t("backendlb.create.lb_strategy")}</Label>
              <Select
                value={value.lbType}
                onValueChange={(lbType) => onChange({ ...value, lbType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RoundRobin">Round Robin</SelectItem>
                  <SelectItem value="ConsistentHash">Consistent Hash</SelectItem>
                  <SelectItem value="LeastRequest">Least Request</SelectItem>
                  <SelectItem value="Random">Random</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {value.lbType === "ConsistentHash" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t("backendlb.create.hash_key_type")}</Label>
                <Select
                  value={value.consistentHashKeyType}
                  onValueChange={(consistentHashKeyType) =>
                    onChange({ ...value, consistentHashKeyType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SourceIP">Source IP</SelectItem>
                    <SelectItem value="Header">Header</SelectItem>
                    <SelectItem value="Hostname">Hostname</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {value.consistentHashKeyType === "Header" && (
                <div className="grid gap-2">
                  <Label>{t("backendlb.create.hash_header_name")}</Label>
                  <Input
                    value={value.consistentHashHeaderName}
                    onChange={(event) =>
                      onChange({
                        ...value,
                        consistentHashHeaderName: event.target.value,
                      })
                    }
                    placeholder="x-user-id"
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">{t("backendlb.create.cb_title")}</CardTitle>
              <CardDescription>{t("backendlb.create.cb_desc")}</CardDescription>
            </div>
            <Checkbox
              checked={value.circuitBreakerEnabled}
              onCheckedChange={(checked) =>
                onChange({ ...value, circuitBreakerEnabled: checked })
              }
            />
          </div>
        </CardHeader>
        {value.circuitBreakerEnabled && (
          <CardContent className="grid gap-4">
            <div className="grid gap-2 max-w-xs">
              <Label>{t("backendlb.create.max_inflight_requests")}</Label>
              <Input
                type="number"
                value={value.maxInflightRequests}
                onChange={(event) =>
                  onChange({ ...value, maxInflightRequests: event.target.value })
                }
                placeholder="1000"
              />
            </div>
          </CardContent>
        )}
      </Card>
    </>
  );
}

export function BackendLbPolicyForm({
  initialData,
  mode,
  onSuccess,
}: BackendLbPolicyFormProps) {
  const t = useTranslations();
  const [formData, setFormData] = useState(
    initialData ?? createEmptyBackendLbPolicyFormData()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const isEdit = mode === "edit";

  return (
    <ResourceEditorShell
      title={isEdit ? t("backendlb.edit.title") : t("backendlb.create.title")}
      description={
        isEdit
          ? t("backendlb.edit.description")
          : t("backendlb.create.description")
      }
      backHref="/backend-lb-policy"
      submitLabel={
        isEdit ? t("backendlb.edit.submit") : t("backendlb.create.submit")
      }
      submittingLabel={
        isEdit ? t("backendlb.edit.saving") : t("backendlb.create.creating")
      }
      formData={formData}
      onFormDataChange={setFormData}
      codec={backendLbPolicyEditorCodec}
      expectedEditIdentity={
        isEdit ? backendLbPolicyEditorCodec.getIdentity(formData) : null
      }
      isSubmitting={isLoading}
      submitError={error}
      onSubmitManifest={async (yamlText) => {
        setIsLoading(true);
        setError("");

        try {
          const path = isEdit
            ? `/v1/resources/backendlbpolicy/${formData.namespace}/${formData.name}`
            : "/v1/resources";
          const response = await applyResource(yamlText, path);
          if (!response.ok) {
            throw new Error(
              (await response.text()) || `Failed to ${mode}: ${response.status}`
            );
          }
          onSuccess?.();
        } catch (submitError) {
          setError(
            (submitError as Error).message || t("backendlb.create.error_failed")
          );
          setIsLoading(false);
          return;
        }

        setIsLoading(false);
      }}
      renderForm={({ value, onChange }) => (
        <BackendLbPolicyFormFields
          value={value}
          onChange={onChange}
          disableIdentityFields={isEdit}
        />
      )}
    />
  );
}
