"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface CostTrackingSectionProps {
  costTrackingEnabled: boolean;
  onCostTrackingEnabledChange: (v: boolean) => void;
  costInputPricePer1K: string;
  onCostInputPricePer1KChange: (v: string) => void;
  costOutputPricePer1K: string;
  onCostOutputPricePer1KChange: (v: string) => void;
  costCurrency: string;
  onCostCurrencyChange: (v: string) => void;
}

export function CostTrackingSection(props: CostTrackingSectionProps) {
  const t = useTranslations();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{t("aiservice.create.cost_title")}</CardTitle>
            <CardDescription>{t("aiservice.create.cost_desc")}</CardDescription>
          </div>
          <Checkbox
            checked={props.costTrackingEnabled}
            onCheckedChange={props.onCostTrackingEnabledChange}
          />
        </div>
      </CardHeader>
      {props.costTrackingEnabled && (
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label>{t("aiservice.create.cost_input_price")}</Label>
              <Input
                value={props.costInputPricePer1K}
                onChange={(e) => props.onCostInputPricePer1KChange(e.target.value)}
                placeholder="0.03"
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("aiservice.create.cost_output_price")}</Label>
              <Input
                value={props.costOutputPricePer1K}
                onChange={(e) => props.onCostOutputPricePer1KChange(e.target.value)}
                placeholder="0.06"
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("aiservice.create.cost_currency")}</Label>
              <Select value={props.costCurrency} onValueChange={props.onCostCurrencyChange}>
                <SelectTrigger>
                  <SelectValue placeholder={t("aiservice.create.cost_currency_placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="CNY">CNY</SelectItem>
                  <SelectItem value="JPY">JPY</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
