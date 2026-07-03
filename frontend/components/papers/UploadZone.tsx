"use client";

import { FileCheck2, ShieldCheck, Upload } from "lucide-react";
import { ChangeEvent, DragEvent, useRef, useState } from "react";

interface UploadZoneProps {
  disabled: boolean;
  onUpload: (files: File[]) => Promise<void>;
}

export function UploadZone({ disabled, onUpload }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  function selectFiles(files: FileList | null) {
    const pdfs = Array.from(files ?? []).filter((file) =>
      file.name.toLowerCase().endsWith(".pdf"),
    );
    if (pdfs.length) {
      void onUpload(pdfs);
    }
  }

  function onDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setIsDragging(false);
    selectFiles(event.dataTransfer.files);
  }

  function onInput(event: ChangeEvent<HTMLInputElement>) {
    selectFiles(event.target.files);
    event.target.value = "";
  }

  return (
    <>
      <button
        className={`group flex min-h-40 flex-col items-center justify-center rounded-md border border-dashed p-4 text-center shadow-sm ${
          isDragging
            ? "border-[var(--accent)] bg-[var(--accent-soft)]"
            : "border-[var(--border-strong)] bg-[var(--surface-raised)] hover:border-[var(--accent)] hover:bg-white"
        }`}
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragLeave={() => setIsDragging(false)}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDrop={onDrop}
        type="button"
      >
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-md bg-[var(--accent)] text-white shadow-sm group-hover:bg-[var(--accent-strong)]">
          <Upload className="h-5 w-5" />
        </span>
        <span className="mt-3 text-sm font-semibold">Upload PDF papers</span>
        <span className="mt-1 max-w-52 text-xs leading-5 text-[var(--muted)]">
          Kéo thả file PDF hoặc click để index vào Chroma local.
        </span>
        <span className="mt-3 inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-white px-2.5 py-1 text-[11px] font-medium text-[var(--muted)]">
          <ShieldCheck className="h-3.5 w-3.5 text-[var(--success)]" />
          Private local storage
        </span>
        <span className="mt-2 inline-flex items-center gap-2 text-[11px] text-[var(--muted)]">
          <FileCheck2 className="h-3.5 w-3.5 text-[var(--accent)]" />
          PDF only · không upload cloud
        </span>
      </button>
      <input
        ref={inputRef}
        accept="application/pdf,.pdf"
        className="hidden"
        multiple
        onChange={onInput}
        type="file"
      />
    </>
  );
}
