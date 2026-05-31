from __future__ import annotations

import logging
from time import perf_counter

from sentence_transformers import SentenceTransformer

from app.config import settings
from app.ingestion.chunker import TextChunk


logger = logging.getLogger(__name__)

_model: SentenceTransformer | None = None


def get_embedding_model() -> SentenceTransformer:
    global _model

    if _model is None:
        logger.info("Loading embedding model: %s", settings.embedding_model)
        _model = SentenceTransformer(settings.embedding_model)

    return _model


def embed_chunks(
    chunks: list[TextChunk],
    batch_size: int = 32,
    show_progress: bool = True,
) -> list[tuple[TextChunk, list[float]]]:
    if not chunks:
        return []

    model = get_embedding_model()
    texts = [chunk.text for chunk in chunks]

    started_at = perf_counter()
    vectors = model.encode(
        texts,
        batch_size=batch_size,
        show_progress_bar=show_progress,
        convert_to_numpy=True,
        normalize_embeddings=True,
    )
    elapsed = perf_counter() - started_at

    logger.info("Embedded %s chunk(s) in %.2fs", len(chunks), elapsed)
    return [
        (chunk, vector.astype(float).tolist())
        for chunk, vector in zip(chunks, vectors, strict=True)
    ]


def embed_text(text: str) -> list[float]:
    model = get_embedding_model()
    vector = model.encode(
        text,
        convert_to_numpy=True,
        normalize_embeddings=True,
    )
    return vector.astype(float).tolist()
