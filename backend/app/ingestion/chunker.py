from __future__ import annotations

from collections import Counter
import logging
import re

from langchain_text_splitters import RecursiveCharacterTextSplitter
from pydantic import BaseModel

from app.config import settings
from app.documents import file_id_for_path
from app.ingestion.pdf_parser import ParsedDocument


logger = logging.getLogger(__name__)

SECTION_HEADER_RE = re.compile(
    r"^(abstract|introduction|related work|background|method|methods|methodology|"
    r"experiments|results|discussion|conclusion|references)\b",
    re.IGNORECASE,
)
EQUATION_RE = re.compile(r"[=∑∏√≤≥≈≠±]|\\(?:alpha|beta|gamma|sum|frac|theta)")


class ChunkMetadata(BaseModel):
    file_id: str | None = None
    file_name: str
    file_path: str
    page_number: int
    chunk_index: int
    total_chunks_in_page: int
    char_count: int
    section_name: str | None = None
    is_reference: bool = False
    has_equation: bool = False


class TextChunk(BaseModel):
    chunk_id: str
    text: str
    metadata: ChunkMetadata


def _build_splitter(chunk_size: int, chunk_overlap: int) -> RecursiveCharacterTextSplitter:
    return RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
        keep_separator=True,
        strip_whitespace=True,
    )


def _detect_section(text: str, current_section: str | None) -> str | None:
    for line in text.splitlines():
        stripped = line.strip().strip("0123456789. ")
        match = SECTION_HEADER_RE.match(stripped)
        if match:
            return match.group(1).title()
    return current_section


def _has_equation(text: str) -> bool:
    return bool(EQUATION_RE.search(text))


def chunk_document(
    document: ParsedDocument,
    chunk_size: int = settings.chunk_size,
    chunk_overlap: int = settings.chunk_overlap,
) -> list[TextChunk]:
    return smart_chunk_document(document, chunk_size, chunk_overlap)


def smart_chunk_document(
    document: ParsedDocument,
    chunk_size: int = settings.chunk_size,
    chunk_overlap: int = settings.chunk_overlap,
) -> list[TextChunk]:
    splitter = _build_splitter(chunk_size, chunk_overlap)
    chunks: list[TextChunk] = []
    current_section: str | None = None
    file_id = file_id_for_path(document.file_path)

    for page in document.pages:
        current_section = _detect_section(page.text, current_section)
        raw_chunks = [chunk.strip() for chunk in splitter.split_text(page.text)]
        page_chunks = [chunk for chunk in raw_chunks if len(chunk) >= 100]
        total_chunks = len(page_chunks)

        for chunk_index, text in enumerate(page_chunks):
            current_section = _detect_section(text, current_section)
            chunk_id = (
                f"{document.file_name}::page_{page.page_number}::chunk_{chunk_index}"
            )
            chunks.append(
                TextChunk(
                    chunk_id=chunk_id,
                    text=text,
                    metadata=ChunkMetadata(
                        file_id=file_id,
                        file_name=document.file_name,
                        file_path=document.file_path,
                        page_number=page.page_number,
                        chunk_index=chunk_index,
                        total_chunks_in_page=total_chunks,
                        char_count=len(text),
                        section_name=current_section,
                        is_reference=(current_section or "").lower() == "references",
                        has_equation=_has_equation(text),
                    ),
                )
            )

    counts = Counter(chunk.chunk_id for chunk in chunks)
    duplicate_ids = [chunk_id for chunk_id, count in counts.items() if count > 1]
    if duplicate_ids:
        raise ValueError(f"Duplicate chunk IDs generated: {duplicate_ids[:3]}")

    logger.info("Chunked %s into %s chunk(s)", document.file_name, len(chunks))
    return chunks


def chunk_documents(
    documents: list[ParsedDocument],
    chunk_size: int = settings.chunk_size,
    chunk_overlap: int = settings.chunk_overlap,
) -> list[TextChunk]:
    chunks: list[TextChunk] = []

    for document in documents:
        chunks.extend(
            chunk_document(
                document,
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
            )
        )

    logger.info("Created %s total chunk(s) from %s document(s)", len(chunks), len(documents))
    return chunks
