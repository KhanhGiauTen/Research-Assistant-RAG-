from __future__ import annotations

from collections.abc import AsyncGenerator
from datetime import datetime, timezone
import json
import logging
from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response, StreamingResponse
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
    session_id: str | None = None
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


class ChatSession(BaseModel):
    session_id: str
    messages: list[Message] = Field(default_factory=list)
    created_at: datetime
    last_active: datetime
    filter_file: str | None = None


class ExportMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str
    sources: list[SourceReference] = Field(default_factory=list)


class ExportRequest(BaseModel):
    messages: list[ExportMessage]
    format: Literal["markdown", "json", "txt"] = "markdown"


_sessions: dict[str, ChatSession] = {}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _history_for_request(request: ChatRequest) -> list[Message]:
    if request.session_id and request.session_id in _sessions:
        return _sessions[request.session_id].messages
    return request.conversation_history


def _append_to_session(
    session_id: str | None,
    query: str,
    answer: str,
    filter_file: str | None,
) -> None:
    if not session_id:
        return

    session = _sessions.get(session_id)
    if session is None:
        session = ChatSession(
            session_id=session_id,
            created_at=_now(),
            last_active=_now(),
            filter_file=filter_file,
        )
        _sessions[session_id] = session

    session.messages.append(Message(role="user", content=query))
    session.messages.append(Message(role="assistant", content=answer))
    session.filter_file = filter_file
    session.last_active = _now()


@router.post("/sessions", response_model=ChatSession)
async def create_session() -> ChatSession:
    session_id = str(uuid4())
    session = ChatSession(
        session_id=session_id,
        created_at=_now(),
        last_active=_now(),
    )
    _sessions[session_id] = session
    return session


@router.get("/sessions/{session_id}", response_model=ChatSession)
async def get_session(session_id: str) -> ChatSession:
    session = _sessions.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str) -> dict[str, bool]:
    return {"deleted": _sessions.pop(session_id, None) is not None}


@router.post("/query", response_model=ChatResponse)
async def chat_query(request: ChatRequest) -> ChatResponse:
    retrieval = retrieve(
        request.query,
        top_k=request.top_k,
        filter_file=request.filter_file,
    )

    if not retrieval.chunks:
        _append_to_session(
            request.session_id,
            request.query,
            "No relevant information found in indexed papers.",
            request.filter_file,
        )
        return ChatResponse(
            answer="No relevant information found in indexed papers.",
            sources=[],
            query=request.query,
            retrieved_chunks=0,
        )

    health = await check_ollama_health()
    if not health["available"] or not health["model_loaded"]:
        answer = (
            "LLM unavailable - showing retrieved passages only. "
            "Start Ollama and pull the configured model to generate an answer."
        )
        _append_to_session(request.session_id, request.query, answer, request.filter_file)
        return ChatResponse(
            answer=answer,
            sources=build_source_references(retrieval.chunks),
            query=request.query,
            retrieved_chunks=retrieval.total_retrieved,
        )

    response = await generate(
        GenerationRequest(
            query=request.query,
            context_chunks=retrieval.chunks,
            conversation_history=_history_for_request(request),
            stream=False,
        )
    )
    _append_to_session(
        request.session_id,
        request.query,
        response.answer,
        request.filter_file,
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
    streamed_answer = ""
    try:
        retrieval = retrieve(
            request.query,
            top_k=request.top_k,
            filter_file=request.filter_file,
        )

        if not retrieval.chunks:
            answer = "No relevant information found in indexed papers."
            yield _sse(
                {
                    "type": "token",
                    "content": answer,
                }
            )
            yield _sse({"type": "sources", "sources": []})
            yield _sse({"type": "done"})
            _append_to_session(request.session_id, request.query, answer, request.filter_file)
            return

        health = await check_ollama_health()
        sources = [
            source.model_dump() for source in build_source_references(retrieval.chunks)
        ]
        if not health["available"] or not health["model_loaded"]:
            answer = (
                "LLM unavailable - showing retrieved passages only. "
                "Start Ollama and pull the configured model to generate an answer."
            )
            yield _sse(
                {
                    "type": "token",
                    "content": answer,
                }
            )
            yield _sse({"type": "sources", "sources": sources})
            yield _sse({"type": "done"})
            _append_to_session(request.session_id, request.query, answer, request.filter_file)
            return

        generation_request = GenerationRequest(
            query=request.query,
            context_chunks=retrieval.chunks,
            conversation_history=_history_for_request(request),
            stream=True,
        )
        async for event in generate_stream(generation_request):
            try:
                payload = json.loads(event)
                if payload.get("type") == "token":
                    streamed_answer += str(payload.get("content", ""))
                if payload.get("type") == "done":
                    _append_to_session(
                        request.session_id,
                        request.query,
                        streamed_answer,
                        request.filter_file,
                    )
            except json.JSONDecodeError:
                pass
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


def _export_markdown(messages: list[ExportMessage]) -> str:
    sections = [
        "# Research Chat Export",
        f"Exported: {_now().isoformat()}",
        "",
        "---",
    ]

    for message in messages:
        label = "You" if message.role == "user" else "Assistant"
        sections.extend(["", f"**{label}:** {message.content}", ""])
        if message.sources:
            sections.append("**Sources:**")
            for source in message.sources:
                sections.append(
                    (
                        f"- {source.file_name}, Page {source.page_number} "
                        f"(relevance: {source.score:.0%})"
                    )
                )
                sections.append(f"  > {source.excerpt}")
        sections.append("---")

    return "\n".join(sections)


def _export_text(messages: list[ExportMessage]) -> str:
    lines: list[str] = []
    for message in messages:
        label = "You" if message.role == "user" else "Assistant"
        lines.append(f"{label}: {message.content}")
        lines.append("")
    return "\n".join(lines)


@router.post("/export")
async def export_chat(request: ExportRequest) -> Response:
    if request.format == "json":
        content = json.dumps(
            [message.model_dump() for message in request.messages],
            indent=2,
            ensure_ascii=False,
        )
        media_type = "application/json"
        extension = "json"
    elif request.format == "txt":
        content = _export_text(request.messages)
        media_type = "text/plain"
        extension = "txt"
    else:
        content = _export_markdown(request.messages)
        media_type = "text/markdown"
        extension = "md"

    return Response(
        content=content,
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="research-chat.{extension}"'
        },
    )
