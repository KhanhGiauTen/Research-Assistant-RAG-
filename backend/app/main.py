from __future__ import annotations

from contextlib import asynccontextmanager
import logging

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Local Research Assistant API")
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

ingest_router = APIRouter()
chat_router = APIRouter()


@ingest_router.get("")
async def ingest_placeholder() -> dict[str, str]:
    return {"status": "not implemented"}


@chat_router.get("")
async def chat_placeholder() -> dict[str, str]:
    return {"status": "not implemented"}


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok", "model": settings.ollama_model}


app.include_router(ingest_router, prefix="/api/ingest", tags=["ingestion"])
app.include_router(chat_router, prefix="/api/chat", tags=["chat"])
