"use client";

import { Copy, FileText, Quote, Target } from "lucide-react";
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
  const scorePercent = Math.max(0, Math.min(100, Math.round(source.score * 100)));

  return (
    <article
      className={`rounded-md border bg-white p-3 shadow-sm ${
        isSelected
          ? "border-[var(--accent)] ring-2 ring-cyan-100"
          : "border-[var(--border)] hover:border-[var(--border-strong)]"
      }`}
    >
      <button
        className="block w-full text-left"
        onClick={() => onSelect(source)}
        type="button"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-[var(--accent)] px-2 py-1 text-xs font-bold text-white">
                {source.citation_id}
              </span>
              <span className="rounded-md bg-[var(--accent-mint)] px-2 py-1 text-xs font-semibold text-[var(--foreground)]">
                Page {source.page_number}
              </span>
            </div>
            <p className="truncate text-sm font-semibold">{source.display_title}</p>
            <p className="truncate text-xs text-[var(--muted)]">
              {source.section_name ? source.section_name : "Detected source chunk"}
            </p>
          </div>
          <span className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1 text-xs font-semibold">
            #{source.rank}
          </span>
        </div>
      </button>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
          <span className="inline-flex items-center gap-1">
            <Target className="h-3.5 w-3.5 text-[var(--accent)]" />
            Similarity
          </span>
          <span>{scorePercent}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-md bg-[var(--surface-muted)]">
          <div
            className="h-full rounded-md bg-[var(--accent)]"
            style={{ width: `${scorePercent}%` }}
          />
        </div>
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--foreground)]">
        <HighlightedText text={body} ranges={expanded ? [] : source.highlight_ranges} />
      </p>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--accent-soft)] px-2 py-1 font-semibold text-[var(--accent)]">
          <Quote className="h-3.5 w-3.5" />
          matched quote
        </span>
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
