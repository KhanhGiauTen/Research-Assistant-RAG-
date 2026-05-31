from __future__ import annotations

from collections import Counter
import logging

import chromadb
from chromadb.config import Settings as ChromaSettings
from pydantic import BaseModel

from app.config import settings
from app.ingestion.chunker import TextChunk


logger = logging.getLogger(__name__)

_client: chromadb.ClientAPI | None = None


class UpsertResult(BaseModel):
    inserted: int
    updated: int
    skipped: int
    total_in_collection: int


class CollectionStats(BaseModel):
    collection_name: str
    total_chunks: int
    unique_files: list[str]
    chunks_per_file: dict[str, int]


def get_chroma_client() -> chromadb.ClientAPI:
    global _client

    if _client is None:
        settings.chroma_path.mkdir(parents=True, exist_ok=True)
        logger.info("Opening ChromaDB at %s", settings.chroma_path)
        _client = chromadb.PersistentClient(
            path=str(settings.chroma_path),
            settings=ChromaSettings(anonymized_telemetry=False),
        )

    return _client


def get_collection() -> chromadb.Collection:
    client = get_chroma_client()
    return client.get_or_create_collection(
        name=settings.chroma_collection_name,
        metadata={"hnsw:space": "cosine"},
        embedding_function=None,
    )


def _existing_ids(collection: chromadb.Collection, ids: list[str]) -> set[str]:
    if not ids:
        return set()

    result = collection.get(ids=ids)
    return set(result.get("ids") or [])


def _metadata_for_chroma(chunk: TextChunk) -> dict[str, str | int | float | bool]:
    return chunk.metadata.model_dump()


def upsert_chunks(
    chunks_with_embeddings: list[tuple[TextChunk, list[float]]],
) -> UpsertResult:
    collection = get_collection()
    inserted = 0
    updated = 0
    skipped = 0
    batch_size = 100

    for offset in range(0, len(chunks_with_embeddings), batch_size):
        batch = chunks_with_embeddings[offset : offset + batch_size]
        ids = [chunk.chunk_id for chunk, _embedding in batch]
        existing_ids = _existing_ids(collection, ids)

        valid_batch = [
            (chunk, embedding)
            for chunk, embedding in batch
            if chunk.text.strip() and embedding
        ]
        skipped += len(batch) - len(valid_batch)

        if not valid_batch:
            continue

        valid_ids = [chunk.chunk_id for chunk, _embedding in valid_batch]
        collection.upsert(
            ids=valid_ids,
            embeddings=[embedding for _chunk, embedding in valid_batch],
            documents=[chunk.text for chunk, _embedding in valid_batch],
            metadatas=[_metadata_for_chroma(chunk) for chunk, _embedding in valid_batch],
        )

        updated += sum(1 for chunk_id in valid_ids if chunk_id in existing_ids)
        inserted += sum(1 for chunk_id in valid_ids if chunk_id not in existing_ids)

    total = collection.count()
    logger.info(
        "Upserted chunks into ChromaDB: inserted=%s updated=%s skipped=%s total=%s",
        inserted,
        updated,
        skipped,
        total,
    )
    return UpsertResult(
        inserted=inserted,
        updated=updated,
        skipped=skipped,
        total_in_collection=total,
    )


def delete_file(file_name: str) -> int:
    collection = get_collection()
    existing = collection.get(where={"file_name": file_name})
    ids = existing.get("ids") or []
    if not ids:
        return 0

    collection.delete(ids=ids)
    logger.info("Deleted %s chunk(s) for %s", len(ids), file_name)
    return len(ids)


def get_collection_stats() -> CollectionStats:
    collection = get_collection()
    total_chunks = collection.count()
    result = collection.get(include=["metadatas"])
    metadatas = result.get("metadatas") or []
    file_counts = Counter(
        str(metadata.get("file_name"))
        for metadata in metadatas
        if metadata and metadata.get("file_name")
    )

    return CollectionStats(
        collection_name=settings.chroma_collection_name,
        total_chunks=total_chunks,
        unique_files=sorted(file_counts),
        chunks_per_file=dict(sorted(file_counts.items())),
    )


def list_indexed_files() -> list[str]:
    return get_collection_stats().unique_files
