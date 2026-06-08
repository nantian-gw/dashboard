"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ModelSelectorProps {
  models: string[];
  selected: string;
  onSelect: (model: string) => void;
}

export function ModelSelector({ models, selected, onSelect }: ModelSelectorProps) {
  return (
    <Select value={selected} onValueChange={onSelect}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="All Models" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Models</SelectItem>
        {models.map((model) => (
          <SelectItem key={model} value={model}>
            {model}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}