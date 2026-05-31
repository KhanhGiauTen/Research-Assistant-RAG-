"use client";

import { ChevronLeft, ChevronRight, FileWarning, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import type { PDFDocumentProxy } from "pdfjs-dist";

import { toApiUrl } from "@/lib/api";
import type { SourceReference } from "@/lib/types";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

interface PdfEvidenceViewerClientProps {
  source: SourceReference | null;
}

export function PdfEvidenceViewerClient({ source }: PdfEvidenceViewerClientProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(0.86);
  const fileUrl = useMemo(() => toApiUrl(source?.pdf_url), [source?.pdf_url]);

  useEffect(() => {
    setNumPages(null);
    setPageNumber(source?.page_number ?? 1);
  }, [source?.chunk_id, source?.page_number]);

  if (!source) {
    return (
      <div className="flex min-h-72 items-center justify-center rounded-md border border-dashed border-[var(--border)] bg-white p-6 text-center text-sm text-[var(--muted)]">
        Chọn citation để xem trang PDF tương ứng.
      </div>
    );
  }

  if (!fileUrl) {
    return (
      <div className="flex min-h-72 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--warning-soft)] p-6 text-center text-sm">
        <FileWarning className="mr-2 h-5 w-5" />
        PDF chưa có trên ổ đĩa, vẫn có thể đọc quote/context bên dưới.
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-md border border-[var(--border)] bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{source.display_title}</p>
          <p className="text-xs text-[var(--muted)]">
            {source.citation_id} - page {pageNumber}
            {numPages ? ` / ${numPages}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] bg-white disabled:opacity-40"
            disabled={pageNumber <= 1}
            onClick={() => setPageNumber((current) => Math.max(1, current - 1))}
            title="Previous page"
            type="button"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] bg-white disabled:opacity-40"
            disabled={!!numPages && pageNumber >= numPages}
            onClick={() =>
              setPageNumber((current) => (numPages ? Math.min(numPages, current + 1) : current + 1))
            }
            title="Next page"
            type="button"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] bg-white"
            onClick={() => setScale((current) => Math.max(0.6, current - 0.1))}
            title="Zoom out"
            type="button"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] bg-white"
            onClick={() => setScale((current) => Math.min(1.4, current + 0.1))}
            title="Zoom in"
            type="button"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="max-h-[50vh] overflow-auto bg-slate-100 p-3">
        <Document
          error={<p className="p-4 text-sm text-[var(--error)]">Không render được PDF.</p>}
          file={fileUrl}
          loading={<p className="p-4 text-sm text-[var(--muted)]">Đang tải PDF...</p>}
          onLoadSuccess={(document: PDFDocumentProxy) => setNumPages(document.numPages)}
        >
          <Page
            loading={<p className="p-4 text-sm text-[var(--muted)]">Đang tải page...</p>}
            pageNumber={pageNumber}
            renderAnnotationLayer
            renderTextLayer
            scale={scale}
          />
        </Document>
      </div>
    </section>
  );
}
