"use client";

import { Trash2 } from "lucide-react";

import type { PaperInfo } from "@/lib/types";

interface PaperListProps {
  papers: PaperInfo[];
  onDelete: (fileName: string) => Promise<void>;
}

export function PaperList({ papers, onDelete }: PaperListProps) {
  if (!papers.length) {
    return (
      <div className="rounded-md border border-[var(--border)] bg-white p-4 text-sm text-[var(--muted)]">
        No indexed papers yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {papers.map((paper) => (
        <div
          key={paper.file_name}
          className="rounded-md border border-[var(--border)] bg-white p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="break-words text-sm font-medium">{paper.file_name}</p>
              <p className="text-xs text-[var(--muted)]">{paper.chunk_count} chunks</p>
            </div>
            <button
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--border)] hover:bg-red-50 hover:text-[var(--error)]"
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
