.PHONY: install dev-backend dev-frontend ingest test clean

install:
	cd backend && py -3.11 -m venv .venv
	cd backend && .venv\Scripts\python.exe -m pip install -r requirements.txt
	cd frontend && npm install

dev-backend:
	cd backend && .venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000

dev-frontend:
	cd frontend && npm run dev

ingest:
	backend\.venv\Scripts\python.exe scripts\ingest_all.py

test:
	backend\.venv\Scripts\python.exe -m pytest backend\tests -v

clean:
	powershell -NoProfile -Command "Get-ChildItem -Recurse -Directory -Filter __pycache__ | Remove-Item -Recurse -Force"
