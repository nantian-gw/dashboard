"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Bot, User, FileText, GitCompare } from "lucide-react";
import type { ChatMessage } from "./page";

// ─── ChatBubble ─────────────────────────────────────────────────────────────

const ChatBubble = memo(function ChatBubble({
  msg,
}: {
  msg: ChatMessage;
}) {
  const isUser = msg.role === "user";

  return (
    <div
      className={cn(
        "flex gap-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>
      <div
        className={cn(
          "max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        )}
      >
        <p className="whitespace-pre-wrap break-words">
          {msg.content}
          {msg.isStreaming && (
            <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-full bg-current align-middle" />
          )}
        </p>
        {msg.manifests && (
          <div className="mt-2 flex items-center gap-1.5">
            <Badge
              variant="secondary"
              className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            >
              <FileText className="h-3 w-3" />
              Manifest
            </Badge>
          </div>
        )}
        {msg.diff && (
          <div className="mt-2 flex items-center gap-1.5">
            <Badge
              variant="secondary"
              className="gap-1 border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
            >
              <GitCompare className="h-3 w-3" />
              Diff + IR
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
});

// ─── ChatMessageList ────────────────────────────────────────────────────────

interface ChatMessageListProps {
  messages: ChatMessage[];
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

export const ChatMessageList = memo(function ChatMessageList({
  messages,
  scrollRef,
}: ChatMessageListProps) {
  const t = useTranslations();

  return (
    <div ref={scrollRef} className="flex-1 space-y-4 overflow-auto p-4">
      {messages.length === 0 && (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
          <Bot className="h-12 w-12 opacity-20" />
          <p className="text-sm">{t("chatbot.empty")}</p>
        </div>
      )}
      {messages.map((msg) => (
        <ChatBubble key={msg.id} msg={msg} />
      ))}
    </div>
  );
});
