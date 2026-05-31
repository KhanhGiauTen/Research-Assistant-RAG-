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
  return (
    <section className="flex min-h-0 flex-1 flex-col border-x border-[var(--border)] bg-[var(--surface)]">
      <header className="border-b border-[var(--border)] px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold">Chat Workspace</h2>
          <p className="text-sm text-[var(--muted)]">
            Hỏi đáp trên paper local, câu trả lời có citation và evidence.
          </p>
        </div>
      </header>

      <MessageList
        messages={chat.messages}
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
