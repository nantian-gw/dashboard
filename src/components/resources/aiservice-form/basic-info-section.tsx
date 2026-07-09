"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface AIServiceBasicInfoProps {
  name: string;
  onNameChange: (v: string) => void;
  namespace: string;
  onNamespaceChange: (v: string) => void;
  provider: string;
  onProviderChange: (v: string) => void;
  format: string;
  onFormatChange: (v: string) => void;
  model: string;
  onModelChange: (v: string) => void;
  endpoint: string;
  onEndpointChange: (v: string) => void;
  authType: string;
  onAuthTypeChange: (v: string) => void;
  authSecret: string;
  onAuthSecretChange: (v: string) => void;
  authKey: string;
  onAuthKeyChange: (v: string) => void;
  authHeader: string;
  onAuthHeaderChange: (v: string) => void;
  timeout: string;
  onTimeoutChange: (v: string) => void;
  maxRetries: number;
  onMaxRetriesChange: (v: number) => void;
  backoff: string;
  onBackoffChange: (v: string) => void;
  isEdit: boolean;
  namespaces: string[];
}

export function AIServiceBasicInfo({
  name, onNameChange,
  namespace, onNamespaceChange,
  provider, onProviderChange,
  format, onFormatChange,
  model, onModelChange,
  endpoint, onEndpointChange,
  authType, onAuthTypeChange,
  authSecret, onAuthSecretChange,
  authKey, onAuthKeyChange,
  authHeader, onAuthHeaderChange,
  timeout, onTimeoutChange,
  maxRetries, onMaxRetriesChange,
  backoff, onBackoffChange,
  isEdit,
  namespaces,
}: AIServiceBasicInfoProps) {
  const t = useTranslations();

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("aiservice.create.basic_info")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">{t("aiservice.create.name")} *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder={t("aiservice.create.name_placeholder")}
                required
                disabled={isEdit}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="namespace">{t("aiservice.create.namespace")} *</Label>
              <Select value={namespace} onValueChange={onNamespaceChange} disabled={isEdit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {namespaces.map((ns) => (
                    <SelectItem key={ns} value={ns}>{ns}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="provider">{t("aiservice.create.provider")} *</Label>
              <Input
                id="provider"
                value={provider}
                onChange={(e) => onProviderChange(e.target.value)}
                placeholder={t("aiservice.create.provider_placeholder")}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="format">{t("aiservice.create.format")}</Label>
              <Select value={format} onValueChange={onFormatChange}>
                <SelectTrigger>
                  <SelectValue placeholder={t("aiservice.create.format_placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">openai</SelectItem>
                  <SelectItem value="anthropic">anthropic</SelectItem>
                  <SelectItem value="google">google</SelectItem>
                  <SelectItem value="aws-bedrock">aws-bedrock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="model">{t("aiservice.create.model")} *</Label>
              <Input
                id="model"
                value={model}
                onChange={(e) => onModelChange(e.target.value)}
                placeholder={t("aiservice.create.model_placeholder")}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endpoint">{t("aiservice.create.endpoint")}</Label>
              <Input
                id="endpoint"
                value={endpoint}
                onChange={(e) => onEndpointChange(e.target.value)}
                placeholder={t("aiservice.create.endpoint_placeholder")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("aiservice.create.auth_title")}</CardTitle>
          <CardDescription>{t("aiservice.create.auth_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="grid gap-2">
              <Label>{t("aiservice.create.auth_type")}</Label>
              <Select value={authType} onValueChange={onAuthTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder={t("aiservice.create.auth_type_placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="apiKey">apiKey</SelectItem>
                  <SelectItem value="bearer">bearer</SelectItem>
                  <SelectItem value="basic">basic</SelectItem>
                  <SelectItem value="custom">custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t("aiservice.create.auth_secret")}</Label>
              <Input
                value={authSecret}
                onChange={(e) => onAuthSecretChange(e.target.value)}
                placeholder={t("aiservice.create.auth_secret_placeholder")}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("aiservice.create.auth_key")}</Label>
              <Input
                value={authKey}
                onChange={(e) => onAuthKeyChange(e.target.value)}
                placeholder={t("aiservice.create.auth_key_placeholder")}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("aiservice.create.auth_header")}</Label>
              <Input
                value={authHeader}
                onChange={(e) => onAuthHeaderChange(e.target.value)}
                placeholder={t("aiservice.create.auth_header_placeholder")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("aiservice.create.settings_title")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label>{t("aiservice.create.timeout")}</Label>
              <Input
                value={timeout}
                onChange={(e) => onTimeoutChange(e.target.value)}
                placeholder={t("aiservice.create.timeout_placeholder")}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("aiservice.create.max_retries")}</Label>
              <Input
                type="number"
                min={0}
                value={maxRetries}
                onChange={(e) => onMaxRetriesChange(parseInt(e.target.value, 10) || 0)}
                placeholder="3"
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("aiservice.create.backoff")}</Label>
              <Input
                value={backoff}
                onChange={(e) => onBackoffChange(e.target.value)}
                placeholder={t("aiservice.create.backoff_placeholder")}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
