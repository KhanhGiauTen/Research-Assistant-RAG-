from __future__ import annotations

from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import chat, files, ingest, sources
from app.config import settings
from app.generation.llm_client import check_ollama_health
from app.ingestion.embedder import get_embedding_model


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Local Research Assistant API")
    try:
        logger.info("Warming up embedding model: %s", settings.embedding_model)
        get_embedding_model()
    except Exception as exc:
        logger.warning("Embedding model warmup failed: %s", exc)

    health = await check_ollama_health()
    if not health["available"]:
        logger.warning("Ollama is unavailable at startup: %s", health["error"])
    elif not health["model_loaded"]:
        logger.warning("Ollama model is not pulled yet: %s", settings.ollama_model)

    yield
    logger.info("Stopping Local Research Assistant API")


app = FastAPI(
    title="Local Research Assistant RAG",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok", "model": settings.ollama_model}


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error("Unhandled exception on %s: %s", request.url.path, exc, exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


app.include_router(ingest.router, prefix="/api/ingest", tags=["ingestion"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(files.router, prefix="/api/files", tags=["files"])
app.include_router(sources.router, prefix="/api/sources", tags=["sources"])
