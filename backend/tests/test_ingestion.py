from __future__ import annotations

from pathlib import Path

from app.ingestion.chunker import chunk_document
from app.ingestion.pdf_parser import parse_pdf


def test_parse_pdf_returns_pages(sample_pdf: Path) -> None:
    document = parse_pdf(sample_pdf)

    assert document.file_name == "sample.pdf"
    assert document.total_pages == 1
    assert len(document.pages) == 1
    assert document.pages[0].page_number == 1


def test_chunk_document_no_duplicate_ids(sample_pdf: Path) -> None:
    document = parse_pdf(sample_pdf)
    chunks = chunk_document(document, chunk_size=220, chunk_overlap=40)
    chunk_ids = [chunk.chunk_id for chunk in chunks]

    assert chunks
    assert len(chunk_ids) == len(set(chunk_ids))
    assert all(chunk.metadata.file_name == "sample.pdf" for chunk in chunks)
