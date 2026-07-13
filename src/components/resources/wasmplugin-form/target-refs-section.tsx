"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
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

interface TargetRef {
  group: string;
  kind: string;
  name: string;
}

interface WasmPluginTargetRefsProps {
  targetRefs: TargetRef[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, field: string, value: string) => void;
}

export function WasmPluginTargetRefs({
  targetRefs,
  onAdd,
  onRemove,
  onUpdate,
}: WasmPluginTargetRefsProps) {
  const t = useTranslations();
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("wasm.plugins.form.target_title")}</CardTitle>
        <CardDescription>{t("wasm.plugins.form.target_desc")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {targetRefs.map((ref, idx) => (
          <div key={idx} className="flex items-end gap-4">
            <div className="grid gap-2 flex-1">
              <Label className="text-xs">{t("wasm.plugins.form.target_group")}</Label>
              <Input
                value={ref.group}
                onChange={(e) => onUpdate(idx, "group", e.target.value)}
                placeholder={t("wasm.plugins.form.target_group_placeholder")}
              />
            </div>
            <div className="grid gap-2 flex-1">
              <Label className="text-xs">{t("wasm.plugins.form.target_kind")}</Label>
              <Select value={ref.kind} onValueChange={(v) => onUpdate(idx, "kind", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Service">Service</SelectItem>
                  <SelectItem value="HTTPRoute">HTTPRoute</SelectItem>
                  <SelectItem value="GRPCRoute">GRPCRoute</SelectItem>
                  <SelectItem value="Gateway">Gateway</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 flex-1">
              <Label className="text-xs">{t("wasm.plugins.form.target_name")}</Label>
              <Input
                value={ref.name}
                onChange={(e) => onUpdate(idx, "name", e.target.value)}
                placeholder={t("wasm.plugins.form.target_name_placeholder")}
              />
            </div>
            <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => onRemove(idx)}>
              <span className="text-red-500 text-lg">&times;</span>
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          + {t("wasm.plugins.form.add_target")}
        </Button>
      </CardContent>
    </Card>
  );
}
