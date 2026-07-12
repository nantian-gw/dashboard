"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { readCsrfTokenFromCookies } from "@/lib/api";
import type { ChatMessage, StreamEvent } from "./page";

// ─── Helpers ────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 11);
}

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

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useChatStream() {
  const t = useTranslations();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [activeManifests, setActiveManifests] = useState<string>();
  const [activeDiff, setActiveDiff] = useState<string>();
  const [activeIR, setActiveIR] = useState<string>();

  const sendMessage = useCallback(
    async (content: string) => {
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
      setStreaming(true);

      try {
        const csrfToken = readCsrfTokenFromCookies();
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (csrfToken) headers["x-csrf-token"] = csrfToken;

        const res = await fetch("/api/chatbot/chat", {
          method: "POST",
          headers,
          credentials: "include",
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
            } else if (event.type === "diff") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id
                    ? { ...m, diff: event.content as string }
                    : m
                )
              );
              setActiveDiff(event.content as string);
            } else if (event.type === "ir") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id
                    ? { ...m, ir: event.content as string }
                    : m
                )
              );
              setActiveIR(event.content as string);
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
              ? {
                  ...m,
                  content: t("chatbot.error.unavailable"),
                  isStreaming: false,
                }
              : m
          )
        );
      } finally {
        setStreaming(false);
      }
    },
    [streaming, t]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setActiveManifests(undefined);
    setActiveDiff(undefined);
    setActiveIR(undefined);
  }, []);

  return {
    messages,
    streaming,
    activeManifests,
    activeDiff,
    activeIR,
    sendMessage,
    clearMessages,
  };
}
