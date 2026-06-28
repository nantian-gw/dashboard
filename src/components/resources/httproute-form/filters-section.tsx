"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import type { HeaderModifier, RuleFilter } from "../httproute-form";

export function emptyHeaderModifier(): HeaderModifier {
  return { set: [], add: [], remove: [] };
}

export function emptyFilter(): RuleFilter {
  return { type: "RequestHeaderModifier", config: emptyHeaderModifier() };
}

export function HeaderModifierSection({
  label,
  config,
  onChange,
  t,
}: {
  label: string;
  config: HeaderModifier;
  onChange: (next: HeaderModifier) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3 rounded-md border p-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-sm font-medium"
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {label}
      </button>
      {open ? (
        <div className="space-y-3 pl-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">{t("create.route.filter_set_headers")}</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  onChange({ ...config, set: [...config.set, { name: "", value: "" }] })
                }
              >
                <Plus className="mr-1 h-3 w-3" /> {t("create.route.add")}
              </Button>
            </div>
            {config.set.map((header, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  placeholder={t("create.route.header_name_placeholder")}
                  className="h-8 text-xs"
                  value={header.name}
                  onChange={(event) => {
                    const next = [...config.set];
                    next[index] = { ...next[index], name: event.target.value };
                    onChange({ ...config, set: next });
                  }}
                />
                <Input
                  placeholder={t("create.route.header_value_placeholder")}
                  className="h-8 text-xs"
                  value={header.value}
                  onChange={(event) => {
                    const next = [...config.set];
                    next[index] = { ...next[index], value: event.target.value };
                    onChange({ ...config, set: next });
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() =>
                    onChange({ ...config, set: config.set.filter((_, entryIndex) => entryIndex !== index) })
                  }
                >
                  <Trash2 className="h-3 w-3 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">{t("create.route.filter_add_headers")}</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  onChange({ ...config, add: [...config.add, { name: "", value: "" }] })
                }
              >
                <Plus className="mr-1 h-3 w-3" /> {t("create.route.add")}
              </Button>
            </div>
            {config.add.map((header, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  placeholder={t("create.route.header_name_placeholder")}
                  className="h-8 text-xs"
                  value={header.name}
                  onChange={(event) => {
                    const next = [...config.add];
                    next[index] = { ...next[index], name: event.target.value };
                    onChange({ ...config, add: next });
                  }}
                />
                <Input
                  placeholder={t("create.route.header_value_placeholder")}
                  className="h-8 text-xs"
                  value={header.value}
                  onChange={(event) => {
                    const next = [...config.add];
                    next[index] = { ...next[index], value: event.target.value };
                    onChange({ ...config, add: next });
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() =>
                    onChange({ ...config, add: config.add.filter((_, entryIndex) => entryIndex !== index) })
                  }
                >
                  <Trash2 className="h-3 w-3 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">{t("create.route.filter_remove_headers")}</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange({ ...config, remove: [...config.remove, ""] })}
              >
                <Plus className="mr-1 h-3 w-3" /> {t("create.route.add")}
              </Button>
            </div>
            {config.remove.map((header, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  placeholder={t("create.route.header_name_placeholder")}
                  className="h-8 flex-1 text-xs"
                  value={header}
                  onChange={(event) => {
                    const next = [...config.remove];
                    next[index] = event.target.value;
                    onChange({ ...config, remove: next });
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() =>
                    onChange({
                      ...config,
                      remove: config.remove.filter((_, entryIndex) => entryIndex !== index),
                    })
                  }
                >
                  <Trash2 className="h-3 w-3 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
