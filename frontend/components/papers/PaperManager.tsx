"use client";

import { RefreshCw } from "lucide-react";

import { PaperList } from "@/components/papers/PaperList";
import { UploadZone } from "@/components/papers/UploadZone";
import { usePapers } from "@/lib/hooks/usePapers";

export function PaperManager() {
  const papers = usePapers();

  return (
    <aside className="flex min-h-screen flex-col bg-[var(--surface-muted)]">
      <header className="flex items-center justify-between border-b border-[var(--border)] px-4 py-4">
        <div>
          <h2 className="font-semibold">Papers</h2>
          <p className="text-xs text-[var(--muted)]">
            {papers.papers.length} files, {papers.totalChunks} chunks
          </p>
        </div>
        <button
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] bg-white hover:bg-slate-50"
          onClick={() => void papers.refresh()}
          title="Refresh papers"
          type="button"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </header>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        <UploadZone disabled={papers.isLoading} onUpload={papers.upload} />
        {papers.job && (
          <div className="rounded-md border border-[var(--border)] bg-white p-3 text-sm">
            <p className="font-medium">Job {papers.job.status}</p>
            <p className="text-[var(--muted)]">
              {papers.job.progress ?? papers.job.message ?? "Queued"}
            </p>
            {papers.job.error && <p className="text-[var(--error)]">{papers.job.error}</p>}
          </div>
        )}
        {papers.error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {papers.error}
          </div>
        )}
        <PaperList papers={papers.papers} onDelete={papers.remove} />
      </div>
    </aside>
  );
}
