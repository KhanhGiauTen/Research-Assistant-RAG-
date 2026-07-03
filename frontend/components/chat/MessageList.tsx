"use client";

import { ArrowRight, BookMarked, FileSearch, Quote } from "lucide-react";
import { useEffect, useRef } from "react";

import { MessageBubble } from "@/components/chat/MessageBubble";
import type { Message, SourceReference } from "@/lib/types";

interface MessageListProps {
  messages: Message[];
  onPromptSelect: (prompt: string) => void;
  onShowSources: (sources: SourceReference[]) => void;
  onSelectSource: (source: SourceReference) => void;
}

export function MessageList({
  messages,
  onPromptSelect,
  onSelectSource,
  onShowSources,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const starterPrompts = [
    {
      icon: FileSearch,
      title: "Tóm tắt paper",
      prompt: "Tóm tắt đóng góp chính của paper và dẫn nguồn theo từng luận điểm.",
    },
    {
      icon: Quote,
      title: "Tìm bằng chứng",
      prompt: "Paper nói gì về phương pháp chính? Trích citation và page liên quan.",
    },
    {
      icon: BookMarked,
      title: "So sánh khái niệm",
      prompt: "So sánh các khái niệm quan trọng trong paper và chỉ ra nguồn hỗ trợ.",
    },
  ];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!messages.length) {
    return (
      <div className="flex flex-1 items-center justify-center overflow-y-auto p-6">
        <div className="w-full max-w-2xl rounded-md border border-[var(--border)] bg-[var(--surface-raised)] p-5 text-left shadow-sm">
          <div className="inline-flex rounded-md bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--accent)]">
            Research starter
          </div>
          <h2 className="mt-3 text-2xl font-semibold">Bắt đầu bằng một câu hỏi có thể kiểm chứng</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Hỏi bằng tiếng Việt hoặc English. Assistant sẽ trả lời kèm citation,
            quote và trang PDF để bạn đối chiếu ở panel Evidence.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {starterPrompts.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.title}
                  className="group flex min-h-32 flex-col justify-between rounded-md border border-[var(--border)] bg-white p-3 text-left shadow-sm hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
                  onClick={() => onPromptSelect(item.prompt)}
                  type="button"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-[var(--surface-muted)] text-[var(--accent)] group-hover:bg-white">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{item.title}</span>
                    <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">
                      {item.prompt}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)]">
                    Ask now <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </button>
              );
            })}
          </div>
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
