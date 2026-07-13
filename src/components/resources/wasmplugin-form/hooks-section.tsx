"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const HOOK_OPTIONS = ["onRequest", "onResponse", "onStreamChunk"];

interface WasmPluginHooksProps {
  hooks: string[];
  onToggle: (hook: string) => void;
}

export function WasmPluginHooks({ hooks, onToggle }: WasmPluginHooksProps) {
  const t = useTranslations();
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("wasm.plugins.form.hooks_title")}</CardTitle>
        <CardDescription>{t("wasm.plugins.form.hooks_desc")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {HOOK_OPTIONS.map((hook) => {
          const selected = hooks.includes(hook);
          return (
            <Button
              key={hook}
              type="button"
              variant={selected ? "default" : "outline"}
              size="sm"
              onClick={() => onToggle(hook)}
            >
              {hook}
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}
