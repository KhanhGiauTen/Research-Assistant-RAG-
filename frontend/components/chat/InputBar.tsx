"use client";

import { Send } from "lucide-react";
import { KeyboardEvent, useState } from "react";

import type { PaperInfo } from "@/lib/types";

interface InputBarProps {
  disabled: boolean;
  papers: PaperInfo[];
  selectedFile: string | null;
  onSelectedFileChange: (file: string | null) => void;
  onSend: (query: string) => Promise<void>;
}

export function InputBar({
  disabled,
  papers,
  selectedFile,
  onSelectedFileChange,
  onSend,
}: InputBarProps) {
  const [value, setValue] = useState("");
  const nearLimit = value.length > 850;

  async function submit() {
    if (!value.trim() || disabled) {
      return;
    }
    const query = value;
    setValue("");
    await onSend(query);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <div className="border-t border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <select
          className="h-9 rounded-md border border-[var(--border)] bg-white px-3 text-sm"
          value={selectedFile ?? ""}
          onChange={(event) => onSelectedFileChange(event.target.value || null)}
        >
          <option value="">Tất cả papers</option>
          {papers.map((paper) => (
            <option key={paper.file_name} value={paper.file_name}>
              {paper.display_title || paper.file_name}
            </option>
          ))}
        </select>
        <span
          className={`text-xs ${nearLimit ? "text-[var(--warning)]" : "text-[var(--muted)]"}`}
        >
          {value.length}/1000
        </span>
      </div>
      <div className="flex gap-2">
        <textarea
          className="max-h-32 min-h-16 flex-1 resize-y rounded-md border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          disabled={disabled}
          maxLength={1000}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Hỏi về paper đã index... / Ask about your indexed papers..."
          value={value}
        />
        <button
          className="inline-flex h-16 w-16 items-center justify-center rounded-md bg-[var(--accent)] text-white hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled || !value.trim()}
          onClick={() => void submit()}
          title="Send"
          type="button"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
      <p className="mt-2 text-xs text-[var(--muted)]">Ctrl/Command + Enter để gửi</p>
    </div>
  );
}
