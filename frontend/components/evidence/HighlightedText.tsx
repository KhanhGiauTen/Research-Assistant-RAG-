"use client";

import type { ReactNode } from "react";

import type { HighlightRange } from "@/lib/types";

interface HighlightedTextProps {
  text: string;
  ranges?: HighlightRange[];
}

function rangeClass(kind: string): string {
  if (kind === "answer") {
    return "bg-[var(--accent-indigo)] text-[var(--foreground)]";
  }
  return "bg-[var(--accent-cyan)] text-[var(--foreground)]";
}

export function HighlightedText({ text, ranges = [] }: HighlightedTextProps) {
  const safeRanges = ranges
    .filter((range) => range.start >= 0 && range.end > range.start && range.end <= text.length)
    .sort((left, right) => left.start - right.start);

  if (!safeRanges.length) {
    return <>{text}</>;
  }

  const pieces: ReactNode[] = [];
  let cursor = 0;

  safeRanges.forEach((range, index) => {
    if (range.start > cursor) {
      pieces.push(text.slice(cursor, range.start));
    }
    pieces.push(
      <mark
        key={`${range.start}-${range.end}-${index}`}
        className={`rounded px-0.5 ${rangeClass(range.kind)}`}
      >
        {text.slice(range.start, range.end)}
      </mark>,
    );
    cursor = range.end;
  });

  if (cursor < text.length) {
    pieces.push(text.slice(cursor));
  }

  return <>{pieces}</>;
}
