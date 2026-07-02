# Kiến Trúc Dự Án

Cập nhật gần nhất: 2026-07-02 15:43:38 +07:00

Người cập nhật: KhanhGiauTen

## Mục Tiêu

`Local Research Assistant RAG` là chatbot RAG phục vụ nghiên cứu paper PDF chạy local/free. Dự án ưu tiên:

- Ingest và quản lý nhiều PDF nghiên cứu trên máy cá nhân.
- Hỏi đáp bằng tiếng Việt hoặc tiếng Anh dựa trên nội dung paper đã index.
- Luôn trả nguồn dẫn rõ ràng: citation id, paper, trang, quote, context, score.
- UI dạng research cockpit gồm quản lý paper, chat workspace, và evidence/PDF viewer.
- Không gửi PDF hoặc vector DB lên dịch vụ trả phí; embedding và LLM chạy local.

## Stack Chính

- Backend: Python 3.11, FastAPI, Pydantic, PyMuPDF, ChromaDB, sentence-transformers, Ollama client.
- Embedding: `sentence-transformers/all-MiniLM-L6-v2`.
- Vector store: ChromaDB persistent local trong `backend/chroma_db`.
- LLM: Ollama, mặc định `llama3.2:3b`.
- Frontend: Next.js 15, React 18, TypeScript, Tailwind CSS, `lucide-react`.
- PDF visual: browser-native iframe viewer trỏ tới endpoint PDF local, tránh phụ thuộc `pdfjs-dist` trong Next.js dev/build.
- Local scripts: PowerShell trong `scripts/`.

## Cấu Trúc Thư Mục

```text
backend/app/main.py              -> FastAPI app, CORS, router, startup health
backend/app/config.py            -> settings/env/path resolver
backend/app/api/                 -> chat, ingest, files, sources endpoints
backend/app/ingestion/           -> parse PDF, chunk, embed
backend/app/retrieval/           -> Chroma vector store, retriever, evidence, cache
backend/app/generation/          -> Ollama prompt/generate/stream client
backend/app/documents.py         -> file_id, title, paper resolver, page text
backend/tests/                   -> backend contract/regression tests
backend/data/papers/             -> PDF local, ignored khỏi git
backend/chroma_db/               -> Chroma persistent DB, ignored khỏi git
frontend/app/                    -> Next app shell route/global CSS
frontend/components/             -> cockpit UI: papers, chat, evidence, status
frontend/lib/                    -> API client, hooks, shared types
scripts/                         -> setup/start/check/stop/ingest local
docs/ARCHITECTURE.md             -> bản đồ kiến trúc cho phiên mới
docs/implement-notes.html        -> nhật ký thay đổi/quyết định theo card
AGENTS.md                        -> luật bắt buộc cho agent/Codex session
```

## Luồng RAG Hiện Tại

1. User upload PDF qua frontend hoặc đặt file trong `backend/data/papers`.
2. Backend validate PDF, lưu trong thư mục papers, tạo background ingest job.
3. `parse_pdf` trích text theo trang, `chunk_document` chia chunk có metadata trang/section/reference.
4. `embed_chunks` tạo embedding local bằng sentence-transformers.
5. `upsert_chunks` lưu chunk vào ChromaDB; query cache bị invalidate sau ingest/delete.
6. User hỏi qua `/api/chat/stream` hoặc `/api/chat/query`.
7. `retrieve` embed query, query Chroma, cộng lexical boost nhẹ, lọc references khi câu hỏi không hỏi tài liệu tham khảo, giảm trùng page.
8. `build_source_references` tạo `SourceReference`: citation `[N]`, file/page/chunk id, quote, context, highlight ranges, PDF/page URL.
9. Streaming API emit `sources` sớm và re-emit khi `done` để evidence panel luôn rehydrate được source state.
10. Nếu Ollama sẵn sàng, backend gọi model với prompt chỉ trả lời từ context và cite bằng `[N]`; nếu không, API degrade bằng cách trả retrieved passages.
11. Frontend hiển thị answer, citation chips, quote/context highlight và PDF visual viewer mở đúng file/page.

## Endpoint Quan Trọng

```text
GET  /health
GET  /api/chat/health
POST /api/chat/query
POST /api/chat/stream
POST /api/chat/sessions
GET  /api/chat/sessions/{session_id}
DELETE /api/chat/sessions/{session_id}
POST /api/chat/export
POST /api/ingest/upload
GET  /api/ingest/status/{job_id}
GET  /api/ingest/files
DELETE /api/ingest/files/{file_name}
GET  /api/files/{file_id}/pdf
GET  /api/files/{file_id}/pages/{page_number}
GET  /api/sources/{chunk_id}
```

## Contract Source/Evidence

`SourceReference` hiện gồm các trường chính:

```text
rank, citation_id, chunk_id, file_id, file_name, display_title,
page_number, chunk_index, section_name, score, quote, context,
highlight_ranges, pdf_url, page_text_url, excerpt
```

Quy ước:

- `file_id` ưu tiên hash nội dung PDF; fallback là hash tên file.
- `pdf_url` và `page_text_url` chỉ resolve file nằm trong `backend/data/papers`.
- Highlight range tính trên `quote`, render an toàn ở frontend, không dùng HTML injection.
- Citation `[N]` gắn với rank retrieval và được dùng trong answer.

## Frontend Hiện Tại

- `AppShell` là màn hình chính dạng cockpit.
- Desktop chia 3 vùng: Paper Library, Chat Workspace, Evidence/PDF Viewer.
- Mobile/tablet dùng tabs `Papers`, `Chat`, `Nguồn`.
- `useChat` dùng SSE stream, lưu `session_id` trong localStorage, cập nhật sources khi nhận event `sources`.
- `usePapers` quản lý list/upload/poll/delete paper.
- `EvidenceWorkspace` nhận `activeSources` và `selectedSource`, hỗ trợ xem nguồn liên quan khi click citation.
- `PdfEvidenceViewerClient` dùng iframe native với page anchor, zoom state và nút mở PDF tab mới.
- Ảnh xác minh UI nằm trong `docs/assets/screenshots/` và được README dùng để recap desktop/mobile.

## Lệnh Chạy Local

```powershell
.\scripts\setup_local.ps1 -InstallMissingTools
.\scripts\start_local.ps1
.\scripts\check_local.ps1
.\scripts\stop_local.ps1
```

Manual backend:

```powershell
cd backend
py -3.11 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

Manual frontend:

```powershell
cd frontend
npm install
Copy-Item .env.local.example .env.local
npm run dev
```

## Kiểm Thử Và Verify

Backend:

```powershell
.\backend\.venv\Scripts\python.exe -m compileall backend\app backend\tests
.\backend\.venv\Scripts\python.exe -m pytest .\backend\tests -q
```

Frontend:

```powershell
cd frontend
npm audit --audit-level=moderate
npm run lint
npm run build
```

Runtime:

```powershell
.\scripts\start_local.ps1
.\scripts\check_local.ps1
```

## Chính Sách Dữ Liệu

Không commit các dữ liệu/artifact local:

- `.env`, `backend/.env`, `frontend/.env.local`
- `backend/data/papers/*.pdf`
- `backend/chroma_db/*`
- `.local/`, `logs/`, `tasks/`
- `frontend/node_modules/`, `frontend/.next/`
- cache Python/pytest/mypy/ruff

## Quy Ước Làm Việc Dài Hạn

- Mỗi phiên mới phải đọc `AGENTS.md`, `docs/ARCHITECTURE.md`, và `docs/implement-notes.html`.
- Mọi thay đổi đụng mã nguồn phải thêm card mới vào `docs/implement-notes.html`.
- Nếu thay đổi làm khác cách chạy, API contract, kiến trúc, dependency, hoặc dữ liệu, cập nhật file này cùng commit.
- Tái cấu trúc lớn phải chia thành các commit nhỏ có kiểm thử và note riêng.
- Ưu tiên giữ dự án local-first, evidence-first, không paid/cloud dependency.
