from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.ingestion.chunker import ChunkMetadata
from app.retrieval.evidence import SourceReference, build_source_references
from app.retrieval.retriever_models import RetrievedChunk
from app.retrieval.vector_store import get_collection


router = APIRouter()


@router.get("/{chunk_id:path}", response_model=SourceReference)
async def get_source(chunk_id: str) -> SourceReference:
    result = get_collection().get(
        ids=[chunk_id],
        include=["documents", "metadatas"],
    )
    ids = result.get("ids") or []
    documents = result.get("documents") or []
    metadatas = result.get("metadatas") or []
    if not ids or not documents or not metadatas:
        raise HTTPException(status_code=404, detail="Source chunk not found")

    chunk = RetrievedChunk(
        chunk_id=ids[0],
        text=documents[0],
        score=1.0,
        metadata=ChunkMetadata.model_validate(metadatas[0]),
        rank=1,
    )
    return build_source_references([chunk])[0]
