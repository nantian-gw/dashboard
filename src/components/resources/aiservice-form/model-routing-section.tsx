"use client";

import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export interface AIServiceModelRoutingProps {
  routingEnabled: boolean;
  onRoutingEnabledChange: (v: boolean) => void;
  routingComplexityThresholds: string;
  onRoutingComplexityThresholdsChange: (v: string) => void;
  routingModelOverrides: string;
  onRoutingModelOverridesChange: (v: string) => void;
}

export function AIServiceModelRouting(props: AIServiceModelRoutingProps) {
  const t = useTranslations();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{t("aiservice.create.routing_title")}</CardTitle>
            <CardDescription>{t("aiservice.create.routing_desc")}</CardDescription>
          </div>
          <Checkbox
            checked={props.routingEnabled}
            onCheckedChange={props.onRoutingEnabledChange}
          />
        </div>
      </CardHeader>
      {props.routingEnabled && (
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>{t("aiservice.create.routing_thresholds")}</Label>
            <Textarea
              value={props.routingComplexityThresholds}
              onChange={(e) => props.onRoutingComplexityThresholdsChange(e.target.value)}
              placeholder='{"simple": 100, "medium": 500}'
              rows={2}
            />
          </div>
          <div className="grid gap-2">
            <Label>{t("aiservice.create.routing_overrides")}</Label>
            <Textarea
              value={props.routingModelOverrides}
              onChange={(e) => props.onRoutingModelOverridesChange(e.target.value)}
              placeholder='{"simple": "gpt-4o-mini", "medium": "gpt-4o", "complex": "o1"}'
              rows={3}
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
}
