"use client";

import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export interface ContentSafetySectionProps {
  safetyEnabled: boolean;
  onSafetyEnabledChange: (v: boolean) => void;
  safetyBlockMode: boolean;
  onSafetyBlockModeChange: (v: boolean) => void;
  safetyCategories: string[];
  onSafetyCategoriesChange: (v: string[]) => void;
}

export function ContentSafetySection(props: ContentSafetySectionProps) {
  const t = useTranslations();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{t("aiservice.create.safety_title")}</CardTitle>
            <CardDescription>{t("aiservice.create.safety_desc")}</CardDescription>
          </div>
          <Checkbox
            checked={props.safetyEnabled}
            onCheckedChange={props.onSafetyEnabledChange}
          />
        </div>
      </CardHeader>
      {props.safetyEnabled && (
        <CardContent className="grid gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={props.safetyBlockMode}
              onCheckedChange={props.onSafetyBlockModeChange}
            />
            <Label>{t("aiservice.create.safety_block_mode")}</Label>
          </div>
          <div className="space-y-2">
            <Label>{t("aiservice.create.safety_categories")}</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "violence", labelKey: "aiservice.create.safety_violence" as const },
                { value: "hate", labelKey: "aiservice.create.safety_hate" as const },
                { value: "self_harm", labelKey: "aiservice.create.safety_self_harm" as const },
                { value: "exploitation", labelKey: "aiservice.create.safety_exploitation" as const },
                { value: "illegal", labelKey: "aiservice.create.safety_illegal" as const },
              ].map((cat) => (
                <div key={cat.value} className="flex items-center gap-2">
                  <Checkbox
                    checked={props.safetyCategories.includes(cat.value)}
                    onCheckedChange={(checked) =>
                      props.onSafetyCategoriesChange(
                        checked
                          ? [...props.safetyCategories, cat.value]
                          : props.safetyCategories.filter((c) => c !== cat.value)
                      )
                    }
                  />
                  <Label className="font-normal">{t(cat.labelKey)}</Label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
