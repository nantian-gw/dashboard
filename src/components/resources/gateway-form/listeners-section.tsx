"use client";

import type { useTranslations } from "next-intl";
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
import type { ListenerData } from "../gateway-form";

interface ListenersSectionProps {
  listeners: ListenerData[];
  t: ReturnType<typeof useTranslations>;
  onAddListener: () => void;
  onRemoveListener: (index: number) => void;
  onUpdateListener: (index: number, field: string, fieldValue: string | number) => void;
  onUpdateListenerTLS: (index: number, field: string, fieldValue: string) => void;
  onAddCertRef: (listenerIndex: number) => void;
  onRemoveCertRef: (listenerIndex: number, refIndex: number) => void;
  onUpdateCertRef: (
    listenerIndex: number,
    refIndex: number,
    field: string,
    fieldValue: string
  ) => void;
}

export function ListenersSection({
  listeners,
  t,
  onAddListener,
  onRemoveListener,
  onUpdateListener,
  onUpdateListenerTLS,
  onAddCertRef,
  onRemoveCertRef,
  onUpdateCertRef,
}: ListenersSectionProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base">{t("create.gateway.listeners_title")}</CardTitle>
          <CardDescription>{t("create.gateway.listeners_desc")}</CardDescription>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onAddListener}>
          <Plus className="mr-1 h-4 w-4" /> {t("create.gateway.add_listener")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {listeners.map((listener, listenerIndex) => (
          <Card key={listenerIndex}>
            <CardContent className="pt-6">
              <div className="mb-4 flex items-center justify-between">
                <Label className="text-sm font-medium">
                  {t("create.gateway.listener_n", { n: listenerIndex + 1 })}
                </Label>
                {listeners.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveListener(listenerIndex)}
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
                      onUpdateListener(listenerIndex, "name", event.target.value)
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
                      onUpdateListener(
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
                      onUpdateListener(listenerIndex, "protocol", protocol)
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
                          onUpdateListenerTLS(listenerIndex, "mode", mode)
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
                        onClick={() => onAddCertRef(listenerIndex)}
                      >
                        <Plus className="mr-1 h-3 w-3" /> {t("create.gateway.add_cert_ref")}
                      </Button>
                    </div>
                    {(listener.tls?.certificateRefs || []).map((ref, refIndex) => (
                      <div key={refIndex} className="grid grid-cols-4 items-end gap-2">
                        <div className="grid gap-1">
                          <Label className="text-xs">{t("create.gateway.cert_name")}</Label>
                          <Input
                            value={ref.name}
                            onChange={(event) =>
                              onUpdateCertRef(
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
                              onUpdateCertRef(
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
                              onUpdateCertRef(
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
                          onClick={() => onRemoveCertRef(listenerIndex, refIndex)}
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
  );
}
