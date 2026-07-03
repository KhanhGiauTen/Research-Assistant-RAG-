"use client";

import { CheckCircle2, FileText, HardDrive, Trash2 } from "lucide-react";

import type { PaperInfo } from "@/lib/types";

interface PaperListProps {
  papers: PaperInfo[];
  onDelete: (fileName: string) => Promise<void>;
}

export function PaperList({ papers, onDelete }: PaperListProps) {
  if (!papers.length) {
    return (
      <div className="rounded-md border border-dashed border-[var(--border-strong)] bg-white p-5 text-sm text-[var(--muted)]">
        <div className="mb-2 flex items-center gap-2 font-semibold text-[var(--foreground)]">
          <FileText className="h-4 w-4 text-[var(--accent)]" />
          Chưa có paper nào được index
        </div>
        Upload PDF để tạo vector chunks và bắt đầu hỏi đáp có citation.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {papers.map((paper) => (
        <div
          key={paper.file_name}
          className="rounded-md border border-[var(--border)] bg-white p-3 shadow-sm hover:border-[var(--border-strong)] hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-start gap-2">
                <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--accent-soft)] text-[var(--accent)]">
                  <FileText className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold">{paper.display_title}</p>
                  <p className="break-words text-xs leading-5 text-[var(--muted)]">
                    {paper.file_name}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-[11px] font-medium text-[var(--muted)]">
                <span className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1">
                  <HardDrive className="h-3.5 w-3.5" />
                  {paper.chunk_count} chunks
                </span>
                <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-800">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {paper.pdf_url ? "PDF ready" : "Text only"}
                </span>
              </div>
            </div>
            <button
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-white text-[var(--muted)] hover:border-red-200 hover:bg-red-50 hover:text-[var(--error)]"
              onClick={() => {
                if (confirm(`Delete ${paper.file_name} from the index?`)) {
                  void onDelete(paper.file_name);
                }
              }}
              title="Delete from index"
              type="button"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
