"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import type { QueryParamMatch } from "../../httproute-form";

interface QueryParamEditorProps {
  matches: QueryParamMatch[];
  ruleIndex: number;
  t: ReturnType<typeof useTranslations>;
  onUpdate: (ruleIndex: number, patch: Partial<{ queryParamMatches: QueryParamMatch[] }>) => void;
}

export function QueryParamEditor({
  matches,
  ruleIndex,
  t,
  onUpdate,
}: QueryParamEditorProps) {
  return (
    <div className="space-y-2">
      <Label className="text-xs">{t("create.route.query_param_matches")}</Label>
      {matches.map((queryParamMatch, queryParamIndex) => (
        <div key={queryParamIndex} className="flex items-center gap-1">
          <Select
            value={queryParamMatch.type}
            onValueChange={(type) =>
              onUpdate(ruleIndex, {
                queryParamMatches: matches.map((entry, entryIndex) =>
                  entryIndex === queryParamIndex
                    ? { ...entry, type: type as "Exact" | "RegularExpression" }
                    : entry
                ),
              })
            }
          >
            <SelectTrigger className="h-8 w-24 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Exact">Exact</SelectItem>
              <SelectItem value="RegularExpression">Regex</SelectItem>
            </SelectContent>
          </Select>
          <Input
            className="h-8 w-20 text-xs"
            placeholder="name"
            value={queryParamMatch.name}
            onChange={(event) =>
              onUpdate(ruleIndex, {
                queryParamMatches: matches.map((entry, entryIndex) =>
                  entryIndex === queryParamIndex ? { ...entry, name: event.target.value } : entry
                ),
              })
            }
          />
          <Input
            className="h-8 w-20 text-xs"
            placeholder="value"
            value={queryParamMatch.value}
            onChange={(event) =>
              onUpdate(ruleIndex, {
                queryParamMatches: matches.map((entry, entryIndex) =>
                  entryIndex === queryParamIndex ? { ...entry, value: event.target.value } : entry
                ),
              })
            }
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() =>
              onUpdate(ruleIndex, {
                queryParamMatches: matches.filter(
                  (_, entryIndex) => entryIndex !== queryParamIndex
                ),
              })
            }
          >
            <Trash2 className="h-3 w-3 text-red-500" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 text-xs"
        onClick={() =>
          onUpdate(ruleIndex, {
            queryParamMatches: [
              ...matches,
              { type: "Exact", name: "", value: "" },
            ],
          })
        }
      >
        <Plus className="mr-1 h-3 w-3" /> Add Query Param
      </Button>
    </div>
  );
}
