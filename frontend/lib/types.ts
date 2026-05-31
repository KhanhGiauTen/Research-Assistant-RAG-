export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceReference[];
  isStreaming?: boolean;
  timestamp: Date;
}

export interface HighlightRange {
  start: number;
  end: number;
  kind: "query" | "answer" | string;
}

export interface SourceReference {
  rank: number;
  citation_id: string;
  chunk_id: string;
  file_id: string;
  file_name: string;
  display_title: string;
  page_number: number;
  chunk_index: number;
  section_name?: string | null;
  score: number;
  quote: string;
  context: string;
  highlight_ranges: HighlightRange[];
  pdf_url?: string | null;
  page_text_url?: string | null;
  excerpt: string;
}

export interface PaperInfo {
  file_id: string;
  file_name: string;
  display_title: string;
  chunk_count: number;
  pdf_url?: string | null;
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

export interface ChatSession {
  session_id: string;
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
  created_at: string;
  last_active: string;
  filter_file?: string | null;
}

export interface PageTextResponse {
  file_id: string;
  file_name: string;
  display_title: string;
  page_number: number;
  text: string;
}

export type StreamEvent =
  | { type: "token"; content: string }
  | { type: "sources"; sources: SourceReference[] }
  | { type: "done" }
  | { type: "error"; message: string };
