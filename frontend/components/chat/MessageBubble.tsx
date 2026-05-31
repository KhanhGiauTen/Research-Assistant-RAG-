"use client";

import { FileText } from "lucide-react";
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
            className="mx-0.5 rounded-full bg-[var(--accent-cyan)] px-1.5 py-0.5 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--accent-indigo)]"
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

  return (
    <article className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[92%] rounded-md border px-4 py-3 text-sm leading-6 shadow-sm ${
          isUser
            ? "border-cyan-200 bg-cyan-50"
            : "border-[var(--border)] bg-white"
        }`}
      >
        <div className="whitespace-pre-wrap">
          {renderInline(message.content, sources, onSelectSource)}
        </div>
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
              {sources.length} nguồn
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
