"use client";

import { Copy, FileText } from "lucide-react";
import { useState } from "react";

import { HighlightedText } from "@/components/evidence/HighlightedText";
import type { SourceReference } from "@/lib/types";

interface SourceCardProps {
  source: SourceReference;
  isSelected: boolean;
  onSelect: (source: SourceReference) => void;
}

export function SourceCard({ isSelected, onSelect, source }: SourceCardProps) {
  const [expanded, setExpanded] = useState(false);
  const body = expanded ? source.context : source.quote;

  return (
    <article
      className={`rounded-md border bg-white p-3 shadow-sm ${
        isSelected ? "border-[var(--accent)] ring-2 ring-cyan-100" : "border-[var(--border)]"
      }`}
    >
      <button
        className="block w-full text-left"
        onClick={() => onSelect(source)}
        type="button"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {source.citation_id} {source.display_title}
            </p>
            <p className="text-xs text-[var(--muted)]">
              Page {source.page_number}
              {source.section_name ? ` - ${source.section_name}` : ""} -{" "}
              {Math.round(source.score * 100)}% relevant
            </p>
          </div>
          <span className="rounded-full bg-[var(--accent-mint)] px-2 py-1 text-xs font-medium">
            #{source.rank}
          </span>
        </div>
      </button>

      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--foreground)]">
        <HighlightedText text={body} ranges={expanded ? [] : source.highlight_ranges} />
      </p>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <button
          className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 hover:bg-[var(--surface-muted)]"
          onClick={() => setExpanded((current) => !current)}
          type="button"
        >
          <FileText className="h-3.5 w-3.5" />
          {expanded ? "Quote" : "Context"}
        </button>
        <button
          className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 hover:bg-[var(--surface-muted)]"
          onClick={() => void navigator.clipboard?.writeText(source.quote)}
          type="button"
        >
          <Copy className="h-3.5 w-3.5" />
          Copy quote
        </button>
      </div>
    </article>
  );
}
