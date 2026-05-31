import type {
  ChatResponse,
  ChatSession,
  IngestJob,
  Message,
  PaperInfo,
  PageTextResponse,
  SystemHealth,
} from "@/lib/types";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function toApiUrl(path?: string | null): string | null {
  if (!path) {
    return null;
  }
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return `${API_BASE}${path}`;
}

function assertOk(response: Response): Response {
  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }
  return response;
}

function toBackendHistory(messages: Message[]) {
  return messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));
}

export const api = {
  async getHealth(): Promise<SystemHealth> {
    const response = await fetch(`${API_BASE}/api/chat/health`, {
      cache: "no-store",
    });
    return assertOk(response).json();
  },

  async chat(
    query: string,
    history: Message[],
    filterFile?: string | null,
    sessionId?: string | null,
  ): Promise<ChatResponse> {
    const response = await fetch(`${API_BASE}/api/chat/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        conversation_history: toBackendHistory(history),
        session_id: sessionId || null,
        filter_file: filterFile || null,
      }),
    });
    return assertOk(response).json();
  },

  async chatStream(
    query: string,
    history: Message[],
    filterFile?: string | null,
    sessionId?: string | null,
  ): Promise<ReadableStream<Uint8Array>> {
    const response = await fetch(`${API_BASE}/api/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        conversation_history: toBackendHistory(history),
        session_id: sessionId || null,
        filter_file: filterFile || null,
      }),
    });
    assertOk(response);
    if (!response.body) {
      throw new Error("Streaming response has no body");
    }
    return response.body;
  },

  async uploadPapers(files: File[]): Promise<IngestJob> {
    const body = new FormData();
    for (const file of files) {
      body.append("files", file);
    }
    const response = await fetch(`${API_BASE}/api/ingest/upload`, {
      method: "POST",
      body,
    });
    return assertOk(response).json();
  },

  async getJobStatus(jobId: string): Promise<IngestJob> {
    const response = await fetch(`${API_BASE}/api/ingest/status/${jobId}`, {
      cache: "no-store",
    });
    return assertOk(response).json();
  },

  async listPapers(): Promise<{ files: PaperInfo[]; total_chunks: number }> {
    const response = await fetch(`${API_BASE}/api/ingest/files`, {
      cache: "no-store",
    });
    return assertOk(response).json();
  },

  async getPageText(url: string): Promise<PageTextResponse> {
    const response = await fetch(toApiUrl(url) ?? url, {
      cache: "no-store",
    });
    return assertOk(response).json();
  },

  async deletePaper(fileName: string): Promise<void> {
    const response = await fetch(
      `${API_BASE}/api/ingest/files/${encodeURIComponent(fileName)}`,
      { method: "DELETE" },
    );
    assertOk(response);
  },

  async createSession(): Promise<ChatSession> {
    const response = await fetch(`${API_BASE}/api/chat/sessions`, {
      method: "POST",
    });
    return assertOk(response).json();
  },

  async getSession(sessionId: string): Promise<ChatSession> {
    const response = await fetch(`${API_BASE}/api/chat/sessions/${sessionId}`, {
      cache: "no-store",
    });
    return assertOk(response).json();
  },

  async deleteSession(sessionId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/api/chat/sessions/${sessionId}`, {
      method: "DELETE",
    });
    assertOk(response);
  },

  async exportChat(
    messages: Message[],
    format: "markdown" | "json" | "txt" = "markdown",
  ): Promise<Blob> {
    const response = await fetch(`${API_BASE}/api/chat/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        format,
        messages: messages.map((message) => ({
          role: message.role,
          content: message.content,
          sources: message.sources ?? [],
        })),
      }),
    });
    return assertOk(response).blob();
  },
};
