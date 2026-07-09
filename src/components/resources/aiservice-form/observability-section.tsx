"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export interface AIServiceObservabilityProps {
  langfuseHost: string;
  onLangfuseHostChange: (v: string) => void;
  langfusePublicKey: string;
  onLangfusePublicKeyChange: (v: string) => void;
  langfuseSecretKey: string;
  onLangfuseSecretKeyChange: (v: string) => void;
  otelEndpoint: string;
  onOtelEndpointChange: (v: string) => void;
  otelServiceName: string;
  onOtelServiceNameChange: (v: string) => void;
}

export function AIServiceObservability(props: AIServiceObservabilityProps) {
  const t = useTranslations();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("aiservice.create.observability_title")}</CardTitle>
        <CardDescription>{t("aiservice.create.observability_desc")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="space-y-3">
          <h4 className="text-sm font-medium">{t("aiservice.create.langfuse_title")}</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label>{t("aiservice.create.langfuse_host")}</Label>
              <Input
                value={props.langfuseHost}
                onChange={(e) => props.onLangfuseHostChange(e.target.value)}
                placeholder={t("aiservice.create.langfuse_host_placeholder")}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("aiservice.create.langfuse_public_key")}</Label>
              <Input
                value={props.langfusePublicKey}
                onChange={(e) => props.onLangfusePublicKeyChange(e.target.value)}
                placeholder="pk-..."
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("aiservice.create.langfuse_secret_key")}</Label>
              <Input
                type="password"
                value={props.langfuseSecretKey}
                onChange={(e) => props.onLangfuseSecretKeyChange(e.target.value)}
                placeholder="sk-..."
              />
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <h4 className="text-sm font-medium">{t("aiservice.create.otel_title")}</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t("aiservice.create.otel_endpoint")}</Label>
              <Input
                value={props.otelEndpoint}
                onChange={(e) => props.onOtelEndpointChange(e.target.value)}
                placeholder={t("aiservice.create.otel_endpoint_placeholder")}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("aiservice.create.otel_service_name")}</Label>
              <Input
                value={props.otelServiceName}
                onChange={(e) => props.onOtelServiceNameChange(e.target.value)}
                placeholder={t("aiservice.create.otel_service_name_placeholder")}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
