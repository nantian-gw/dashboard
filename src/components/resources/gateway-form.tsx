"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useNamespaces } from "@/hooks/use-api";
import { applyResource } from "@/lib/api";
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
import { Plus, Trash2 } from "lucide-react";
import {
  createEmptyGatewayFormData,
  gatewayEditorCodec,
  gatewayManifestToFormData,
} from "./gateway-form-codec";
import { ResourceEditorShell } from "./resource-editor-shell";

export interface CertRef {
  name: string;
  namespace: string;
  kind: string;
  group: string;
}

export interface ListenerData {
  port: number;
  protocol: string;
  name: string;
  tls?: { mode: string; certificateRefs: CertRef[] };
}

export interface GatewayFormData {
  name: string;
  namespace: string;
  gatewayClass: string;
  listeners: ListenerData[];
}

interface GatewayFormProps {
  initialData?: GatewayFormData;
  mode: "create" | "edit";
  onSuccess?: () => void;
}

interface GatewayFormFieldsProps {
  value: GatewayFormData;
  onChange: (next: GatewayFormData) => void;
  disableIdentityFields: boolean;
}

function GatewayFormFields({
  value,
  onChange,
  disableIdentityFields,
}: GatewayFormFieldsProps) {
  const t = useTranslations();
  const { data: namespacesData } = useNamespaces();
  const namespaces =
    (namespacesData as string[]) || ["default", "kube-system", "kube-public", "ingress"];

  const addListener = () => {
    onChange({
      ...value,
      listeners: [
        ...value.listeners,
        { port: 8080, protocol: "HTTP", name: `http-${value.listeners.length}` },
      ],
    });
  };

  const removeListener = (index: number) => {
    onChange({
      ...value,
      listeners: value.listeners.filter((_, listenerIndex) => listenerIndex !== index),
    });
  };

  const updateListener = (index: number, field: string, fieldValue: string | number) => {
    const listeners = value.listeners.map((listener, listenerIndex) => {
      if (listenerIndex !== index) return listener;

      const nextListener = {
        ...listener,
        [field]: fieldValue,
      } as ListenerData;

      if (field === "protocol") {
        const nextProtocol = String(fieldValue);
        if (nextProtocol === "HTTPS" || nextProtocol === "TLS") {
          if (!nextListener.tls) {
            nextListener.tls = {
              mode: "Terminate",
              certificateRefs: [
                {
                  name: "",
                  namespace: value.namespace,
                  kind: "Secret",
                  group: "",
                },
              ],
            };
          } else if (nextProtocol === "HTTPS") {
            nextListener.tls = {
              ...nextListener.tls,
              mode: "Terminate",
            };
          }
        } else {
          delete nextListener.tls;
        }
      }

      return nextListener;
    });

    onChange({ ...value, listeners });
  };

  const updateListenerTLS = (index: number, field: string, fieldValue: string) => {
    const listeners = value.listeners.map((listener, listenerIndex) => {
      if (listenerIndex !== index || !listener.tls) return listener;
      return {
        ...listener,
        tls: {
          ...listener.tls,
          [field]: fieldValue,
        },
      };
    });

    onChange({ ...value, listeners });
  };

  const addCertRef = (listenerIndex: number) => {
    const listeners = value.listeners.map((listener, index) => {
      if (index !== listenerIndex || !listener.tls) return listener;
      return {
        ...listener,
        tls: {
          ...listener.tls,
          certificateRefs: [
            ...listener.tls.certificateRefs,
            { name: "", namespace: value.namespace, kind: "Secret", group: "" },
          ],
        },
      };
    });

    onChange({ ...value, listeners });
  };

  const removeCertRef = (listenerIndex: number, refIndex: number) => {
    const listeners = value.listeners.map((listener, index) => {
      if (index !== listenerIndex || !listener.tls) return listener;
      return {
        ...listener,
        tls: {
          ...listener.tls,
          certificateRefs: listener.tls.certificateRefs.filter(
            (_, certificateIndex) => certificateIndex !== refIndex
          ),
        },
      };
    });

    onChange({ ...value, listeners });
  };

  const updateCertRef = (
    listenerIndex: number,
    refIndex: number,
    field: string,
    fieldValue: string
  ) => {
    const listeners = value.listeners.map((listener, index) => {
      if (index !== listenerIndex || !listener.tls) return listener;
      return {
        ...listener,
        tls: {
          ...listener.tls,
          certificateRefs: listener.tls.certificateRefs.map((ref, certificateIndex) =>
            certificateIndex === refIndex ? { ...ref, [field]: fieldValue } : ref
          ),
        },
      };
    });

    onChange({ ...value, listeners });
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("create.gateway.basic_info_title")}</CardTitle>
          <CardDescription>{t("create.gateway.basic_info_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">{t("create.gateway.gateway_name")}</Label>
              <Input
                id="name"
                value={value.name}
                onChange={(event) => onChange({ ...value, name: event.target.value })}
                placeholder={t("create.gateway.gateway_name_placeholder")}
                required
                disabled={disableIdentityFields}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="namespace">{t("create.gateway.namespace")}</Label>
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
            <Label htmlFor="gw-class">{t("create.gateway.gateway_class")}</Label>
            <Input
              id="gw-class"
              value={value.gatewayClass}
              onChange={(event) => onChange({ ...value, gatewayClass: event.target.value })}
              placeholder={t("create.gateway.gateway_class_placeholder")}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">{t("create.gateway.listeners_title")}</CardTitle>
            <CardDescription>{t("create.gateway.listeners_desc")}</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addListener}>
            <Plus className="mr-1 h-4 w-4" /> {t("create.gateway.add_listener")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {value.listeners.map((listener, listenerIndex) => (
            <Card key={listenerIndex}>
              <CardContent className="pt-6">
                <div className="mb-4 flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    {t("create.gateway.listener_n", { n: listenerIndex + 1 })}
                  </Label>
                  {value.listeners.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeListener(listenerIndex)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  ) : null}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label>{t("create.gateway.listener_name")}</Label>
                    <Input
                      value={listener.name}
                      onChange={(event) =>
                        updateListener(listenerIndex, "name", event.target.value)
                      }
                      placeholder="e.g. http"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t("create.gateway.listener_port")}</Label>
                    <Input
                      type="number"
                      value={listener.port}
                      onChange={(event) =>
                        updateListener(
                          listenerIndex,
                          "port",
                          parseInt(event.target.value, 10) || 0
                        )
                      }
                      placeholder="80"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t("create.gateway.listener_protocol")}</Label>
                    <Select
                      value={listener.protocol}
                      onValueChange={(protocol) =>
                        updateListener(listenerIndex, "protocol", protocol)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["HTTP", "HTTPS", "TLS", "TCP", "UDP"].map((protocol) => (
                          <SelectItem key={protocol} value={protocol}>
                            {protocol}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {listener.protocol === "HTTPS" || listener.protocol === "TLS" ? (
                  <div className="mt-4 space-y-4 rounded-md border p-4">
                    <Label className="text-sm font-medium">TLS Configuration</Label>

                    {listener.protocol === "TLS" ? (
                      <div className="grid gap-2">
                        <Label>{t("create.gateway.tls_mode")}</Label>
                        <Select
                          value={listener.tls?.mode || "Terminate"}
                          onValueChange={(mode) =>
                            updateListenerTLS(listenerIndex, "mode", mode)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Terminate">Terminate</SelectItem>
                            <SelectItem value="Passthrough">Passthrough</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : null}

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">{t("create.gateway.certificate_refs")}</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => addCertRef(listenerIndex)}
                        >
                          <Plus className="mr-1 h-3 w-3" />{" "}
                          {t("create.gateway.add_cert_ref")}
                        </Button>
                      </div>
                      {(listener.tls?.certificateRefs || []).map((ref, refIndex) => (
                        <div key={refIndex} className="grid grid-cols-4 items-end gap-2">
                          <div className="grid gap-1">
                            <Label className="text-xs">{t("create.gateway.cert_name")}</Label>
                            <Input
                              value={ref.name}
                              onChange={(event) =>
                                updateCertRef(
                                  listenerIndex,
                                  refIndex,
                                  "name",
                                  event.target.value
                                )
                              }
                              placeholder="cert-name"
                            />
                          </div>
                          <div className="grid gap-1">
                            <Label className="text-xs">
                              {t("create.gateway.cert_namespace")}
                            </Label>
                            <Input
                              value={ref.namespace}
                              onChange={(event) =>
                                updateCertRef(
                                  listenerIndex,
                                  refIndex,
                                  "namespace",
                                  event.target.value
                                )
                              }
                              placeholder="default"
                            />
                          </div>
                          <div className="grid gap-1">
                            <Label className="text-xs">Kind</Label>
                            <Input
                              value={ref.kind}
                              onChange={(event) =>
                                updateCertRef(
                                  listenerIndex,
                                  refIndex,
                                  "kind",
                                  event.target.value
                                )
                              }
                              placeholder="Secret"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => removeCertRef(listenerIndex, refIndex)}
                          >
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </>
  );
}

export function GatewayForm({ initialData, mode, onSuccess }: GatewayFormProps) {
  const t = useTranslations();
  const [formData, setFormData] = useState(initialData ?? createEmptyGatewayFormData());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const isEdit = mode === "edit";

  // ResourceEditorShell owns the LocalizedLink back/cancel navigation for this editor.
  return (
    <ResourceEditorShell
      title={isEdit ? t("create.gateway.edit_title") : t("create.gateway.title")}
      description={
        isEdit ? t("create.gateway.edit_description") : t("create.gateway.description")
      }
      backHref="/gateways"
      submitLabel={isEdit ? t("create.gateway.save") : t("create.gateway.submit")}
      submittingLabel={isEdit ? t("control.applying") : t("create.gateway.creating")}
      formData={formData}
      onFormDataChange={setFormData}
      codec={gatewayEditorCodec}
      expectedEditIdentity={isEdit ? gatewayEditorCodec.getIdentity(formData) : null}
      isSubmitting={isLoading}
      submitError={error}
      onSubmitManifest={async (yamlText) => {
        setIsLoading(true);
        setError("");

        try {
          const nextFormData = gatewayManifestToFormData(yamlText);

          for (const listener of nextFormData.listeners) {
            if (listener.protocol === "HTTPS" && listener.tls?.mode === "Passthrough") {
              setError(t("create.gateway.error_https_terminate", { name: listener.name }));
              setIsLoading(false);
              return;
            }
          }

          const path = isEdit
            ? `/v1/resources/gateway/${formData.namespace}/${formData.name}`
            : "/v1/resources";
          const response = await applyResource(yamlText, path);
          if (!response.ok) {
            throw new Error((await response.text()) || `Failed to ${mode}: ${response.status}`);
          }

          setFormData(nextFormData);
          onSuccess?.();
        } catch (submitError) {
          setError((submitError as Error).message || `Failed to ${mode} gateway`);
          setIsLoading(false);
          return;
        }

        setIsLoading(false);
      }}
      renderForm={({ value, onChange }) => (
        <GatewayFormFields
          value={value}
          onChange={onChange}
          disableIdentityFields={isEdit}
        />
      )}
    />
  );
}
