"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Bot,
  Send,
  FileText,
  GitCompare,
  Network,
  CheckCircle,
  User,
  Loader2,
  Trash2,
  Zap,
} from "lucide-react";

// ─── Type Definitions ───────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  manifests?: string;
  diff?: string;
  ir?: string;
  isStreaming?: boolean;
}

type StreamEvent =
  | { type: "text"; content: string }
  | { type: "manifests"; content: string }
  | { type: "diff"; content: string }
  | { type: "ir"; content: string }
  | { type: "status"; status: string };

// ─── SSE Stream Parse Helpers ───────────────────────────────────────────────

function parseSSELine(line: string): StreamEvent | null {
  if (!line.startsWith("data: ")) return null;
  const data = line.slice(6).trim();
  if (!data || data === "[DONE]") return null;
  try {
    const parsed = JSON.parse(data);
    if (parsed.text) return { type: "text", content: parsed.text };
    if (parsed.manifests)
      return { type: "manifests", content: parsed.manifests };
    if (parsed.diff) return { type: "diff", content: parsed.diff };
    if (parsed.ir) return { type: "ir", content: parsed.ir };
    if (parsed.status) return { type: "status", status: parsed.status };
    return null;
  } catch {
    return { type: "text", content: data };
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 11);
}

// ─── Components ─────────────────────────────────────────────────────────────

function ManifestTab({ manifests }: { manifests?: string }) {
  const t = useTranslations();
  if (!manifests) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
        <FileText className="h-8 w-8 opacity-40" />
        <p className="text-sm">{t("chatbot.manifest.empty")}</p>
      </div>
    );
  }

  const handleApply = async () => {
    try {
      const res = await fetch("/api/controlplane/v1/resources", {
        method: "POST",
        headers: { "Content-Type": "application/yaml" },
        body: manifests,
      });
      if (!res.ok) throw new Error(`Apply failed: ${res.status}`);
    } catch {}
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <Badge variant="outline" className="gap-1 text-xs">
          <CheckCircle className="h-3 w-3 text-emerald-500" />
          {t("chatbot.manifest.valid")}
        </Badge>
        <Button size="sm" onClick={handleApply}>
          <Zap className="mr-1.5 h-3.5 w-3.5" />
          {t("chatbot.manifest.apply")}
        </Button>
      </div>
      <pre className="flex-1 overflow-auto rounded-lg border bg-muted/50 p-3 text-xs leading-relaxed text-foreground/80">
        <code>{manifests}</code>
      </pre>
    </div>
  );
}

function DiffIRTab({ diff, ir }: { diff?: string; ir?: string }) {
  const t = useTranslations();

  if (!diff && !ir) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
        <GitCompare className="h-8 w-8 opacity-40" />
        <p className="text-sm">{t("chatbot.diffir.empty")}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {diff && (
        <div className="flex-1 overflow-hidden">
          <div className="mb-2 flex items-center gap-2">
            <GitCompare className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs font-medium">
              {t("chatbot.diffir.diff")}
            </span>
          </div>
          <pre className="h-[calc(100%-1.75rem)] overflow-auto rounded-lg border bg-muted/50 p-3 text-xs leading-relaxed">
            <code>{diff}</code>
          </pre>
        </div>
      )}
      {ir && (
        <div className="flex-1 overflow-hidden">
          <div className="mb-2 flex items-center gap-2">
            <Network className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-xs font-medium">
              {t("chatbot.diffir.ir")}
            </span>
          </div>
          <pre className="h-[calc(100%-1.75rem)] overflow-auto rounded-lg border bg-muted/50 p-3 text-xs leading-relaxed">
            <code>{ir}</code>
          </pre>
        </div>
      )}
    </div>
  );
}

function ChatBubble({
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
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function ChatbotPage() {
  const t = useTranslations();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold">{t("pages.chatbot.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("pages.chatbot.subtitle")}
        </p>
      </div>
      <ChatbotClient />
    </div>
  );
}

function ChatbotClient() {
  const t = useTranslations();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [activeManifests, setActiveManifests] = useState<string>();
  const [activeDiff, setActiveDiff] = useState<string>();
  const [activeIR, setActiveIR] = useState<string>();
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

  const sendMessage = useCallback(async () => {
    const content = input.trim();
    if (!content || streaming) return;

    const userMsg: ChatMessage = {
      id: uid(),
      role: "user",
      content,
    };
    const assistantMsg: ChatMessage = {
      id: uid(),
      role: "assistant",
      content: "",
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setStreaming(true);

    try {
      const res = await fetch("/api/chatbot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: content }),
      });

      if (!res.ok || !res.body) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? {
                  ...m,
                  content: t("chatbot.error.stream"),
                  isStreaming: false,
                }
              : m
          )
        );
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const event = parseSSELine(line);
          if (!event) continue;

          if (event.type === "text") {
            accumulated += event.content;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsg.id
                  ? { ...m, content: accumulated }
                  : m
              )
            );
          } else if (event.type === "manifests") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsg.id
                  ? { ...m, manifests: event.content as string }
                  : m
              )
            );
            setActiveManifests(event.content as string);
            setRightPanel("manifest");
          } else if (event.type === "diff") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsg.id
                  ? { ...m, diff: event.content as string }
                  : m
              )
            );
            setActiveDiff(event.content as string);
            setRightPanel("diffir");
          } else if (event.type === "ir") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsg.id
                  ? { ...m, ir: event.content as string }
                  : m
              )
            );
            setActiveIR(event.content as string);
            setRightPanel("diffir");
          }
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsg.id ? { ...m, isStreaming: false } : m
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsg.id
            ? { ...m, content: t("chatbot.error.unavailable"), isStreaming: false }
            : m
        )
      );
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, t]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setActiveManifests(undefined);
    setActiveDiff(undefined);
    setActiveIR(undefined);
    setRightPanel("manifest");
  };

  return (
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
              onClick={clearChat}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>
        <Separator />
        <CardContent
          ref={scrollRef}
          className="flex-1 space-y-4 overflow-auto p-4"
        >
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
              <Bot className="h-12 w-12 opacity-20" />
              <p className="text-sm">{t("chatbot.empty")}</p>
            </div>
          )}
          {messages.map((msg) => (
            <ChatBubble key={msg.id} msg={msg} />
          ))}
        </CardContent>
        <Separator />
        <div className="shrink-0 p-3">
          <div className="flex items-end gap-2">
            <Textarea
              ref={inputRef}
              placeholder={t("chatbot.placeholder")}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={streaming}
              rows={2}
              className="min-h-0 resize-none text-sm"
            />
            <Button
              size="icon"
              onClick={sendMessage}
              disabled={!input.trim() || streaming}
              className="h-9 w-9 shrink-0"
            >
              {streaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* ── Right Column: Context Panel ────────────────────────── */}
      <Card className="flex flex-col overflow-hidden">
        <Tabs
          value={rightPanel}
          onValueChange={(v) => setRightPanel(v as typeof rightPanel)}
          className="flex h-full flex-col"
        >
          <CardHeader className="shrink-0 space-y-0 px-3 py-2">
            <TabsList className="w-full">
              <TabsTrigger value="manifest" className="flex-1 gap-1.5 text-xs">
                <FileText className="h-3.5 w-3.5" />
                {t("chatbot.tabs.manifest")}
              </TabsTrigger>
              <TabsTrigger value="diffir" className="flex-1 gap-1.5 text-xs">
                <GitCompare className="h-3.5 w-3.5" />
                {t("chatbot.tabs.diffir")}
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          <Separator />
          <CardContent className="flex-1 overflow-auto p-4">
            <TabsContent value="manifest" className="mt-0 h-full">
              <ManifestTab manifests={activeManifests} />
            </TabsContent>
            <TabsContent value="diffir" className="mt-0 h-full">
              <DiffIRTab diff={activeDiff} ir={activeIR} />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}