"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import type { SystemHealth } from "@/lib/types";

const statusStyles: Record<SystemHealth["status"], string> = {
  ready: "bg-green-100 text-green-800 ring-green-200",
  degraded: "bg-amber-100 text-amber-800 ring-amber-200",
  unavailable: "bg-red-100 text-red-800 ring-red-200",
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

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ring-1 ${statusStyles[status]}`}
      title={
        health
          ? `${health.llm.model} | ${health.vector_store.files} files | ${health.vector_store.total_chunks} chunks`
          : "Checking system status"
      }
    >
      <span className="h-2 w-2 rounded-full bg-current" />
      {label}
    </span>
  );
}
