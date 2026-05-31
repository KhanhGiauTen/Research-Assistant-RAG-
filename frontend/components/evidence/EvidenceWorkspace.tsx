"use client";

import { BookOpen, FileText } from "lucide-react";
import { useEffect, useState } from "react";

import { HighlightedText } from "@/components/evidence/HighlightedText";
import { PdfEvidenceViewer } from "@/components/evidence/PdfEvidenceViewer";
import { SourceCard } from "@/components/evidence/SourceCard";
import { api } from "@/lib/api";
import type { PageTextResponse, PaperInfo, SourceReference } from "@/lib/types";

interface EvidenceWorkspaceProps {
  papers: PaperInfo[];
  selectedSource: SourceReference | null;
  sources: SourceReference[];
  onSelectSource: (source: SourceReference) => void;
}

export function EvidenceWorkspace({
  onSelectSource,
  papers,
  selectedSource,
  sources,
}: EvidenceWorkspaceProps) {
  const [pageText, setPageText] = useState<PageTextResponse | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPageText(null);
    setPageError(null);

    if (!selectedSource?.page_text_url) {
      return;
    }

    api
      .getPageText(selectedSource.page_text_url)
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
  }, [selectedSource?.chunk_id, selectedSource?.page_text_url]);

  return (
    <aside className="flex min-h-0 flex-1 flex-col bg-[var(--surface-muted)]">
      <header className="border-b border-[var(--border)] px-5 py-4">
        <h2 className="text-lg font-semibold">Evidence / PDF Viewer</h2>
        <p className="text-sm text-[var(--muted)]">
          Citation, quote, context và trang PDF liên quan.
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {!sources.length && (
          <div className="rounded-md border border-dashed border-[var(--border)] bg-white p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <BookOpen className="h-4 w-4 text-[var(--accent)]" />
              Papers đã load
            </div>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Sau khi bạn hỏi, panel này sẽ tự chuyển sang nguồn quan trọng nhất.
            </p>
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
            <PdfEvidenceViewer source={selectedSource ?? sources[0] ?? null} />

            {selectedSource && (
              <section className="rounded-md border border-[var(--border)] bg-white p-3 shadow-sm">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <FileText className="h-4 w-4 text-[var(--accent)]" />
                  Page text preview
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
                    <HighlightedText text={pageText.text} ranges={[]} />
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
