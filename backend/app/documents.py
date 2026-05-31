from __future__ import annotations

from dataclasses import dataclass
import hashlib
from pathlib import Path
import re

import fitz
from fastapi import HTTPException

from app.config import settings
from app.ingestion.pdf_parser import clean_text


@dataclass(frozen=True)
class PaperDocument:
    file_id: str
    file_name: str
    display_title: str
    path: Path


def fallback_file_id(file_name: str) -> str:
    normalized = file_name.strip().lower()
    return hashlib.sha256(f"name:{normalized}".encode("utf-8")).hexdigest()[:16]


def file_id_for_path(path: str | Path) -> str:
    resolved = Path(path).expanduser().resolve()
    if not resolved.exists() or not resolved.is_file():
        return fallback_file_id(resolved.name)

    digest = hashlib.sha256()
    with resolved.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()[:16]


def display_title_for_file(file_name: str) -> str:
    title = Path(file_name).stem
    title = re.sub(r"[_-]+", " ", title)
    title = re.sub(r"\s+", " ", title).strip()
    return title or file_name


def is_inside_papers_dir(path: Path) -> bool:
    return path.resolve().is_relative_to(settings.papers_path)


def iter_paper_documents() -> list[PaperDocument]:
    settings.papers_path.mkdir(parents=True, exist_ok=True)
    documents: list[PaperDocument] = []

    for path in sorted(settings.papers_path.glob("*.pdf")):
        resolved = path.resolve()
        if not is_inside_papers_dir(resolved):
            continue
        documents.append(
            PaperDocument(
                file_id=file_id_for_path(resolved),
                file_name=resolved.name,
                display_title=display_title_for_file(resolved.name),
                path=resolved,
            )
        )

    return documents


def resolve_paper_document(file_id: str) -> PaperDocument:
    for document in iter_paper_documents():
        if file_id in {document.file_id, fallback_file_id(document.file_name)}:
            return document
    raise HTTPException(status_code=404, detail="Paper file not found")


def page_text_for_document(document: PaperDocument, page_number: int) -> str:
    if page_number < 1:
        raise HTTPException(status_code=422, detail="Page number must be positive")

    with fitz.open(document.path) as pdf:
        if page_number > pdf.page_count:
            raise HTTPException(status_code=404, detail="Page not found")
        page = pdf.load_page(page_number - 1)
        text = clean_text(page.get_text("text"))

    if not text:
        raise HTTPException(status_code=404, detail="No extractable text on this page")
    return text
