from __future__ import annotations

from collections.abc import AsyncGenerator
import json
import logging
from typing import Literal

from ollama import AsyncClient
from pydantic import BaseModel, Field

from app.config import settings
from app.retrieval.retriever import format_context
from app.retrieval.retriever_models import RetrievedChunk


logger = logging.getLogger(__name__)


SYSTEM_PROMPT = """You are a precise research assistant specializing in academic papers.
Your task is to answer questions based ONLY on the provided context from research papers.

Rules:
1. Answer based strictly on the context provided. Do not use prior knowledge.
2. If the context doesn't contain enough information, say "Based on the provided papers, I cannot find sufficient information about this."
3. Always cite your sources using [Source N] notation when referencing specific information.
4. Be precise and academic in tone.
5. If asked to summarize or compare, synthesize across multiple sources.
6. Point out if sources contradict each other.

Context format: Each source is labeled [Source N] with file name and page number."""


class Message(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class SourceReference(BaseModel):
    rank: int
    file_name: str
    page_number: int
    score: float
    excerpt: str


class GenerationRequest(BaseModel):
    query: str
    context_chunks: list[RetrievedChunk]
    conversation_history: list[Message] = Field(default_factory=list)
    stream: bool = True
    temperature: float = 0.1
    max_tokens: int = 2048


class GenerationResponse(BaseModel):
    answer: str
    sources: list[SourceReference]
    model: str
    prompt_tokens: int | None = None
    completion_tokens: int | None = None


def get_ollama_client() -> AsyncClient:
    return AsyncClient(host=settings.ollama_base_url)


def _source_excerpt(text: str, max_chars: int = 150) -> str:
    collapsed = " ".join(text.split())
    if len(collapsed) <= max_chars:
        return collapsed
    return f"{collapsed[:max_chars].rstrip()}..."


def build_source_references(chunks: list[RetrievedChunk]) -> list[SourceReference]:
    return [
        SourceReference(
            rank=chunk.rank,
            file_name=chunk.metadata.file_name,
            page_number=chunk.metadata.page_number,
            score=chunk.score,
            excerpt=_source_excerpt(chunk.text),
        )
        for chunk in chunks
    ]


def build_rag_prompt(
    query: str,
    context_chunks: list[RetrievedChunk],
    conversation_history: list[Message],
) -> list[dict[str, str]]:
    context = format_context(context_chunks)
    system_content = (
        f"{SYSTEM_PROMPT}\n\n"
        "--- RESEARCH CONTEXT ---\n"
        f"{context if context else 'No relevant context was retrieved.'}\n"
        "--- END CONTEXT ---"
    )

    messages: list[dict[str, str]] = [{"role": "system", "content": system_content}]
    messages.extend(
        {"role": message.role, "content": message.content}
        for message in conversation_history
        if message.role in {"user", "assistant", "system"}
    )
    messages.append({"role": "user", "content": query})
    return messages


async def check_ollama_health() -> dict[str, bool | str | None]:
    try:
        response = await get_ollama_client().list()
        model_names = {model.model for model in response.models}
        return {
            "available": True,
            "model_loaded": settings.ollama_model in model_names,
            "model": settings.ollama_model,
            "error": None,
        }
    except Exception as exc:
        logger.warning("Ollama health check failed: %s", exc)
        return {
            "available": False,
            "model_loaded": False,
            "model": settings.ollama_model,
            "error": str(exc),
        }


async def generate(request: GenerationRequest) -> GenerationResponse:
    messages = build_rag_prompt(
        request.query,
        request.context_chunks,
        request.conversation_history,
    )

    response = await get_ollama_client().chat(
        model=settings.ollama_model,
        messages=messages,
        options={
            "temperature": request.temperature,
            "num_predict": request.max_tokens,
        },
    )

    return GenerationResponse(
        answer=response.message.content or "",
        sources=build_source_references(request.context_chunks),
        model=response.model or settings.ollama_model,
        prompt_tokens=response.prompt_eval_count,
        completion_tokens=response.eval_count,
    )


async def generate_stream(
    request: GenerationRequest,
) -> AsyncGenerator[str, None]:
    messages = build_rag_prompt(
        request.query,
        request.context_chunks,
        request.conversation_history,
    )

    try:
        stream = await get_ollama_client().chat(
            model=settings.ollama_model,
            messages=messages,
            stream=True,
            options={
                "temperature": request.temperature,
                "num_predict": request.max_tokens,
            },
        )

        async for part in stream:
            token = part.message.content if part.message else ""
            if token:
                yield json.dumps({"type": "token", "content": token})

        yield json.dumps(
            {
                "type": "sources",
                "sources": [
                    source.model_dump()
                    for source in build_source_references(request.context_chunks)
                ],
            }
        )
        yield json.dumps({"type": "done"})
    except Exception as exc:
        logger.exception("Ollama streaming generation failed")
        yield json.dumps({"type": "error", "message": str(exc)})
