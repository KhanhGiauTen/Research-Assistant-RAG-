export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceReference[];
  isStreaming?: boolean;
  timestamp: Date;
}

export interface SourceReference {
  rank: number;
  file_name: string;
  page_number: number;
  score: number;
  excerpt: string;
}

export interface PaperInfo {
  file_name: string;
  chunk_count: number;
}

export interface SystemHealth {
  llm: {
    available: boolean;
    model_loaded?: boolean;
    model: string;
    error?: string | null;
  };
  vector_store: {
    total_chunks: number;
    files: number;
  };
  embedding_model: string;
  status: "ready" | "degraded" | "unavailable";
}

export interface IngestJob {
  job_id: string;
  files: string[];
  status: "queued" | "processing" | "completed" | "failed";
  progress?: string;
  message?: string;
  error?: string | null;
  chunks_indexed?: number;
}

export interface ChatResponse {
  answer: string;
  sources: SourceReference[];
  query: string;
  retrieved_chunks: number;
}

export type StreamEvent =
  | { type: "token"; content: string }
  | { type: "sources"; sources: SourceReference[] }
  | { type: "done" }
  | { type: "error"; message: string };
