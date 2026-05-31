"use client";

import type { SourceReference } from "@/lib/types";

interface SourcePanelProps {
  sources: SourceReference[];
}

function scoreClass(score: number): string {
  if (score >= 0.7) {
    return "bg-green-500";
  }
  if (score >= 0.5) {
    return "bg-amber-500";
  }
  return "bg-red-500";
}

export function SourcePanel({ sources }: SourcePanelProps) {
  return (
    <aside className="hidden min-h-0 border-l border-[var(--border)] bg-[var(--surface-muted)] xl:block">
      <div className="border-b border-[var(--border)] px-4 py-3">
        <h2 className="font-semibold">Sources</h2>
        <p className="text-xs text-[var(--muted)]">Citations for the selected answer</p>
      </div>
      <div className="flex max-h-[calc(100vh-65px)] flex-col gap-3 overflow-y-auto p-4">
        {!sources.length && (
          <p className="text-sm text-[var(--muted)]">
            Sources will appear after an answer is generated.
          </p>
        )}
        {sources.map((source) => (
          <section
            key={`${source.rank}-${source.file_name}-${source.page_number}`}
            className="rounded-md border border-[var(--border)] bg-white p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{source.file_name}</p>
                <p className="text-xs text-[var(--muted)]">Page {source.page_number}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">
                Source {source.rank}
              </span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-slate-100">
              <div
                className={`h-2 rounded-full ${scoreClass(source.score)}`}
                style={{ width: `${Math.max(5, Math.round(source.score * 100))}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-[var(--muted)]">{source.excerpt}</p>
          </section>
        ))}
      </div>
    </aside>
  );
}
