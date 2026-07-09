"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export interface MultiTenantSectionProps {
  multiTenantEnabled: boolean;
  onMultiTenantEnabledChange: (v: boolean) => void;
  multiTenantId: string;
  onMultiTenantIdChange: (v: string) => void;
  multiTenantAllowedModels: string;
  onMultiTenantAllowedModelsChange: (v: string) => void;
  multiTenantCostLimit: string;
  onMultiTenantCostLimitChange: (v: string) => void;
}

export function MultiTenantSection(props: MultiTenantSectionProps) {
  const t = useTranslations();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{t("aiservice.create.multi_tenant_title")}</CardTitle>
            <CardDescription>{t("aiservice.create.multi_tenant_desc")}</CardDescription>
          </div>
          <Checkbox
            checked={props.multiTenantEnabled}
            onCheckedChange={props.onMultiTenantEnabledChange}
          />
        </div>
      </CardHeader>
      {props.multiTenantEnabled && (
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t("aiservice.create.multi_tenant_id")}</Label>
              <Input
                value={props.multiTenantId}
                onChange={(e) => props.onMultiTenantIdChange(e.target.value)}
                placeholder="tenant-001"
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("aiservice.create.multi_tenant_cost_limit")}</Label>
              <Input
                value={props.multiTenantCostLimit}
                onChange={(e) => props.onMultiTenantCostLimitChange(e.target.value)}
                placeholder="1000"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>{t("aiservice.create.multi_tenant_models")}</Label>
            <Input
              value={props.multiTenantAllowedModels}
              onChange={(e) => props.onMultiTenantAllowedModelsChange(e.target.value)}
              placeholder="gpt-4o,claude-3,gemini-pro"
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
}
