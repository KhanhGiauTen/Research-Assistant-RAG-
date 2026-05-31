# Local Research Assistant RAG

Chatbot RAG cho paper PDF chạy hoàn toàn trên máy cá nhân với chi phí API bằng 0. Dữ liệu không cần gửi ra dịch vụ trả phí: PDF được parse local, embedding chạy bằng `sentence-transformers`, vector store lưu bằng ChromaDB, và phần sinh câu trả lời dùng Ollama.

## Mục Tiêu Sản Phẩm

Ứng dụng hướng tới trải nghiệm đọc paper và hỏi đáp nghiên cứu theo kiểu "research cockpit":

- User upload hoặc ingest nhiều paper PDF local.
- Chatbot trả lời bằng tiếng Việt hoặc tiếng Anh tùy câu hỏi.
- Mỗi câu trả lời luôn có nguồn dẫn rõ ràng: tên paper, trang, độ liên quan, đoạn trích.
- UI hiển thị trực tiếp các nguồn quan trọng ở một nửa màn hình để user không cần mở file PDF thủ công.
- Khi user hỏi, hệ thống highlight câu/đoạn liên quan trong source panel và trong câu trả lời.
- Tất cả chạy local/free: Python, FastAPI, ChromaDB, Sentence Transformers, Ollama, Next.js.

## Kiến Trúc Hiện Tại

```text
backend/data/papers     -> PDF local, ignored khỏi git
backend/app/ingestion   -> parse PDF, normalize text, chunk, embed
backend/app/retrieval   -> ChromaDB persistent retrieval
backend/app/generation  -> Ollama LLM client
backend/app/api         -> FastAPI endpoints
frontend                -> Next.js chat UI
scripts                 -> setup/start/check/stop local trên Windows
```

Runtime local:

- Embedding model: `sentence-transformers/all-MiniLM-L6-v2`
- Vector DB: ChromaDB persistent local
- LLM: Ollama `llama3.2:3b`
- Backend: FastAPI
- Frontend: Next.js + TypeScript + Tailwind

## Trạng Thái Đã Hoàn Thành

Các phase nền tảng đã xong và đã push lên `main`:

1. Setup monorepo local-first.
2. PDF ingestion pipeline.
3. ChromaDB vector store.
4. Ollama generation client.
5. FastAPI RAG API.
6. Next.js frontend.
7. Polish local: cache, setup guide, tests, export, scripts.
8. Local smoothing: Node/NPM, Ollama, model pull, audit, lint/build, start/check/stop scripts.

Commit gần nhất:

```text
6269fc8 chore: smooth local developer setup
```

Health local đã verify:

```text
BackendStatus      : ok
OllamaModel        : llama3.2:3b
LlmAvailable       : True
ModelLoaded        : True
VectorChunks       : 81
FrontendStatusCode : 200
```

Nếu port `3000/8000` đang bận, script tự chọn port kế tiếp, ví dụ:

```text
Backend:  http://127.0.0.1:8001
Frontend: http://127.0.0.1:3001
```

## Quick Start

Xem thêm `SETUP.md` để chạy đầy đủ backend, frontend và Ollama. PDF nghiên cứu đặt trong `backend/data/papers`; thư mục này được ignore để tránh commit dữ liệu cá nhân.

Trên Windows, đường nhanh nhất:

```powershell
.\scripts\setup_local.ps1 -InstallMissingTools
.\scripts\start_local.ps1
.\scripts\check_local.ps1
```

Dừng app:

```powershell
.\scripts\stop_local.ps1
```

Test backend:

```powershell
.\backend\.venv\Scripts\python.exe -m pytest .\backend\tests -v
```

Test frontend:

```powershell
cd frontend
npm audit --audit-level=moderate
npm run lint
npm run build
```

## Master Plan Hoàn Thiện Dự Án

Kế hoạch dưới đây là bản triển khai tối đa cho lần làm tiếp theo, ưu tiên đúng các yêu cầu: show nguồn trích dẫn, source panel chiếm nửa UI, highlight thông tin khi truy vấn, UI thân thiện/chuyên nghiệp với palette lạnh/pastel, và giữ toàn bộ app local/free.

### Phase A - Evidence-First RAG Contract

Mục tiêu: backend không chỉ trả `answer` và `sources`, mà trả đủ dữ liệu để UI hiển thị evidence đẹp, highlight chính xác, và debug retrieval.

Việc cần làm:

1. Chuẩn hóa schema response cho chat:

```json
{
  "answer": "...",
  "sources": [
    {
      "file_id": "...",
      "filename": "Quantified Neural Markov Logic Networks.pdf",
      "title": "Quantified Neural Markov Logic Networks",
      "page": 3,
      "chunk_id": "...",
      "chunk_index": 12,
      "similarity": 0.82,
      "quote": "short exact source excerpt...",
      "context_before": "...",
      "context_after": "...",
      "highlight_terms": ["Markov logic", "quantified"],
      "answer_refs": ["[1]", "[2]"]
    }
  ],
  "retrieval": {
    "query": "...",
    "top_k": 6,
    "threshold": 0.35,
    "returned": 4,
    "fallback_used": false
  }
}
```

2. Tách rõ 3 lớp source text:

- `quote`: đoạn ngắn nhất để trích dẫn trực tiếp trong UI.
- `context_before/context_after`: text hỗ trợ đọc rộng hơn.
- `full_chunk`: chỉ gửi khi user mở rộng, tránh response quá nặng.

3. Thêm endpoint lấy chi tiết source:

```text
GET /api/sources/{chunk_id}
GET /api/files/{file_id}/pages/{page}
GET /api/files/{file_id}/outline
```

4. Thêm `file_id` ổn định:

- Hash theo file content hoặc normalized filename + size + modified time.
- Dùng `file_id` cho delete, list, citations, source viewer.

5. Thêm citation numbering ổn định:

- Backend map source theo thứ tự similarity.
- Answer prompt bắt buộc trích `[1]`, `[2]`.
- UI click citation sẽ scroll source panel tới đúng card.

Acceptance criteria:

- Query nào cũng trả `sources[]` có `quote`, `page`, `similarity`, `chunk_id`.
- Nếu Ollama offline, API vẫn trả retrieved sources và message degrade.
- Không gửi PDF hay Chroma DB lên git.

### Phase B - Highlight Engine

Mục tiêu: highlight thông tin quan trọng khi user hỏi và khi model trả lời.

Việc cần làm:

1. Backend tạo highlight terms:

- Normalize query.
- Loại stopwords tiếng Việt/Anh.
- Lấy phrase quan trọng bằng rule đơn giản trước: n-gram 1-4 từ.
- Match case-insensitive vào quote/context.
- Trả `highlight_ranges` thay vì chỉ trả string term nếu muốn chính xác hơn.

Schema đề xuất:

```json
{
  "highlight_ranges": [
    { "start": 24, "end": 47, "label": "query_term" },
    { "start": 112, "end": 150, "label": "answer_support" }
  ]
}
```

2. Frontend render highlight an toàn:

- Không dùng `dangerouslySetInnerHTML`.
- Cắt text thành spans theo ranges.
- Class Tailwind:
  - query term: `bg-cyan-100 text-cyan-950`
  - answer support: `bg-indigo-100 text-indigo-950`
  - exact citation: `bg-emerald-100 text-emerald-950`

3. Highlight trong answer:

- Detect citation marker `[1]`, `[2]`.
- Click marker mở source tương ứng.
- Hover marker preview quote.

4. Highlight trong source panel:

- Query term được tô pastel cyan.
- Đoạn được model dùng để trả lời tô pastel indigo.
- Source đang selected có border xanh lạnh.

Acceptance criteria:

- User hỏi một câu, source panel tự scroll tới đoạn liên quan nhất.
- Citation click hoạt động ổn định.
- Highlight không phá layout khi text dài hoặc có ký tự lạ từ PDF.

### Phase C - UI/UX Redesign: Research Cockpit

Mục tiêu: nâng UI lên mức thân thiện, chuyên nghiệp, bố cục hợp lý, màu lạnh/pastel.

Layout desktop:

```text
+--------------------------------------------------------------------------------+
| Top Bar: app name, local status, model, vector stats, actions                   |
+----------------------+-----------------------------+---------------------------+
| Paper Library        | Chat / Answer Workspace     | Evidence Source Viewer    |
| 260-320px            | 42-48% width                 | 42-50% width              |
|                      |                             |                           |
| - Upload             | - Message list              | - Active paper/page       |
| - Ingest all         | - Answer cards              | - Source quote cards      |
| - Paper list         | - Citation chips            | - Highlighted snippets    |
| - Search papers      | - Streaming state           | - Similarity/page badges  |
| - Delete             | - Export                    | - Expand context          |
+----------------------+-----------------------------+---------------------------+
```

Layout tablet/mobile:

- Dùng tabs: `Chat`, `Sources`, `Papers`.
- Source panel không biến mất; chuyển thành tab thứ hai.
- Citation click tự chuyển sang tab `Sources`.

Palette lạnh/pastel:

```text
Background base:  #F6FAFD
Surface:          #FFFFFF
Surface subtle:   #EEF7FA
Border:           #D7E7EF
Primary:          #2F80A7
Primary hover:    #256B8D
Accent cyan:      #BDECF4
Accent indigo:    #DDE7FF
Accent mint:      #DDF7EA
Text strong:      #17324D
Text muted:       #62748A
Warning soft:     #FFF3C4
Error soft:       #FFE1E1
```

Component plan:

1. `AppShell`
   - Full-height layout.
   - Top status bar.
   - Responsive grid.

2. `PaperLibraryPanel`
   - Upload dropzone.
   - File list with ingest status.
   - Search/filter by filename/title.
   - Delete confirmation.
   - Empty state friendly.

3. `ChatPanel`
   - Streaming answer card.
   - Query textarea with shortcut `Ctrl+Enter`.
   - Suggested prompts from loaded papers.
   - Citation chips in answer.
   - Error/degraded states.

4. `EvidencePanel`
   - Shows top sources for selected answer.
   - Source cards grouped by paper.
   - Quote + context expand.
   - Similarity score pill.
   - Page badge.
   - Click-to-pin source.

5. `SourceCard`
   - Header: `[1] Paper title - p. 4 - 82%`
   - Body: highlighted quote.
   - Footer: buttons `Use as context`, `Copy quote`, `Expand`.

6. `StatusBadge`
   - Backend online/offline.
   - Ollama online/offline.
   - Model loaded.
   - Vector chunks count.

7. `ExportMenu`
   - Markdown.
   - JSON.
   - TXT.
   - Include citations option.

Acceptance criteria:

- First viewport đã có đủ paper manager, chat, source viewer.
- Không dùng hero/marketing layout.
- Không nested cards nặng nề.
- Không dùng màu tím đậm, beige, brown/orange.
- Text không tràn, panel scroll riêng, mobile không vỡ.

### Phase D - Paper Viewer Và Source Loading

Mục tiêu: "nửa UI là paper load các nguồn quan trọng" theo đúng ý user.

Triển khai theo mức tăng dần:

1. Mức 1 - Text evidence viewer:

- Source panel hiển thị quote/context từ chunk.
- Group theo paper và page.
- Highlight query terms.
- Không cần render PDF binary.

2. Mức 2 - Page text viewer:

- Endpoint `/api/files/{file_id}/pages/{page}` trả text trang.
- Source panel có toggle `Quote` / `Page text`.
- Khi mở page text, scroll tới quote match gần nhất.

3. Mức 3 - PDF visual preview:

- Cân nhắc dùng `react-pdf` hoặc browser PDF embed local.
- Backend serve PDF chỉ từ thư mục `backend/data/papers`.
- Validate path bằng `file_id`, không expose arbitrary path.
- Nếu PDF render nặng, để optional.

Ưu tiên đề xuất:

- Làm mức 1 và 2 trước vì ổn định, nhanh, không phát sinh dependency nặng.
- Chỉ làm mức 3 khi text evidence viewer đã mượt.

Acceptance criteria:

- Nửa phải UI luôn có source viewer, kể cả khi chưa hỏi.
- Khi chưa có answer, hiển thị top papers/recent ingested files.
- Khi có answer, panel chuyển sang "Sources for this answer".

### Phase E - Retrieval Quality Upgrade

Mục tiêu: câu trả lời đúng nguồn hơn, ít hallucination hơn.

Việc cần làm:

1. Hybrid retrieval nhẹ, vẫn free:

- Dense retrieval hiện tại bằng sentence-transformers.
- Thêm lexical score local bằng BM25 hoặc TF-IDF đơn giản.
- Merge score: `0.75 * dense + 0.25 * lexical`.

2. MMR diversification:

- Tránh top 6 đều là các chunk gần nhau.
- Giữ đa dạng page/paper nếu similarity không chênh quá lớn.

3. Query expansion nhẹ:

- Ollama offline thì dùng rule-based synonyms.
- Ollama online thì tạo 2-3 reformulations, nhưng giới hạn timeout.

4. Rerank local:

- Giai đoạn đầu dùng heuristic.
- Nếu máy chịu được, có thể thêm cross-encoder nhỏ local sau.

5. Retrieval debug mode:

```text
GET /api/chat/query?debug=true
```

Trả thêm:

- raw dense score
- lexical score
- final score
- threshold reason
- dropped chunks

Acceptance criteria:

- Answer có citation đầy đủ hơn.
- Source panel không bị trùng quá nhiều đoạn cùng một page.
- Query khó vẫn trả "không đủ thông tin" nếu sources yếu.

### Phase F - Prompt Và Answer Formatting

Mục tiêu: câu trả lời có cấu trúc, đúng context, dễ đọc.

Prompt rule:

- Chỉ trả lời từ context.
- Nếu không đủ thông tin, nói rõ phần nào chưa đủ.
- Mỗi claim quan trọng cần citation `[n]`.
- Không bịa title/page.
- Giữ thuật ngữ chuyên ngành nếu cần.
- Ưu tiên tiếng Việt nếu user hỏi tiếng Việt.

Answer format đề xuất:

```text
Tóm tắt ngắn:
- ...

Chi tiết:
1. ...
2. ...

Bằng chứng chính:
- [1] ...
- [2] ...

Giới hạn:
- ...
```

Streaming:

- SSE event `token`: token answer.
- SSE event `sources`: sources đã retrieve.
- SSE event `done`: metadata cuối.
- SSE event `error`: lỗi degrade.

Frontend behavior:

- Source panel có thể hiện sources ngay khi event `sources` tới, trước khi answer stream xong.
- Answer token streaming không làm layout nhảy mạnh.

### Phase G - State, Sessions, Và Export

Mục tiêu: dùng lâu hơn, không mất cuộc trò chuyện.

Việc cần làm:

1. Session memory local:

- Frontend localStorage lưu conversations.
- Backend in-memory session optional.
- Không cần database trả phí.

2. Conversation sidebar nhẹ:

- New chat.
- Rename chat.
- Delete chat.
- Last updated.

3. Export nâng cấp:

- Markdown: answer + citations + source quotes.
- JSON: full structured data.
- TXT: readable transcript.

4. Save source pins:

- User pin source quan trọng.
- Export kèm pinned sources.

Acceptance criteria:

- Reload frontend không mất chat gần nhất.
- Export markdown đọc được như research note.

### Phase H - Reliability, Performance, Và Local Smoothness

Mục tiêu: app ít lỗi, chạy ổn trên máy cá nhân.

Việc cần làm:

1. Backend:

- Timeout rõ cho Ollama.
- Retry nhẹ cho transient errors.
- Degraded answer khi LLM down.
- Cache query theo `(query, file_version_hash, top_k)`.
- Invalidate cache khi ingest/delete.
- Log structured hơn.

2. Frontend:

- Error boundaries.
- Toast notification.
- Loading skeleton.
- Empty states rõ.
- Cancel streaming request.
- Disable submit khi query rỗng hoặc backend offline.

3. Scripts:

- `setup_local.ps1` kiểm tra version Node/Python/Ollama.
- `start_local.ps1` ghi URL ra `.local/local-pids.json`.
- `check_local.ps1` trả JSON option để automation parse.
- `stop_local.ps1` dừng theo PID và port.

4. Performance:

- Lazy load source detail.
- Không gửi full PDF text trong mỗi chat response.
- Virtualize source list nếu nhiều chunks.
- Batch embeddings khi ingest.

Acceptance criteria:

- `.\scripts\start_local.ps1` chạy lại nhiều lần không lỗi.
- `.\scripts\check_local.ps1` xanh sau start.
- Build frontend không làm dev server bị 500 sau restart.

### Phase I - Test Plan

Backend tests:

- PDF parse valid.
- Empty/scanned PDF error rõ.
- Chunk deterministic.
- Embedding dim = 384.
- Chroma upsert idempotent.
- Delete by file.
- Retrieval threshold.
- Highlight ranges không overlap sai.
- Chat offline Ollama degrade không crash.
- Source detail endpoints validate file/page/chunk.

Frontend tests/manual:

- Upload PDF.
- Poll ingest job.
- Ask query.
- Stream answer.
- Sources appear before/with answer.
- Citation click selects source.
- Highlight renders đúng.
- Delete file invalidates UI.
- Mobile tabs không vỡ.
- Export markdown/json/txt.

Commands:

```powershell
.\backend\.venv\Scripts\python.exe -m pytest .\backend\tests -v
cd frontend
npm audit --audit-level=moderate
npm run lint
npm run build
.\scripts\check_local.ps1
```

Manual browser verification:

- Open frontend URL từ `.local/local-pids.json`.
- Screenshot desktop.
- Screenshot mobile width.
- Test một query thật với paper đã ingest.
- Confirm source panel scroll/highlight.

### Phase J - Git Và An Toàn Dữ Liệu

Luôn giữ nguyên nguyên tắc:

- Không dùng `git add .`.
- Stage explicit từng file.
- Không commit:
  - `tasks/`
  - `.env`
  - `backend/.env`
  - `frontend/.env.local`
  - `backend/data/papers/*.pdf`
  - `backend/chroma_db/*`
  - `logs/`
  - `.local/`
  - `frontend/node_modules/`
  - `frontend/.next/`

Trước commit:

```powershell
git status --short --ignored
git diff --check
git diff --cached --name-only
git diff --cached --check
```

Commit gợi ý theo từng cụm:

```text
feat: add evidence source contracts
feat: add highlighted source viewer
feat: redesign research cockpit ui
feat: add page source endpoints
feat: improve retrieval ranking
chore: harden local runtime scripts
test: add evidence and highlight coverage
docs: update project completion guide
```

Sau mỗi commit đạt acceptance:

```powershell
git push origin main
```

## Thứ Tự Ưu Tiên Khi Rate Limit Reset

Nếu chỉ có một block làm việc dài, triển khai theo thứ tự này:

1. Backend source contract: `quote`, `page`, `chunk_id`, `similarity`, `highlight_ranges`.
2. Frontend Evidence Panel chiếm nửa UI desktop.
3. Citation click -> scroll/select source.
4. Highlight renderer an toàn.
5. UI redesign cold/pastel.
6. Page text endpoint.
7. Retrieval quality upgrade.
8. Export kèm citations.
9. Tests và screenshots.
10. README update cuối cùng ghi lại kết quả thực tế.

Nếu token rất ít, ưu tiên 3 việc có tác động lớn nhất:

1. Evidence Panel + citation click.
2. Highlight quotes.
3. UI layout/palette redesign.

## Definition Of Done Cuối Dự Án

Dự án được xem là hoàn thiện ở mức cao khi:

- User có thể upload/ingest paper local.
- User hỏi và nhận answer có citation.
- Nửa UI hiển thị sources liên quan trực tiếp.
- Click citation mở đúng source.
- Đoạn nguồn được highlight theo query/answer.
- UI đẹp, rõ, responsive, dùng palette lạnh/pastel.
- Ollama offline không làm app crash.
- Không có paid/cloud dependency.
- Test backend/frontend pass.
- README/SETUP hướng dẫn đủ để chạy lại từ máy mới.
- Git sạch, không push dữ liệu cá nhân.
