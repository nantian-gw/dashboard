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
import type { BackendRef } from "../../shared-types";

interface BackendRefsEditorProps {
  backends: BackendRef[];
  namespaces: string[];
  ruleIndex: number;
  t: ReturnType<typeof useTranslations>;
  onUpdateBackend: (ruleIndex: number, backendIndex: number, field: "name" | "namespace" | "port" | "weight", value: string | number) => void;
  onAddBackend: (ruleIndex: number) => void;
  onRemoveBackend: (ruleIndex: number, backendIndex: number) => void;
}

export function BackendRefsEditor({
  backends,
  namespaces,
  ruleIndex,
  t,
  onUpdateBackend,
  onAddBackend,
  onRemoveBackend,
}: BackendRefsEditorProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{t("create.route.backend_refs")}</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => onAddBackend(ruleIndex)}
        >
          <Plus className="mr-1 h-3 w-3" /> {t("create.route.add_backend")}
        </Button>
      </div>
      {backends.map((backend, backendIndex) => (
        <div key={backendIndex} className="flex items-center gap-2">
          <Input
            className="h-8 w-36 text-xs"
            placeholder="Service name"
            value={backend.name}
            onChange={(event) =>
              onUpdateBackend(ruleIndex, backendIndex, "name", event.target.value)
            }
          />
          <Select
            value={backend.namespace}
            onValueChange={(namespace) =>
              onUpdateBackend(ruleIndex, backendIndex, "namespace", namespace)
            }
          >
            <SelectTrigger className="h-8 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {namespaces.map((namespace) => (
                <SelectItem key={namespace} value={namespace}>
                  {namespace}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            className="h-8 w-20 text-xs"
            type="number"
            placeholder="Port"
            value={backend.port}
            onChange={(event) =>
              onUpdateBackend(
                ruleIndex,
                backendIndex,
                "port",
                parseInt(event.target.value, 10) || 0
              )
            }
          />
          <Input
            className="h-8 w-20 text-xs"
            type="number"
            placeholder="Weight"
            value={backend.weight}
            onChange={(event) =>
              onUpdateBackend(
                ruleIndex,
                backendIndex,
                "weight",
                parseInt(event.target.value, 10) || 0
              )
            }
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => onRemoveBackend(ruleIndex, backendIndex)}
          >
            <Trash2 className="h-3 w-3 text-red-500" />
          </Button>
        </div>
      ))}
    </div>
  );
}
