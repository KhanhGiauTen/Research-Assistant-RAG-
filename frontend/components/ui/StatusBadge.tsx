"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import type { SystemHealth } from "@/lib/types";

const statusStyles: Record<SystemHealth["status"], string> = {
  ready: "border-emerald-200 bg-emerald-50 text-emerald-800",
  degraded: "border-amber-200 bg-amber-50 text-amber-800",
  unavailable: "border-red-200 bg-red-50 text-red-800",
};

export function StatusBadge() {
  const [health, setHealth] = useState<SystemHealth | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const result = await api.getHealth();
        if (!cancelled) {
          setHealth(result);
        }
      } catch {
        if (!cancelled) {
          setHealth({
            llm: { available: false, model: "unknown" },
            vector_store: { total_chunks: 0, files: 0 },
            embedding_model: "unknown",
            status: "unavailable",
          });
        }
      }
    }

    load();
    const interval = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const status = health?.status ?? "degraded";
  const label = status === "ready" ? "Ready" : status === "degraded" ? "Degraded" : "Offline";
  const detail = health
    ? `${health.llm.model} · ${health.vector_store.files} files · ${health.vector_store.total_chunks} chunks`
    : "Checking local runtime";

  return (
    <span
      className={`inline-flex h-10 min-w-0 items-center gap-2 rounded-md border px-3 text-xs font-semibold shadow-sm ${statusStyles[status]}`}
      title={detail}
    >
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-20" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-current" />
      </span>
      <span className="leading-tight">
        <span className="block">{label}</span>
        <span className="hidden max-w-40 truncate font-normal opacity-80 sm:block">
          {health?.llm.model ?? "checking"}
        </span>
      </span>
    </span>
  );
}
