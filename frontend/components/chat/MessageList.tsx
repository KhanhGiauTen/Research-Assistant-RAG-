"use client";

import { useEffect, useRef } from "react";

import { MessageBubble } from "@/components/chat/MessageBubble";
import type { Message, SourceReference } from "@/lib/types";

interface MessageListProps {
  messages: Message[];
  onShowSources: (sources: SourceReference[]) => void;
  onSelectSource: (source: SourceReference) => void;
}

export function MessageList({
  messages,
  onSelectSource,
  onShowSources,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!messages.length) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center">
        <div>
          <h2 className="text-2xl font-semibold">Start with a research question</h2>
          <p className="mt-2 max-w-md text-sm text-[var(--muted)]">
            Upload PDF, hỏi bằng tiếng Việt hoặc English, rồi xem citation và
            nguồn ngay ở panel bên phải.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4">
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onSelectSource={onSelectSource}
            onShowSources={onShowSources}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
