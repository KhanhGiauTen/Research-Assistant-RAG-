"use client";

import {
  BookOpenCheck,
  Database,
  Download,
  FileText,
  HardDrive,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { type ComponentType, useState } from "react";

import { ChatWindow } from "@/components/chat/ChatWindow";
import { EvidenceWorkspace } from "@/components/evidence/EvidenceWorkspace";
import { PaperManager } from "@/components/papers/PaperManager";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { api } from "@/lib/api";
import { useChat } from "@/lib/hooks/useChat";
import { usePapers } from "@/lib/hooks/usePapers";
import type { SourceReference } from "@/lib/types";

type MobileTab = "papers" | "chat" | "sources";

interface MetricPillProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}

function MetricPill({ icon: Icon, label, value }: MetricPillProps) {
  return (
    <div className="inline-flex min-w-0 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-glass)] px-3 py-2 text-sm shadow-sm">
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--accent-soft)] text-[var(--accent)]">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
          {label}
        </span>
        <span className="block truncate font-semibold text-[var(--foreground)]">{value}</span>
      </span>
    </div>
  );
}

export function AppShell() {
  const chat = useChat();
  const papers = usePapers();
  const [mobileTab, setMobileTab] = useState<MobileTab>("chat");
  const activeSourceCount = chat.activeSources.length;

  async function exportChat() {
    if (!chat.messages.length) {
      return;
    }
    const blob = await api.exportChat(chat.messages, "markdown");
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "research-chat-citations.md";
    link.click();
    URL.revokeObjectURL(url);
  }

  function selectSource(source: SourceReference) {
    chat.setSelectedSource(source);
    setMobileTab("sources");
  }

  function showSources(sources: SourceReference[]) {
    chat.setActiveSources(sources);
    if (sources[0]) {
      selectSource(sources[0]);
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-transparent text-[var(--foreground)]">
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface-glass)] shadow-[0_14px_40px_rgba(23,50,77,0.08)] backdrop-blur-xl">
        <div className="flex flex-col gap-3 px-4 py-3 lg:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--accent)] shadow-sm">
                <BookOpenCheck className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                  Local Research Command Center
                </p>
                <h1 className="truncate text-xl font-semibold">Trợ lý nghiên cứu RAG</h1>
                <p className="hidden text-sm text-[var(--muted)] sm:block">
                  Private papers, local embeddings, Ollama answers, evidence you can inspect.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge />
              <button
                className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--border)] bg-white px-3 text-sm font-medium text-[var(--foreground)] shadow-sm hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!chat.messages.length}
                onClick={() => void exportChat()}
                type="button"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
              <button
                className="inline-flex h-10 items-center gap-2 rounded-md bg-[var(--accent)] px-3 text-sm font-semibold text-white shadow-sm hover:bg-[var(--accent-strong)]"
                onClick={chat.clearHistory}
                type="button"
              >
                <RotateCcw className="h-4 w-4" />
                New chat
              </button>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            <MetricPill icon={ShieldCheck} label="Runtime" value="100% local/free" />
            <MetricPill icon={FileText} label="Papers" value={`${papers.papers.length} files`} />
            <MetricPill icon={Database} label="Vector DB" value={`${papers.totalChunks} chunks`} />
            <MetricPill
              icon={HardDrive}
              label="Evidence"
              value={activeSourceCount ? `${activeSourceCount} active sources` : "Ready for query"}
            />
          </div>
        </div>
      </header>

      <nav className="grid grid-cols-3 border-b border-[var(--border)] bg-[var(--surface-glass)] text-sm shadow-sm backdrop-blur lg:hidden">
        {[
          ["papers", "Papers"],
          ["chat", "Chat"],
          ["sources", "Nguồn"],
        ].map(([value, label]) => (
          <button
            key={value}
            className={`px-3 py-3 font-semibold ${
              mobileTab === value
                ? "border-b-2 border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                : "text-[var(--muted)] hover:bg-white/70"
            }`}
            onClick={() => setMobileTab(value as MobileTab)}
            type="button"
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[310px_minmax(390px,0.9fr)_minmax(520px,1.2fr)]">
        <div className={`${mobileTab === "papers" ? "flex" : "hidden"} min-h-0 lg:flex`}>
          <PaperManager papers={papers} />
        </div>
        <div className={`${mobileTab === "chat" ? "flex" : "hidden"} min-h-0 lg:flex`}>
          <ChatWindow
            chat={chat}
            papers={papers.papers}
            onSelectSource={selectSource}
            onShowSources={showSources}
          />
        </div>
        <div className={`${mobileTab === "sources" ? "flex" : "hidden"} min-h-0 lg:flex`}>
          <EvidenceWorkspace
            papers={papers.papers}
            selectedSource={chat.selectedSource}
            sources={chat.activeSources}
            onSelectSource={selectSource}
          />
        </div>
      </div>
    </main>
  );
}
