"use client";

import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface PIIMaskingSectionProps {
  piiEnabled: boolean;
  onPiiEnabledChange: (v: boolean) => void;
  piiMode: string;
  onPiiModeChange: (v: string) => void;
  piiEntityTypes: string[];
  onPiiEntityTypesChange: (v: string[]) => void;
}

export function PIIMaskingSection(props: PIIMaskingSectionProps) {
  const t = useTranslations();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{t("aiservice.create.pii_title")}</CardTitle>
            <CardDescription>{t("aiservice.create.pii_desc")}</CardDescription>
          </div>
          <Checkbox
            checked={props.piiEnabled}
            onCheckedChange={props.onPiiEnabledChange}
          />
        </div>
      </CardHeader>
      {props.piiEnabled && (
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>{t("aiservice.create.pii_mode")}</Label>
            <Select value={props.piiMode} onValueChange={props.onPiiModeChange}>
              <SelectTrigger>
                <SelectValue placeholder={t("aiservice.create.pii_mode_placeholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mask">mask</SelectItem>
                <SelectItem value="redact">redact</SelectItem>
                <SelectItem value="anonymize">anonymize</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("aiservice.create.pii_entity_types")}</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "email", labelKey: "aiservice.create.pii_email" as const },
                { value: "phone", labelKey: "aiservice.create.pii_phone" as const },
                { value: "credit-card", labelKey: "aiservice.create.pii_credit_card" as const },
                { value: "id-card", labelKey: "aiservice.create.pii_id_card" as const },
                { value: "url", labelKey: "aiservice.create.pii_url" as const },
                { value: "ip", labelKey: "aiservice.create.pii_ip" as const },
              ].map((ent) => (
                <div key={ent.value} className="flex items-center gap-2">
                  <Checkbox
                    checked={props.piiEntityTypes.includes(ent.value)}
                    onCheckedChange={(checked) =>
                      props.onPiiEntityTypesChange(
                        checked
                          ? [...props.piiEntityTypes, ent.value]
                          : props.piiEntityTypes.filter((e) => e !== ent.value)
                      )
                    }
                  />
                  <Label className="font-normal">{t(ent.labelKey)}</Label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
