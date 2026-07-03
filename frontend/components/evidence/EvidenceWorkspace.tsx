"use client";

import { BadgeCheck, BookOpen, FileText, ScanSearch, Target } from "lucide-react";
import { useEffect, useState } from "react";

import { HighlightedText } from "@/components/evidence/HighlightedText";
import { PdfEvidenceViewer } from "@/components/evidence/PdfEvidenceViewer";
import { SourceCard } from "@/components/evidence/SourceCard";
import { api } from "@/lib/api";
import type { HighlightRange, PageTextResponse, PaperInfo, SourceReference } from "@/lib/types";

interface EvidenceWorkspaceProps {
  papers: PaperInfo[];
  selectedSource: SourceReference | null;
  sources: SourceReference[];
  onSelectSource: (source: SourceReference) => void;
}

function buildPageHighlightRanges(
  text: string,
  source: SourceReference | null,
): HighlightRange[] {
  if (!source) {
    return [];
  }

  const lowerText = text.toLowerCase();
  const ranges: HighlightRange[] = [];
  const seen = new Set<string>();

  for (const range of source.highlight_ranges) {
    const term = source.quote.slice(range.start, range.end).trim();
    const normalized = term.toLowerCase();
    if (normalized.length < 3 || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    const start = lowerText.indexOf(normalized);
    if (start >= 0) {
      ranges.push({ start, end: start + term.length, kind: "query" });
    }
  }

  return ranges
    .sort((left, right) => left.start - right.start)
    .filter((range, index, sorted) => index === 0 || range.start >= sorted[index - 1].end);
}

export function EvidenceWorkspace({
  onSelectSource,
  papers,
  selectedSource,
  sources,
}: EvidenceWorkspaceProps) {
  const [pageText, setPageText] = useState<PageTextResponse | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const activeSource = selectedSource ?? sources[0] ?? null;
  const pageHighlightRanges = pageText
    ? buildPageHighlightRanges(pageText.text, activeSource)
    : [];

  useEffect(() => {
    let cancelled = false;
    setPageText(null);
    setPageError(null);

    if (!activeSource?.page_text_url) {
      return;
    }

    api
      .getPageText(activeSource.page_text_url)
      .then((result) => {
        if (!cancelled) {
          setPageText(result);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setPageError(error instanceof Error ? error.message : "Cannot load page text");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeSource?.chunk_id, activeSource?.page_text_url]);

  return (
    <aside className="flex min-h-0 flex-1 flex-col bg-[var(--surface-muted)]">
      <header className="border-b border-[var(--border)] bg-[var(--surface-raised)] px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
              Evidence
            </p>
            <h2 className="text-lg font-semibold">Evidence / PDF Viewer</h2>
            <p className="text-sm text-[var(--muted)]">
              Citation, quote, context và trang PDF liên quan.
            </p>
          </div>
          {activeSource && (
            <div className="max-w-sm rounded-md border border-[var(--border)] bg-white px-3 py-2 text-xs shadow-sm">
              <div className="mb-1 flex flex-wrap items-center gap-2 font-semibold">
                <span className="rounded-md bg-[var(--accent)] px-2 py-1 text-white">
                  {activeSource.citation_id}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-[var(--accent-soft)] px-2 py-1 text-[var(--accent)]">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  selected source
                </span>
              </div>
              <p className="truncate font-semibold">{activeSource.display_title}</p>
              <p className="text-[var(--muted)]">
                Page {activeSource.page_number}
                {activeSource.section_name ? ` · ${activeSource.section_name}` : ""} ·{" "}
                {Math.round(activeSource.score * 100)}% match
              </p>
            </div>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {!sources.length && (
          <div className="rounded-md border border-dashed border-[var(--border-strong)] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <BookOpen className="h-4 w-4 text-[var(--accent)]" />
              Papers đã index
            </div>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Sau khi bạn hỏi, panel này sẽ tự chuyển sang nguồn quan trọng nhất,
              mở đúng trang PDF và highlight quote/context liên quan.
            </p>
            <div className="mt-4 grid gap-2 text-xs text-[var(--muted)] sm:grid-cols-2">
              <div className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] p-3">
                <Target className="mb-2 h-4 w-4 text-[var(--accent)]" />
                Citation score giúp ưu tiên nguồn đáng kiểm chứng.
              </div>
              <div className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] p-3">
                <ScanSearch className="mb-2 h-4 w-4 text-[var(--accent)]" />
                Quote/context sẽ highlight term khớp với truy vấn.
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              {papers.slice(0, 6).map((paper) => (
                <div
                  key={paper.file_name}
                  className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-sm"
                >
                  <p className="font-medium">{paper.display_title}</p>
                  <p className="text-xs text-[var(--muted)]">{paper.chunk_count} chunks</p>
                </div>
              ))}
              {!papers.length && (
                <p className="text-sm text-[var(--muted)]">
                  Upload PDF ở Paper Library để bắt đầu.
                </p>
              )}
            </div>
          </div>
        )}

        {!!sources.length && (
          <div className="flex flex-col gap-4">
            <PdfEvidenceViewer source={activeSource} />

            {activeSource && (
              <section className="rounded-md border border-[var(--border)] bg-white p-3 shadow-sm">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <FileText className="h-4 w-4 text-[var(--accent)]" />
                    Page text preview
                  </div>
                  {!!pageHighlightRanges.length && (
                    <span className="rounded-md bg-[var(--accent-soft)] px-2 py-1 text-xs font-semibold text-[var(--accent)]">
                      {pageHighlightRanges.length} highlights
                    </span>
                  )}
                </div>
                {pageError && (
                  <p className="text-sm text-[var(--error)]">
                    Không tải được page text: {pageError}
                  </p>
                )}
                {!pageError && !pageText && (
                  <p className="text-sm text-[var(--muted)]">Đang tải page text...</p>
                )}
                {pageText && (
                  <p className="max-h-48 overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">
                    <HighlightedText text={pageText.text} ranges={pageHighlightRanges} />
                  </p>
                )}
              </section>
            )}

            <div className="flex flex-col gap-3">
              {sources.map((source) => (
                <SourceCard
                  key={source.chunk_id}
                  isSelected={(selectedSource ?? sources[0])?.chunk_id === source.chunk_id}
                  onSelect={onSelectSource}
                  source={source}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
