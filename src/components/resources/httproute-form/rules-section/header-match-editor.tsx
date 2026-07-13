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
import type { HeaderMatch } from "../../httproute-form";

interface HeaderMatchEditorProps {
  matches: HeaderMatch[];
  ruleIndex: number;
  t: ReturnType<typeof useTranslations>;
  onUpdate: (ruleIndex: number, patch: Partial<{ headerMatches: HeaderMatch[] }>) => void;
}

export function HeaderMatchEditor({
  matches,
  ruleIndex,
  t,
  onUpdate,
}: HeaderMatchEditorProps) {
  return (
    <div className="space-y-2">
      <Label className="text-xs">{t("create.route.header_matches")}</Label>
      {matches.map((headerMatch, headerIndex) => (
        <div key={headerIndex} className="flex items-center gap-1">
          <Select
            value={headerMatch.type}
            onValueChange={(type) =>
              onUpdate(ruleIndex, {
                headerMatches: matches.map((entry, entryIndex) =>
                  entryIndex === headerIndex
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
            className="h-8 w-24 text-xs"
            placeholder="name"
            value={headerMatch.name}
            onChange={(event) =>
              onUpdate(ruleIndex, {
                headerMatches: matches.map((entry, entryIndex) =>
                  entryIndex === headerIndex ? { ...entry, name: event.target.value } : entry
                ),
              })
            }
          />
          <Input
            className="h-8 w-24 text-xs"
            placeholder="value"
            value={headerMatch.value}
            onChange={(event) =>
              onUpdate(ruleIndex, {
                headerMatches: matches.map((entry, entryIndex) =>
                  entryIndex === headerIndex ? { ...entry, value: event.target.value } : entry
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
                headerMatches: matches.filter(
                  (_, entryIndex) => entryIndex !== headerIndex
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
            headerMatches: [
              ...matches,
              { type: "Exact", name: "", value: "" },
            ],
          })
        }
      >
        <Plus className="mr-1 h-3 w-3" /> Add Header Match
      </Button>
    </div>
  );
}
