import type {
  ChatResponse,
  IngestJob,
  Message,
  PaperInfo,
  SystemHealth,
} from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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
  ): Promise<ChatResponse> {
    const response = await fetch(`${API_BASE}/api/chat/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        conversation_history: toBackendHistory(history),
        filter_file: filterFile || null,
      }),
    });
    return assertOk(response).json();
  },

  async chatStream(
    query: string,
    history: Message[],
    filterFile?: string | null,
  ): Promise<ReadableStream<Uint8Array>> {
    const response = await fetch(`${API_BASE}/api/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        conversation_history: toBackendHistory(history),
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

  async deletePaper(fileName: string): Promise<void> {
    const response = await fetch(
      `${API_BASE}/api/ingest/files/${encodeURIComponent(fileName)}`,
      { method: "DELETE" },
    );
    assertOk(response);
  },
};
