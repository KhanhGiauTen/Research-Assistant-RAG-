"use client";

import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileWarning,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { toApiUrl } from "@/lib/api";
import type { SourceReference } from "@/lib/types";

interface PdfEvidenceViewerClientProps {
  source: SourceReference | null;
}

export function PdfEvidenceViewerClient({ source }: PdfEvidenceViewerClientProps) {
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState(100);
  const fileUrl = useMemo(() => toApiUrl(source?.pdf_url), [source?.pdf_url]);
  const viewerUrl = useMemo(() => {
    if (!fileUrl) {
      return null;
    }
    return `${fileUrl}#page=${pageNumber}&zoom=${zoom}`;
  }, [fileUrl, pageNumber, zoom]);

  useEffect(() => {
    setPageNumber(source?.page_number ?? 1);
    setZoom(100);
  }, [source?.chunk_id, source?.page_number]);

  if (!source) {
    return (
      <div className="flex min-h-72 items-center justify-center rounded-md border border-dashed border-[var(--border-strong)] bg-white p-6 text-center text-sm text-[var(--muted)]">
        <div>
          <FileWarning className="mx-auto mb-2 h-6 w-6 text-[var(--accent)]" />
          Chọn citation để xem trang PDF tương ứng.
        </div>
      </div>
    );
  }

  if (!viewerUrl || !fileUrl) {
    return (
      <div className="flex min-h-72 items-center justify-center rounded-md border border-amber-200 bg-[var(--warning-soft)] p-6 text-center text-sm">
        <div>
          <FileWarning className="mx-auto mb-2 h-6 w-6 text-[var(--warning)]" />
          <p className="font-semibold">PDF chưa có trên ổ đĩa</p>
          <p className="mt-1 text-[var(--muted)]">
            Vẫn có thể đọc quote/context bên dưới để kiểm chứng text evidence.
          </p>
        </div>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-md border border-[var(--border)] bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-[var(--accent)] px-2 py-1 text-xs font-bold text-white">
              {source.citation_id}
            </span>
            <span className="rounded-md bg-[var(--accent-soft)] px-2 py-1 text-xs font-semibold text-[var(--accent)]">
              Page {pageNumber}
            </span>
            <span className="rounded-md bg-[var(--surface-muted)] px-2 py-1 text-xs font-semibold text-[var(--muted)]">
              Zoom {zoom}%
            </span>
          </div>
          <p className="truncate text-sm font-semibold">{source.display_title}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] bg-white text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-40"
            disabled={pageNumber <= 1}
            onClick={() => setPageNumber((current) => Math.max(1, current - 1))}
            title="Previous page"
            type="button"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] bg-white text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
            onClick={() => setPageNumber((current) => current + 1)}
            title="Next page"
            type="button"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] bg-white text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
            onClick={() => setZoom((current) => Math.max(60, current - 10))}
            title="Zoom out"
            type="button"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] bg-white text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
            onClick={() => setZoom((current) => Math.min(160, current + 10))}
            title="Zoom in"
            type="button"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <a
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] bg-white text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
            href={fileUrl}
            rel="noreferrer"
            target="_blank"
            title="Open PDF in a new tab"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>

      <iframe
        className="h-[52vh] w-full bg-slate-100"
        src={viewerUrl}
        title={`${source.display_title} page ${pageNumber}`}
      />
    </section>
  );
}
