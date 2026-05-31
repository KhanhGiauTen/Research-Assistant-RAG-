"use client";

import { FileText } from "lucide-react";
import type { ReactNode } from "react";

import type { Message, SourceReference } from "@/lib/types";

interface MessageBubbleProps {
  message: Message;
  onShowSources: (sources: SourceReference[]) => void;
}

function renderInline(text: string): ReactNode[] {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[Source \d+\])/g);
  return tokens.map((token, index) => {
    if (token.startsWith("**") && token.endsWith("**")) {
      return <strong key={index}>{token.slice(2, -2)}</strong>;
    }
    if (token.startsWith("`") && token.endsWith("`")) {
      return (
        <code key={index} className="rounded bg-slate-100 px-1 py-0.5 text-sm">
          {token.slice(1, -1)}
        </code>
      );
    }
    if (/^\[Source \d+\]$/.test(token)) {
      return (
        <span key={index} className="font-semibold text-[var(--accent)]">
          {token}
        </span>
      );
    }
    return token;
  });
}

export function MessageBubble({ message, onShowSources }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const sources = message.sources ?? [];

  return (
    <article className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg border px-4 py-3 text-sm leading-6 ${
          isUser
            ? "border-teal-200 bg-teal-50"
            : "border-[var(--border)] bg-white"
        }`}
      >
        <div className="whitespace-pre-wrap">{renderInline(message.content)}</div>
        {message.isStreaming && (
          <span className="mt-2 inline-block h-4 w-2 animate-pulse rounded-sm bg-[var(--accent)]" />
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
          <time>{message.timestamp.toLocaleTimeString()}</time>
          {!!sources.length && (
            <button
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-2 py-1 hover:bg-[var(--surface-muted)]"
              onClick={() => onShowSources(sources)}
              type="button"
            >
              <FileText className="h-3.5 w-3.5" />
              {sources.length} sources
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
