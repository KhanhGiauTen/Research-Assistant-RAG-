from __future__ import annotations

from pydantic import BaseModel, Field

from app.ingestion.chunker import ChunkMetadata


class RetrievedChunk(BaseModel):
    chunk_id: str
    text: str
    score: float
    metadata: ChunkMetadata
    rank: int


class RetrievalResult(BaseModel):
    query: str
    chunks: list[RetrievedChunk] = Field(default_factory=list)
    total_retrieved: int
