"use client";

import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/api";
import type { Message, SourceReference, StreamEvent } from "@/lib/types";

const SESSION_STORAGE_KEY = "research-rag-session-id";

function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function parseSseEvents(buffer: string): { events: StreamEvent[]; remainder: string } {
  const parts = buffer.split("\n\n");
  const remainder = parts.pop() ?? "";
  const events: StreamEvent[] = [];

  for (const part of parts) {
    const dataLines = part
      .split("\n")
      .filter((line) => line.startsWith("data: "))
      .map((line) => line.slice(6));

    if (!dataLines.length) {
      continue;
    }

    try {
      events.push(JSON.parse(dataLines.join("\n")) as StreamEvent);
    } catch {
      events.push({ type: "error", message: "Received invalid stream data" });
    }
  }

  return { events, remainder };
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [activeSources, setActiveSources] = useState<SourceReference[]>([]);
  const [selectedSource, setSelectedSource] = useState<SourceReference | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) {
        try {
          const session = await api.getSession(stored);
          if (!cancelled) {
            setSessionId(session.session_id);
            setMessages(
              session.messages
                .filter((message) => message.role === "user" || message.role === "assistant")
                .map((message) => ({
                  id: createId(),
                  role: message.role as "user" | "assistant",
                  content: message.content,
                  timestamp: new Date(session.last_active),
                })),
            );
            return;
          }
        } catch {
          localStorage.removeItem(SESSION_STORAGE_KEY);
        }
      }

      const session = await api.createSession();
      if (!cancelled) {
        setSessionId(session.session_id);
        localStorage.setItem(SESSION_STORAGE_KEY, session.session_id);
      }
    }

    void loadSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateAssistant = useCallback(
    (
      assistantId: string,
      updater: (message: Message) => Message,
    ) => {
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId ? updater(message) : message,
        ),
      );
    },
    [],
  );

  const sendMessage = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed || isLoading) {
        return;
      }

      const userMessage: Message = {
        id: createId(),
        role: "user",
        content: trimmed,
        timestamp: new Date(),
      };
      const assistantId = createId();
      const assistantMessage: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        sources: [],
        isStreaming: true,
        timestamp: new Date(),
      };

      setMessages((current) => [...current, userMessage, assistantMessage]);
      setIsLoading(true);

      try {
        const stream = await api.chatStream(
          trimmed,
          messages,
          selectedFile,
          sessionId,
        );
        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const parsed = parseSseEvents(buffer);
          buffer = parsed.remainder;

          for (const event of parsed.events) {
            if (event.type === "token") {
              updateAssistant(assistantId, (message) => ({
                ...message,
                content: message.content + event.content,
              }));
            } else if (event.type === "sources") {
              setActiveSources(event.sources);
              setSelectedSource(event.sources[0] ?? null);
              updateAssistant(assistantId, (message) => ({
                ...message,
                sources: event.sources,
              }));
            } else if (event.type === "done") {
              updateAssistant(assistantId, (message) => ({
                ...message,
                isStreaming: false,
              }));
            } else if (event.type === "error") {
              updateAssistant(assistantId, (message) => ({
                ...message,
                content: message.content || event.message,
                isStreaming: false,
              }));
            }
          }
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Cannot connect to backend";
        updateAssistant(assistantId, (assistant) => ({
          ...assistant,
          content: message,
          isStreaming: false,
        }));
      } finally {
        updateAssistant(assistantId, (message) => ({
          ...message,
          isStreaming: false,
        }));
        setIsLoading(false);
      }
    },
    [isLoading, messages, selectedFile, sessionId, updateAssistant],
  );

  const clearHistory = useCallback(() => {
    if (sessionId) {
      void api.deleteSession(sessionId);
    }
    void api.createSession().then((session) => {
      setSessionId(session.session_id);
      localStorage.setItem(SESSION_STORAGE_KEY, session.session_id);
    });
    setMessages([]);
    setActiveSources([]);
    setSelectedSource(null);
  }, [sessionId]);

  return {
    messages,
    isLoading,
    sendMessage,
    clearHistory,
    selectedFile,
    setSelectedFile,
    activeSources,
    setActiveSources,
    selectedSource,
    setSelectedSource,
    sessionId,
  };
}
