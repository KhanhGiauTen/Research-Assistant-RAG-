"use client";

import { Download, RotateCcw } from "lucide-react";
import { useState } from "react";

import { ChatWindow } from "@/components/chat/ChatWindow";
import { EvidenceWorkspace } from "@/components/evidence/EvidenceWorkspace";
import { PaperManager } from "@/components/papers/PaperManager";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { api } from "@/lib/api";
import { useChat } from "@/lib/hooks/useChat";
import { usePapers } from "@/lib/hooks/usePapers";
import type { SourceReference } from "@/lib/types";

type MobileTab = "papers" | "chat" | "sources";

export function AppShell() {
  const chat = useChat();
  const papers = usePapers();
  const [mobileTab, setMobileTab] = useState<MobileTab>("chat");

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
    <main className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-white/90 px-4 py-3 shadow-sm backdrop-blur lg:px-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
            Local Research Cockpit
          </p>
          <h1 className="text-xl font-semibold">Trợ lý nghiên cứu RAG</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge />
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--border)] bg-white px-3 text-sm hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!chat.messages.length}
            onClick={() => void exportChat()}
            type="button"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--border)] bg-white px-3 text-sm hover:bg-[var(--surface-muted)]"
            onClick={chat.clearHistory}
            type="button"
          >
            <RotateCcw className="h-4 w-4" />
            New chat
          </button>
        </div>
      </header>

      <nav className="grid grid-cols-3 border-b border-[var(--border)] bg-white text-sm lg:hidden">
        {[
          ["papers", "Papers"],
          ["chat", "Chat"],
          ["sources", "Nguồn"],
        ].map(([value, label]) => (
          <button
            key={value}
            className={`px-3 py-3 font-medium ${
              mobileTab === value
                ? "bg-[var(--surface-muted)] text-[var(--accent)]"
                : "text-[var(--muted)]"
            }`}
            onClick={() => setMobileTab(value as MobileTab)}
            type="button"
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[290px_minmax(360px,0.95fr)_minmax(480px,1.15fr)]">
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
