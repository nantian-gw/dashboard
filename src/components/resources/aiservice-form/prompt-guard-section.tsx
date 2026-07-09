"use client";

import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface PromptGuardSectionProps {
  guardEnabled: boolean;
  onGuardEnabledChange: (v: boolean) => void;
  guardMode: string;
  onGuardModeChange: (v: string) => void;
  guardPatterns: string;
  onGuardPatternsChange: (v: string) => void;
  guardKeywords: string;
  onGuardKeywordsChange: (v: string) => void;
}

export function PromptGuardSection(props: PromptGuardSectionProps) {
  const t = useTranslations();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{t("aiservice.create.guard_title")}</CardTitle>
            <CardDescription>{t("aiservice.create.guard_desc")}</CardDescription>
          </div>
          <Checkbox
            checked={props.guardEnabled}
            onCheckedChange={props.onGuardEnabledChange}
          />
        </div>
      </CardHeader>
      {props.guardEnabled && (
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>{t("aiservice.create.guard_mode")}</Label>
            <Select value={props.guardMode} onValueChange={props.onGuardModeChange}>
              <SelectTrigger>
                <SelectValue placeholder={t("aiservice.create.guard_mode_placeholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="block">block</SelectItem>
                <SelectItem value="warn">warn</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>{t("aiservice.create.guard_patterns")}</Label>
            <Textarea
              value={props.guardPatterns}
              onChange={(e) => props.onGuardPatternsChange(e.target.value)}
              placeholder="^DROP\s+TABLE|^DELETE\s+FROM"
              rows={3}
            />
          </div>
          <div className="grid gap-2">
            <Label>{t("aiservice.create.guard_keywords")}</Label>
            <Textarea
              value={props.guardKeywords}
              onChange={(e) => props.onGuardKeywordsChange(e.target.value)}
              placeholder="password\nsecret\napi_key"
              rows={3}
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
}
