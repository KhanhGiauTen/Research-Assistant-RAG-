"use client";

import dynamic from "next/dynamic";

import type { SourceReference } from "@/lib/types";

const PdfEvidenceViewerClient = dynamic(
  () =>
    import("@/components/evidence/PdfEvidenceViewerClient").then(
      (module) => module.PdfEvidenceViewerClient,
    ),
  {
    loading: () => (
      <div className="flex min-h-72 items-center justify-center rounded-md border border-[var(--border)] bg-white p-6 text-sm text-[var(--muted)]">
        Đang chuẩn bị PDF viewer...
      </div>
    ),
    ssr: false,
  },
);

interface PdfEvidenceViewerProps {
  source: SourceReference | null;
}

export function PdfEvidenceViewer({ source }: PdfEvidenceViewerProps) {
  return <PdfEvidenceViewerClient source={source} />;
}
