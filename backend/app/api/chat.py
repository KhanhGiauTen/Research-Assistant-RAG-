from __future__ import annotations

from collections.abc import AsyncGenerator
import json
import logging

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, field_validator

from app.config import settings
from app.generation.llm_client import (
    GenerationRequest,
    Message,
    SourceReference,
    build_source_references,
    check_ollama_health,
    generate,
    generate_stream,
)
from app.retrieval.retriever import retrieve
from app.retrieval.vector_store import get_collection_stats


logger = logging.getLogger(__name__)
router = APIRouter()


class ChatRequest(BaseModel):
    query: str
    conversation_history: list[Message] = Field(default_factory=list)
    filter_file: str | None = None
    top_k: int = settings.retrieval_top_k
    stream: bool = False

    @field_validator("query")
    @classmethod
    def validate_query(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Query cannot be empty")
        if len(cleaned) > 1000:
            raise ValueError("Query must be 1000 characters or fewer")
        return cleaned


class ChatResponse(BaseModel):
    answer: str
    sources: list[SourceReference]
    query: str
    retrieved_chunks: int


@router.post("/query", response_model=ChatResponse)
async def chat_query(request: ChatRequest) -> ChatResponse:
    retrieval = retrieve(
        request.query,
        top_k=request.top_k,
        filter_file=request.filter_file,
    )

    if not retrieval.chunks:
        return ChatResponse(
            answer="No relevant information found in indexed papers.",
            sources=[],
            query=request.query,
            retrieved_chunks=0,
        )

    health = await check_ollama_health()
    if not health["available"] or not health["model_loaded"]:
        return ChatResponse(
            answer=(
                "LLM unavailable - showing retrieved passages only. "
                "Start Ollama and pull the configured model to generate an answer."
            ),
            sources=build_source_references(retrieval.chunks),
            query=request.query,
            retrieved_chunks=retrieval.total_retrieved,
        )

    response = await generate(
        GenerationRequest(
            query=request.query,
            context_chunks=retrieval.chunks,
            conversation_history=request.conversation_history,
            stream=False,
        )
    )
    return ChatResponse(
        answer=response.answer,
        sources=response.sources,
        query=request.query,
        retrieved_chunks=retrieval.total_retrieved,
    )


def _sse(event: dict | str) -> str:
    payload = event if isinstance(event, str) else json.dumps(event)
    return f"data: {payload}\n\n"


async def stream_generator(request: ChatRequest) -> AsyncGenerator[str, None]:
    try:
        retrieval = retrieve(
            request.query,
            top_k=request.top_k,
            filter_file=request.filter_file,
        )

        if not retrieval.chunks:
            yield _sse(
                {
                    "type": "token",
                    "content": "No relevant information found in indexed papers.",
                }
            )
            yield _sse({"type": "sources", "sources": []})
            yield _sse({"type": "done"})
            return

        health = await check_ollama_health()
        sources = [
            source.model_dump() for source in build_source_references(retrieval.chunks)
        ]
        if not health["available"] or not health["model_loaded"]:
            yield _sse(
                {
                    "type": "token",
                    "content": (
                        "LLM unavailable - showing retrieved passages only. "
                        "Start Ollama and pull the configured model to generate an answer."
                    ),
                }
            )
            yield _sse({"type": "sources", "sources": sources})
            yield _sse({"type": "done"})
            return

        generation_request = GenerationRequest(
            query=request.query,
            context_chunks=retrieval.chunks,
            conversation_history=request.conversation_history,
            stream=True,
        )
        async for event in generate_stream(generation_request):
            yield _sse(event)
    except Exception as exc:
        logger.exception("Chat stream failed")
        yield _sse({"type": "error", "message": str(exc)})


@router.post("/stream")
async def chat_stream(request: ChatRequest) -> StreamingResponse:
    return StreamingResponse(
        stream_generator(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/health")
async def chat_health() -> dict:
    llm = await check_ollama_health()
    stats = get_collection_stats()

    if not llm["available"]:
        status = "unavailable"
    elif not llm["model_loaded"] or stats.total_chunks == 0:
        status = "degraded"
    else:
        status = "ready"

    return {
        "llm": {
            "available": llm["available"],
            "model_loaded": llm["model_loaded"],
            "model": llm["model"],
            "error": llm["error"],
        },
        "vector_store": {
            "total_chunks": stats.total_chunks,
            "files": len(stats.unique_files),
        },
        "embedding_model": settings.embedding_model,
        "status": status,
    }
