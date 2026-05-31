# Local Research Assistant RAG

Chatbot RAG cho paper PDF chạy trên máy cá nhân với chi phí API bằng 0. Dữ liệu không cần gửi ra dịch vụ trả phí: PDF được parse local, embedding chạy bằng `sentence-transformers`, vector store lưu bằng ChromaDB, và phần sinh câu trả lời dùng Ollama.

## Kiến trúc

```text
backend/data/papers     -> PDF local
backend/app/ingestion   -> parse PDF, chunk, embed
backend/app/retrieval   -> ChromaDB persistent retrieval
backend/app/generation  -> Ollama LLM client
backend/app/api         -> FastAPI endpoints
frontend                -> Next.js chat UI
```

## Trạng thái

Project được triển khai theo phase:

1. Project setup và cấu hình local-first.
2. Ingestion pipeline cho PDF.
3. ChromaDB vector store.
4. Ollama generation.
5. FastAPI RAG API.
6. Next.js frontend.
7. Polish, tests, và setup guide.

## Quick start

Xem `SETUP.md` để chạy đầy đủ backend, frontend và Ollama. PDF nghiên cứu đặt trong `backend/data/papers`; thư mục này được ignore để tránh commit dữ liệu cá nhân.

Trên Windows, đường nhanh nhất:

```powershell
.\scripts\setup_local.ps1 -InstallMissingTools
.\scripts\start_local.ps1
.\scripts\check_local.ps1
```

Lệnh kiểm thử backend:

```powershell
.\backend\.venv\Scripts\python.exe -m pytest .\backend\tests -v
```
