"use client";

import { Bot, FileText, ShieldCheck, UserRound } from "lucide-react";
import type { ReactNode } from "react";

import type { Message, SourceReference } from "@/lib/types";

interface MessageBubbleProps {
  message: Message;
  onSelectSource: (source: SourceReference) => void;
  onShowSources: (sources: SourceReference[]) => void;
}

function renderInline(
  text: string,
  sources: SourceReference[],
  onSelectSource: (source: SourceReference) => void,
): ReactNode[] {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[\d+\])/g);
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
    if (/^\[\d+\]$/.test(token)) {
      const source = sources.find((item) => item.citation_id === token);
      if (source) {
        return (
          <button
            key={index}
            className="mx-0.5 rounded-md border border-[var(--border-strong)] bg-[var(--accent-cyan)] px-1.5 py-0.5 text-xs font-bold text-[var(--foreground)] shadow-sm hover:bg-[var(--accent-indigo)]"
            onClick={() => onSelectSource(source)}
            title={`${source.display_title}, page ${source.page_number}`}
            type="button"
          >
            {token}
          </button>
        );
      }
      return (
        <span key={index} className="font-semibold text-[var(--accent)]">
          {token}
        </span>
      );
    }
    return token;
  });
}

export function MessageBubble({
  message,
  onSelectSource,
  onShowSources,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const sources = message.sources ?? [];
  const topSource = sources[0];

  return (
    <article className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <span className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--accent)] text-white shadow-sm">
          <Bot className="h-4 w-4" />
        </span>
      )}
      <div
        className={`max-w-[92%] rounded-md border px-4 py-3 text-sm leading-6 shadow-sm ${
          isUser
            ? "border-cyan-200 bg-[var(--accent-soft)]"
            : "border-[var(--border)] bg-white"
        }`}
      >
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
          {isUser ? "You" : "Assistant"}
          {!isUser && !!sources.length && (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 normal-case tracking-normal text-emerald-800">
              <ShieldCheck className="h-3 w-3" />
              cited answer
            </span>
          )}
        </div>
        <div className="whitespace-pre-wrap">
          {renderInline(
            message.content || (message.isStreaming ? "Đang tổng hợp câu trả lời..." : ""),
            sources,
            onSelectSource,
          )}
        </div>
        {message.isStreaming && (
          <span className="mt-2 inline-block h-4 w-2 animate-pulse rounded-sm bg-[var(--accent)]" />
        )}
        {!isUser && topSource && (
          <button
            className="mt-3 flex w-full items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-left hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
            onClick={() => onShowSources(sources)}
            type="button"
          >
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-[var(--accent)]">
                Evidence ribbon · {sources.length} nguồn
              </span>
              <span className="block truncate text-xs text-[var(--muted)]">
                Top source: {topSource.display_title}, page {topSource.page_number}
              </span>
            </span>
            <FileText className="h-4 w-4 shrink-0 text-[var(--accent)]" />
          </button>
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
              {sources.length} nguồn
            </button>
          )}
        </div>
      </div>
      {isUser && (
        <span className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-cyan-200 bg-white text-[var(--accent)] shadow-sm">
          <UserRound className="h-4 w-4" />
        </span>
      )}
    </article>
  );
}
