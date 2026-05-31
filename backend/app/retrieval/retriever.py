from __future__ import annotations

import logging

from app.config import settings
from app.ingestion.chunker import ChunkMetadata
from app.ingestion.embedder import embed_text
from app.retrieval.cache import query_cache
from app.retrieval.retriever_models import RetrievedChunk, RetrievalResult
from app.retrieval.vector_store import get_collection


REFERENCE_QUERY_TERMS = {
    "reference",
    "references",
    "bibliography",
    "citation",
    "citations",
    "tài liệu tham khảo",
}


logger = logging.getLogger(__name__)


def _distance_to_score(distance: float | None) -> float:
    if distance is None:
        return 0.0
    return max(0.0, min(1.0, 1.0 - float(distance)))


def _query_tokens(query: str) -> set[str]:
    return {
        token
        for token in "".join(
            char.lower() if char.isalnum() else " "
            for char in query
        ).split()
        if len(token) >= 3
    }


def _lexical_boost(query: str, text: str) -> float:
    tokens = _query_tokens(query)
    if not tokens:
        return 0.0
    lowered = text.lower()
    hits = sum(1 for token in tokens if token in lowered)
    return min(0.18, (hits / len(tokens)) * 0.18)


def _asks_about_references(query: str) -> bool:
    lowered = query.lower()
    return any(term in lowered for term in REFERENCE_QUERY_TERMS)


def retrieve(
    query: str,
    top_k: int = settings.retrieval_top_k,
    filter_file: str | None = None,
    score_threshold: float = 0.3,
) -> RetrievalResult:
    cleaned_query = query.strip()
    if not cleaned_query:
        return RetrievalResult(query=query, chunks=[], total_retrieved=0)

    cached = query_cache.get(cleaned_query, top_k, filter_file)
    if cached is not None:
        logger.info("Retrieval cache hit for query=%r", cleaned_query)
        return cached

    collection = get_collection()
    if collection.count() == 0:
        return RetrievalResult(query=cleaned_query, chunks=[], total_retrieved=0)

    query_embedding = embed_text(cleaned_query)
    where = {"file_name": filter_file} if filter_file else None
    result = collection.query(
        query_embeddings=[query_embedding],
        n_results=max(top_k * 2, top_k),
        where=where,
        include=["documents", "metadatas", "distances"],
    )

    ids = (result.get("ids") or [[]])[0]
    documents = (result.get("documents") or [[]])[0]
    metadatas = (result.get("metadatas") or [[]])[0]
    distances = (result.get("distances") or [[]])[0]

    chunks: list[RetrievedChunk] = []
    for chunk_id, text, metadata, distance in zip(
        ids,
        documents,
        metadatas,
        distances,
        strict=False,
    ):
        score = min(
            1.0,
            _distance_to_score(distance) + _lexical_boost(cleaned_query, text),
        )
        if score < score_threshold:
            continue

        parsed_metadata = ChunkMetadata.model_validate(metadata)
        if parsed_metadata.is_reference and not _asks_about_references(cleaned_query):
            continue

        chunks.append(
            RetrievedChunk(
                chunk_id=chunk_id,
                text=text,
                score=score,
                metadata=parsed_metadata,
                rank=0,
            )
        )

    ranked_chunks: list[RetrievedChunk] = []
    seen_pages: set[tuple[str, int]] = set()
    for chunk in sorted(chunks, key=lambda item: item.score, reverse=True):
        page_key = (chunk.metadata.file_name, chunk.metadata.page_number)
        if page_key in seen_pages and len(ranked_chunks) < top_k:
            lower_bound = ranked_chunks[-1].score - 0.03 if ranked_chunks else 0.0
            if chunk.score < lower_bound:
                continue
        ranked_chunks.append(chunk)
        seen_pages.add(page_key)
        if len(ranked_chunks) >= top_k:
            break
    for rank, chunk in enumerate(ranked_chunks, start=1):
        chunk.rank = rank

    logger.info(
        "Retrieved %s chunk(s) for query=%r filter_file=%r",
        len(ranked_chunks),
        cleaned_query,
        filter_file,
    )
    retrieval_result = RetrievalResult(
        query=cleaned_query,
        chunks=ranked_chunks,
        total_retrieved=len(ranked_chunks),
    )
    query_cache.set(cleaned_query, top_k, filter_file, retrieval_result)
    return retrieval_result


def format_context(chunks: list[RetrievedChunk]) -> str:
    formatted_chunks = []

    for chunk in chunks:
        formatted_chunks.append(
            "\n".join(
                [
                    (
                        f"[{chunk.rank}] {chunk.metadata.file_name} - "
                        f"Page {chunk.metadata.page_number} "
                        f"(relevance: {chunk.score:.0%})"
                    ),
                    chunk.text,
                ]
            )
        )

    return "\n\n".join(formatted_chunks)
