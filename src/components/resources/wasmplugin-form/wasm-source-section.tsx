"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface WasmPluginWasmSourceProps {
  wasmSourceType: "url" | "configMap" | "inline";
  wasmUrl: string;
  wasmConfigMapName: string;
  wasmConfigMapKey: string;
  wasmInline: string;
  wasmSha256: string;
  onSourceTypeChange: (value: "url" | "configMap" | "inline") => void;
  onWasmUrlChange: (value: string) => void;
  onConfigMapNameChange: (value: string) => void;
  onConfigMapKeyChange: (value: string) => void;
  onWasmInlineChange: (value: string) => void;
  onWasmSha256Change: (value: string) => void;
}

export function WasmPluginWasmSource({
  wasmSourceType,
  wasmUrl,
  wasmConfigMapName,
  wasmConfigMapKey,
  wasmInline,
  wasmSha256,
  onSourceTypeChange,
  onWasmUrlChange,
  onConfigMapNameChange,
  onConfigMapKeyChange,
  onWasmInlineChange,
  onWasmSha256Change,
}: WasmPluginWasmSourceProps) {
  const t = useTranslations();
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("wasm.plugins.form.wasm_source_title")}</CardTitle>
        <CardDescription>{t("wasm.plugins.form.wasm_source_desc")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label>{t("wasm.plugins.form.source_type")}</Label>
          <Select value={wasmSourceType} onValueChange={(v) => onSourceTypeChange(v as "url" | "configMap" | "inline")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="url">{t("wasm.plugins.form.source_type_url")}</SelectItem>
              <SelectItem value="configMap">{t("wasm.plugins.form.source_type_configmap")}</SelectItem>
              <SelectItem value="inline">{t("wasm.plugins.form.source_type_inline")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {wasmSourceType === "url" && (
          <div className="grid gap-2">
            <Label htmlFor="wasmUrl">{t("wasm.plugins.form.wasm_url")}</Label>
            <Input
              id="wasmUrl"
              value={wasmUrl}
              onChange={(e) => onWasmUrlChange(e.target.value)}
              placeholder="https://example.com/plugin.wasm"
            />
          </div>
        )}

        {wasmSourceType === "configMap" && (
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="cm-name">{t("wasm.plugins.form.configmap_name")}</Label>
              <Input
                id="cm-name"
                value={wasmConfigMapName}
                onChange={(e) => onConfigMapNameChange(e.target.value)}
                placeholder="my-wasm-plugin"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cm-key">{t("wasm.plugins.form.configmap_key")}</Label>
              <Input
                id="cm-key"
                value={wasmConfigMapKey}
                onChange={(e) => onConfigMapKeyChange(e.target.value)}
                placeholder="plugin.wasm"
              />
            </div>
          </div>
        )}

        {wasmSourceType === "inline" && (
          <div className="grid gap-2">
            <Label htmlFor="wasmInline">{t("wasm.plugins.form.inline")}</Label>
            <Textarea
              id="wasmInline"
              value={wasmInline}
              onChange={(e) => onWasmInlineChange(e.target.value)}
              placeholder={t("wasm.plugins.form.inline_placeholder")}
              rows={4}
            />
          </div>
        )}

        <div className="grid gap-2">
          <Label htmlFor="wasmSha256">{t("wasm.plugins.form.sha256")}</Label>
          <Input
            id="wasmSha256"
            value={wasmSha256}
            onChange={(e) => onWasmSha256Change(e.target.value)}
            placeholder={t("wasm.plugins.form.sha256_placeholder")}
          />
        </div>
      </CardContent>
    </Card>
  );
}
