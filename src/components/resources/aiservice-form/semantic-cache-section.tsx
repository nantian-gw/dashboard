"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export interface SemanticCacheSectionProps {
  cacheEnabled: boolean;
  onCacheEnabledChange: (v: boolean) => void;
  cacheTtl: string;
  onCacheTtlChange: (v: string) => void;
  cacheMaxTokens: number;
  onCacheMaxTokensChange: (v: number) => void;
}

export function SemanticCacheSection(props: SemanticCacheSectionProps) {
  const t = useTranslations();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{t("aiservice.create.cache_title")}</CardTitle>
            <CardDescription>{t("aiservice.create.cache_desc")}</CardDescription>
          </div>
          <Checkbox
            checked={props.cacheEnabled}
            onCheckedChange={props.onCacheEnabledChange}
          />
        </div>
      </CardHeader>
      {props.cacheEnabled && (
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t("aiservice.create.cache_ttl")}</Label>
              <Input
                value={props.cacheTtl}
                onChange={(e) => props.onCacheTtlChange(e.target.value)}
                placeholder="3600s"
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("aiservice.create.cache_max_tokens")}</Label>
              <Input
                type="number"
                min={0}
                value={props.cacheMaxTokens}
                onChange={(e) => props.onCacheMaxTokensChange(parseInt(e.target.value, 10) || 0)}
                placeholder="4096"
              />
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
