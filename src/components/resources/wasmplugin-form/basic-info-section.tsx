"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface WasmPluginBasicInfoProps {
  name: string;
  namespace: string;
  namespaces: string[];
  isEdit: boolean;
  onNameChange: (value: string) => void;
  onNamespaceChange: (value: string) => void;
}

export function WasmPluginBasicInfo({
  name,
  namespace,
  namespaces,
  isEdit,
  onNameChange,
  onNamespaceChange,
}: WasmPluginBasicInfoProps) {
  const t = useTranslations();
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("wasm.plugins.form.basic_info_title")}</CardTitle>
        <CardDescription>{t("wasm.plugins.form.basic_info_desc")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">{t("wasm.plugins.form.name")}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder={t("wasm.plugins.form.name_placeholder")}
              required
              disabled={isEdit}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="namespace">{t("wasm.plugins.form.namespace")}</Label>
            <Select value={namespace} onValueChange={onNamespaceChange} disabled={isEdit}>
              <SelectTrigger>
                <SelectValue placeholder={t("wasm.plugins.form.namespace_placeholder")} />
              </SelectTrigger>
              <SelectContent>
                {namespaces.map((ns) => (
                  <SelectItem key={ns} value={ns}>{ns}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
