"use client";

import { RotateCcw } from "lucide-react";

import { InputBar } from "@/components/chat/InputBar";
import { MessageList } from "@/components/chat/MessageList";
import { SourcePanel } from "@/components/chat/SourcePanel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useChat } from "@/lib/hooks/useChat";
import { usePapers } from "@/lib/hooks/usePapers";

export function ChatWindow() {
  const chat = useChat();
  const { papers } = usePapers();

  return (
    <section className="flex min-h-screen flex-col border-r border-[var(--border)] bg-[var(--surface)]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
        <div>
          <h1 className="text-xl font-semibold">Research Assistant RAG</h1>
          <p className="text-sm text-[var(--muted)]">
            Ask questions over indexed local papers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge />
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm hover:bg-[var(--surface-muted)]"
            onClick={chat.clearHistory}
            title="Clear chat history"
            type="button"
          >
            <RotateCcw className="h-4 w-4" />
            Clear
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-h-0 flex-col">
          <MessageList
            messages={chat.messages}
            onShowSources={chat.setActiveSources}
          />
          <InputBar
            disabled={chat.isLoading}
            papers={papers}
            selectedFile={chat.selectedFile}
            onSelectedFileChange={chat.setSelectedFile}
            onSend={chat.sendMessage}
          />
        </div>
        <SourcePanel sources={chat.activeSources} />
      </div>
    </section>
  );
}
