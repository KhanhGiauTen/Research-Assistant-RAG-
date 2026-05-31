from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from app.api import chat as chat_api
from app.config import settings
from app.documents import file_id_for_path
from app.ingestion.chunker import ChunkMetadata
from app.main import app
from app.retrieval.evidence import build_source_references
from app.retrieval.retriever_models import RetrievedChunk, RetrievalResult


def _sample_chunk(sample_pdf: Path) -> RetrievedChunk:
    text = (
        "The system reads PDF documents, creates chunks, and retrieves local "
        "evidence for answers without paid APIs. Local retrieval keeps paper "
        "content on the user's machine."
    )
    return RetrievedChunk(
        chunk_id="sample.pdf::page_1::chunk_0",
        text=text,
        score=0.82,
        metadata=ChunkMetadata(
            file_id=file_id_for_path(sample_pdf),
            file_name="sample.pdf",
            file_path=str(sample_pdf),
            page_number=1,
            chunk_index=0,
            total_chunks_in_page=1,
            char_count=len(text),
            section_name="Introduction",
        ),
        rank=1,
    )


def test_source_reference_contract_has_quote_and_highlights(sample_pdf: Path) -> None:
    source = build_source_references(
        [_sample_chunk(sample_pdf)],
        query="local retrieval evidence",
    )[0]

    assert source.citation_id == "[1]"
    assert source.chunk_id == "sample.pdf::page_1::chunk_0"
    assert source.file_id == file_id_for_path(sample_pdf)
    assert source.display_title == "sample"
    assert source.quote
    assert source.context
    assert source.excerpt == source.quote
    assert source.highlight_ranges
    assert source.pdf_url == f"/api/files/{source.file_id}/pdf"
    assert source.page_text_url == f"/api/files/{source.file_id}/pages/1"


def test_file_endpoints_serve_pdf_and_page_text(
    monkeypatch,
    sample_pdf: Path,
    tmp_path: Path,
) -> None:
    target = tmp_path / "sample.pdf"
    target.write_bytes(sample_pdf.read_bytes())
    monkeypatch.setattr(settings, "papers_dir", str(tmp_path))

    file_id = file_id_for_path(target)
    client = TestClient(app)

    page_response = client.get(f"/api/files/{file_id}/pages/1")
    assert page_response.status_code == 200
    assert "local retrieval augmented generation" in page_response.json()["text"]

    pdf_response = client.get(f"/api/files/{file_id}/pdf")
    assert pdf_response.status_code == 200
    assert pdf_response.headers["content-type"] == "application/pdf"

    missing_response = client.get("/api/files/missing/pdf")
    assert missing_response.status_code == 404


def test_chat_offline_returns_enriched_sources(monkeypatch, sample_pdf: Path) -> None:
    chunk = _sample_chunk(sample_pdf)

    def fake_retrieve(*args, **kwargs) -> RetrievalResult:
        return RetrievalResult(query="local evidence", chunks=[chunk], total_retrieved=1)

    async def fake_health() -> dict[str, bool | str | None]:
        return {
            "available": False,
            "model_loaded": False,
            "model": "llama3.2:3b",
            "error": "offline",
        }

    monkeypatch.setattr(chat_api, "retrieve", fake_retrieve)
    monkeypatch.setattr(chat_api, "check_ollama_health", fake_health)

    client = TestClient(app)
    response = client.post("/api/chat/query", json={"query": "local evidence"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["retrieved_chunks"] == 1
    assert payload["sources"][0]["citation_id"] == "[1]"
    assert payload["sources"][0]["quote"]
