"use client";

import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export interface FallbackChainsSectionProps {
  fallbackEnabled: boolean;
  onFallbackEnabledChange: (v: boolean) => void;
  fallbackChains: string;
  onFallbackChainsChange: (v: string) => void;
}

export function FallbackChainsSection(props: FallbackChainsSectionProps) {
  const t = useTranslations();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{t("aiservice.create.fallback_title")}</CardTitle>
            <CardDescription>{t("aiservice.create.fallback_desc")}</CardDescription>
          </div>
          <Checkbox
            checked={props.fallbackEnabled}
            onCheckedChange={props.onFallbackEnabledChange}
          />
        </div>
      </CardHeader>
      {props.fallbackEnabled && (
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>{t("aiservice.create.fallback_chains")}</Label>
            <Textarea
              value={props.fallbackChains}
              onChange={(e) => props.onFallbackChainsChange(e.target.value)}
              placeholder='[{"primary": "gpt-4o", "fallbacks": [{"model": "claude-3", "timeout": true, "statusCodes": [429, 500]}]}]'
              rows={4}
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
}
