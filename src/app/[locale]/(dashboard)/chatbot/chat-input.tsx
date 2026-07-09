"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";

interface ChatInputProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  streaming: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  streaming,
  inputRef,
}: ChatInputProps) {
  const t = useTranslations();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="flex items-end gap-2">
      <Textarea
        ref={inputRef}
        placeholder={t("chatbot.placeholder")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={streaming}
        rows={2}
        className="min-h-0 resize-none text-sm"
      />
      <Button
        size="icon"
        onClick={onSend}
        disabled={!value.trim() || streaming}
        className="h-9 w-9 shrink-0"
      >
        {streaming ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
