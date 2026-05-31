import { ChatWindow } from "@/components/chat/ChatWindow";
import { PaperManager } from "@/components/papers/PaperManager";

export default function Home() {
  return (
    <main className="grid min-h-screen grid-cols-1 bg-[var(--background)] text-[var(--foreground)] lg:grid-cols-[minmax(0,1fr)_360px]">
      <ChatWindow />
      <PaperManager />
    </main>
  );
}
