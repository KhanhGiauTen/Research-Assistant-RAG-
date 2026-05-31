# Quick Start

## Prerequisites

- Python 3.11
- Node.js LTS with `npm`
- Ollama

This project runs locally with no paid API. The first embedding run downloads `all-MiniLM-L6-v2` into the HuggingFace cache, and Ollama models are stored locally.

## Backend

Fast path on Windows:

```powershell
.\scripts\setup_local.ps1 -InstallMissingTools
.\scripts\start_local.ps1
.\scripts\check_local.ps1
```

Stop backend/frontend processes started by the script:

```powershell
.\scripts\stop_local.ps1
```

Manual backend setup:

```powershell
cd backend
py -3.11 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

Backend health:

```powershell
Invoke-RestMethod http://localhost:8000/health
Invoke-RestMethod http://localhost:8000/api/chat/health
```

## Ollama

Install Ollama, then run:

```powershell
ollama serve
ollama pull llama3.2:3b
```

If Ollama is not running, the API still works in degraded mode and returns retrieved sources without generated answers.

The setup script pulls `llama3.2:3b` automatically unless you pass `-SkipModelPull`.

## Papers and Ingestion

Put local PDFs in:

```text
backend/data/papers
```

Then ingest:

```powershell
.\backend\.venv\Scripts\python.exe .\scripts\ingest_all.py --folder .\backend\data\papers
```

## Frontend

```powershell
cd frontend
npm install
Copy-Item .env.local.example .env.local
npm audit --audit-level=moderate
npm run lint
npm run build
npm run dev
```

Open http://localhost:3000.

## Tests

```powershell
.\backend\.venv\Scripts\python.exe -m pytest .\backend\tests -v
```

## Local Data Policy

These paths are ignored by git:

- `tasks/`
- `backend/.env`
- `backend/data/papers/*`
- `backend/chroma_db/*`
- `frontend/node_modules/`
- `frontend/.next/`
