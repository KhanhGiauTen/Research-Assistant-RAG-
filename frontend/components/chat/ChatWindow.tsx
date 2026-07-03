import { Filter, MessageSquareText, Sparkles } from "lucide-react";

import { InputBar } from "@/components/chat/InputBar";
import { MessageList } from "@/components/chat/MessageList";
import type { useChat } from "@/lib/hooks/useChat";
import type { PaperInfo, SourceReference } from "@/lib/types";

interface ChatWindowProps {
  chat: ReturnType<typeof useChat>;
  papers: PaperInfo[];
  onSelectSource: (source: SourceReference) => void;
  onShowSources: (sources: SourceReference[]) => void;
}

export function ChatWindow({
  chat,
  papers,
  onSelectSource,
  onShowSources,
}: ChatWindowProps) {
  const selectedPaper = papers.find((paper) => paper.file_name === chat.selectedFile);

  return (
    <section className="flex min-h-0 flex-1 flex-col border-x border-[var(--border)] bg-[var(--surface)]">
      <header className="border-b border-[var(--border)] bg-[var(--surface-raised)] px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
              Workspace
            </p>
            <h2 className="text-lg font-semibold">Chat Workspace</h2>
            <p className="text-sm text-[var(--muted)]">
              Hỏi đáp trên paper local, câu trả lời có citation và evidence.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-white px-2.5 py-1.5 font-medium text-[var(--muted)] shadow-sm">
              <MessageSquareText className="h-3.5 w-3.5 text-[var(--accent)]" />
              {chat.messages.length} messages
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-white px-2.5 py-1.5 font-medium text-[var(--muted)] shadow-sm">
              <Filter className="h-3.5 w-3.5 text-[var(--accent)]" />
              {selectedPaper?.display_title ?? "All papers"}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 font-medium text-emerald-800 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Evidence-first
            </span>
          </div>
        </div>
      </header>

      <MessageList
        messages={chat.messages}
        onPromptSelect={(prompt) => void chat.sendMessage(prompt)}
        onSelectSource={onSelectSource}
        onShowSources={onShowSources}
      />
      <InputBar
        disabled={chat.isLoading}
        papers={papers}
        selectedFile={chat.selectedFile}
        onSelectedFileChange={chat.setSelectedFile}
        onSend={chat.sendMessage}
      />
    </section>
  );
}
