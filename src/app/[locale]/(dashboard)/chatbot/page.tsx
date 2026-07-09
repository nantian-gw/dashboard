"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Bot, Loader2, Trash2 } from "lucide-react";
import { useChatStream } from "./use-chat-stream";
import { ChatMessageList } from "./chat-message-list";
import { ChatInput } from "./chat-input";
import { RightPanel } from "./right-panel";

// ─── Type Definitions ───────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  manifests?: string;
  diff?: string;
  ir?: string;
  isStreaming?: boolean;
}

export type StreamEvent =
  | { type: "text"; content: string }
  | { type: "manifests"; content: string }
  | { type: "diff"; content: string }
  | { type: "ir"; content: string }
  | { type: "status"; status: string };

// ─── Page ───────────────────────────────────────────────────────────────────

export default function ChatbotPage() {
  const t = useTranslations();
  const {
    messages,
    streaming,
    activeManifests,
    activeDiff,
    activeIR,
    sendMessage,
    clearMessages,
  } = useChatStream();

  const [input, setInput] = useState("");
  const [rightPanel, setRightPanel] = useState<"manifest" | "diffir">(
    "manifest"
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Auto-scroll ────────────────────────────────────────────────────────

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // ── Send message ───────────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    const content = input.trim();
    if (!content || streaming) return;
    setInput("");
    await sendMessage(content);
  }, [input, streaming, sendMessage]);

  // ── Clear chat ─────────────────────────────────────────────────────────

  const handleClear = () => {
    clearMessages();
    setRightPanel("manifest");
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold">{t("pages.chatbot.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("pages.chatbot.subtitle")}
        </p>
      </div>
      <div className="grid h-[calc(95vh-8.5rem)] gap-4 lg:grid-cols-[1fr_380px]">
        {/* ── Left Column: Chat Window ───────────────────────────────────── */}
        <Card className="flex flex-col overflow-hidden">
          <CardHeader className="flex shrink-0 flex-row items-center justify-between space-y-0 px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Bot className="h-4 w-4" />
              {t("chatbot.title")}
            </CardTitle>
            <div className="flex items-center gap-1">
              {streaming && (
                <Badge
                  variant="secondary"
                  className="animate-pulse gap-1.5 border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                >
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {t("chatbot.streaming")}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleClear}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <Separator />
          <ChatMessageList messages={messages} scrollRef={scrollRef} />
          <Separator />
          <div className="shrink-0 p-3">
            <ChatInput
              value={input}
              onChange={setInput}
              onSend={handleSend}
              streaming={streaming}
              inputRef={inputRef}
            />
          </div>
        </Card>

        {/* ── Right Column: Context Panel ────────────────────────── */}
        <RightPanel
          activeManifests={activeManifests}
          activeDiff={activeDiff}
          activeIR={activeIR}
          rightPanel={rightPanel}
          onToggle={setRightPanel}
        />
      </div>
    </div>
  );
}
