"use client";

import { Filter, Loader2, Send } from "lucide-react";
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
  const canSubmit = !!value.trim() && !disabled;

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
    <div className="border-t border-[var(--border)] bg-[var(--surface-raised)] p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <label className="inline-flex min-w-0 flex-1 items-center gap-2 rounded-md border border-[var(--border)] bg-white px-3 py-2 shadow-sm focus-within:border-[var(--accent)]">
          <Filter className="h-4 w-4 shrink-0 text-[var(--accent)]" />
          <select
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
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
        </label>
        <span
          className={`rounded-md border border-[var(--border)] bg-white px-2 py-1 text-xs font-medium ${
            nearLimit ? "text-[var(--warning)]" : "text-[var(--muted)]"
          }`}
        >
          {value.length}/1000
        </span>
      </div>
      <div className="flex gap-2 rounded-md border border-[var(--border)] bg-white p-2 shadow-sm focus-within:border-[var(--accent)]">
        <textarea
          className="max-h-36 min-h-20 flex-1 resize-y bg-transparent px-2 py-2 text-sm leading-6 outline-none"
          disabled={disabled}
          maxLength={1000}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Hỏi về paper đã index... / Ask about your indexed papers..."
          value={value}
        />
        <button
          className="inline-flex h-20 w-16 shrink-0 items-center justify-center rounded-md bg-[var(--accent)] text-white shadow-sm hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!canSubmit}
          onClick={() => void submit()}
          title={disabled ? "Assistant is responding" : "Send"}
          type="button"
        >
          {disabled ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted)]">
        <span>Ctrl/Command + Enter để gửi</span>
        <span>Answer sẽ kèm citation và nguồn kiểm chứng khi có dữ liệu phù hợp.</span>
      </div>
    </div>
  );
}
