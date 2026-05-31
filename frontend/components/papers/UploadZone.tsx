"use client";

import { Upload } from "lucide-react";
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
        className={`flex min-h-32 flex-col items-center justify-center rounded-md border border-dashed bg-white p-4 text-center hover:bg-slate-50 ${
          isDragging ? "border-[var(--accent)]" : "border-[var(--border)]"
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
        <Upload className="h-6 w-6 text-[var(--accent)]" />
        <span className="mt-2 text-sm font-medium">Upload PDF papers</span>
        <span className="mt-1 text-xs text-[var(--muted)]">
          Kéo thả file hoặc click để chọn
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
