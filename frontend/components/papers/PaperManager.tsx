"use client";

import { Activity, Database, RefreshCw, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { PaperList } from "@/components/papers/PaperList";
import { UploadZone } from "@/components/papers/UploadZone";
import type { UsePapersResult } from "@/lib/hooks/usePapers";

interface PaperManagerProps {
  papers: UsePapersResult;
}

export function PaperManager({ papers }: PaperManagerProps) {
  const [filter, setFilter] = useState("");
  const filteredPapers = useMemo(() => {
    const lowered = filter.trim().toLowerCase();
    if (!lowered) {
      return papers.papers;
    }
    return papers.papers.filter((paper) =>
      `${paper.display_title} ${paper.file_name}`.toLowerCase().includes(lowered),
    );
  }, [filter, papers.papers]);

  return (
    <aside className="flex min-h-0 flex-1 flex-col bg-[var(--surface-muted)]">
      <header className="border-b border-[var(--border)] bg-[var(--surface-raised)] px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
              Library
            </p>
            <h2 className="font-semibold">Paper Library</h2>
            <p className="text-xs text-[var(--muted)]">
              Tài liệu local, private và sẵn sàng kiểm chứng.
            </p>
          </div>
          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] bg-white text-[var(--muted)] shadow-sm hover:border-[var(--accent)] hover:text-[var(--accent)]"
            onClick={() => void papers.refresh()}
            title="Refresh papers"
            type="button"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-md border border-[var(--border)] bg-white px-3 py-2 shadow-sm">
            <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
              <Activity className="h-3.5 w-3.5 text-[var(--accent)]" />
              Files
            </div>
            <p className="mt-1 text-lg font-semibold">{papers.papers.length}</p>
          </div>
          <div className="rounded-md border border-[var(--border)] bg-white px-3 py-2 shadow-sm">
            <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
              <Database className="h-3.5 w-3.5 text-[var(--accent)]" />
              Chunks
            </div>
            <p className="mt-1 text-lg font-semibold">{papers.totalChunks}</p>
          </div>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        <UploadZone disabled={papers.isLoading} onUpload={papers.upload} />
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            Search indexed papers
          </label>
          <div className="flex h-10 items-center gap-2 rounded-md border border-[var(--border)] bg-white px-3 shadow-sm focus-within:border-[var(--accent)]">
            <Search className="h-4 w-4 text-[var(--muted)]" />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Search title or filename..."
              value={filter}
            />
          </div>
        </div>
        {papers.job && (
          <div className="rounded-md border border-[var(--border)] bg-white p-3 text-sm shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">Ingest job</p>
              <span className="rounded-md bg-[var(--accent-soft)] px-2 py-1 text-xs font-semibold text-[var(--accent)]">
                {papers.job.status}
              </span>
            </div>
            <p className="mt-2 text-[var(--muted)]">
              {papers.job.progress ?? papers.job.message ?? "Queued"}
            </p>
            {papers.job.error && <p className="text-[var(--error)]">{papers.job.error}</p>}
          </div>
        )}
        {papers.error && (
          <div className="rounded-md border border-red-200 bg-[var(--error-soft)] p-3 text-sm text-red-800">
            {papers.error}
          </div>
        )}
        <PaperList papers={filteredPapers} onDelete={papers.remove} />
      </div>
    </aside>
  );
}
