"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export interface ABTestingSectionProps {
  abTestingEnabled: boolean;
  onAbTestingEnabledChange: (v: boolean) => void;
  abTestingExperimentId: string;
  onAbTestingExperimentIdChange: (v: string) => void;
  abTestingVariants: string;
  onAbTestingVariantsChange: (v: string) => void;
}

export function ABTestingSection(props: ABTestingSectionProps) {
  const t = useTranslations();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{t("aiservice.create.ab_testing_title")}</CardTitle>
            <CardDescription>{t("aiservice.create.ab_testing_desc")}</CardDescription>
          </div>
          <Checkbox
            checked={props.abTestingEnabled}
            onCheckedChange={props.onAbTestingEnabledChange}
          />
        </div>
      </CardHeader>
      {props.abTestingEnabled && (
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>{t("aiservice.create.ab_testing_experiment_id")}</Label>
            <Input
              value={props.abTestingExperimentId}
              onChange={(e) => props.onAbTestingExperimentIdChange(e.target.value)}
              placeholder="exp-001"
            />
          </div>
          <div className="grid gap-2">
            <Label>{t("aiservice.create.ab_testing_variants")}</Label>
            <Textarea
              value={props.abTestingVariants}
              onChange={(e) => props.onAbTestingVariantsChange(e.target.value)}
              placeholder='[{"name": "A", "model": "gpt-4o", "weight": 50}, {"name": "B", "model": "claude-3", "weight": 50}]'
              rows={4}
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
}
