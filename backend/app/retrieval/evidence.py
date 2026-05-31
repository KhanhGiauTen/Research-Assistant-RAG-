from __future__ import annotations

import re

from pydantic import BaseModel, Field

from app.documents import (
    display_title_for_file,
    fallback_file_id,
    file_id_for_path,
)
from app.retrieval.retriever_models import RetrievedChunk


WORD_RE = re.compile(r"[\wÀ-ỹ]+", re.UNICODE)
STOPWORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "for",
    "from",
    "how",
    "in",
    "is",
    "it",
    "of",
    "on",
    "or",
    "that",
    "the",
    "this",
    "to",
    "what",
    "when",
    "where",
    "which",
    "with",
    "và",
    "các",
    "cái",
    "cho",
    "của",
    "đang",
    "được",
    "gì",
    "khi",
    "là",
    "một",
    "như",
    "nào",
    "ra",
    "theo",
    "trong",
    "về",
}


class HighlightRange(BaseModel):
    start: int
    end: int
    kind: str = "query"


class SourceReference(BaseModel):
    rank: int
    citation_id: str
    chunk_id: str
    file_id: str
    file_name: str
    display_title: str
    page_number: int
    chunk_index: int
    section_name: str | None = None
    score: float
    quote: str
    context: str
    highlight_ranges: list[HighlightRange] = Field(default_factory=list)
    pdf_url: str | None = None
    page_text_url: str | None = None
    excerpt: str


def query_terms(query: str) -> list[str]:
    terms: list[str] = []
    seen: set[str] = set()
    words = [word.lower() for word in WORD_RE.findall(query)]

    for word in words:
        if len(word) < 3 or word in STOPWORDS or word in seen:
            continue
        seen.add(word)
        terms.append(word)

    for size in (4, 3, 2):
        for index in range(0, max(0, len(words) - size + 1)):
            phrase_words = words[index : index + size]
            if any(word in STOPWORDS for word in phrase_words):
                continue
            phrase = " ".join(phrase_words)
            if len(phrase) < 6 or phrase in seen:
                continue
            seen.add(phrase)
            terms.insert(0, phrase)

    return terms[:12]


def _collapse_text(text: str) -> str:
    return " ".join(text.split())


def _quote_for_text(text: str, terms: list[str], max_chars: int = 420) -> str:
    collapsed = _collapse_text(text)
    if len(collapsed) <= max_chars:
        return collapsed

    lowered = collapsed.lower()
    first_match = min(
        (lowered.find(term.lower()) for term in terms if lowered.find(term.lower()) >= 0),
        default=-1,
    )
    if first_match < 0:
        return f"{collapsed[:max_chars].rstrip()}..."

    start = max(0, first_match - max_chars // 3)
    end = min(len(collapsed), start + max_chars)
    start = max(0, end - max_chars)
    prefix = "..." if start > 0 else ""
    suffix = "..." if end < len(collapsed) else ""
    return f"{prefix}{collapsed[start:end].strip()}{suffix}"


def highlight_ranges(text: str, terms: list[str]) -> list[HighlightRange]:
    lowered = text.lower()
    ranges: list[tuple[int, int]] = []

    for term in sorted(terms, key=len, reverse=True):
        pattern = re.escape(term.lower())
        for match in re.finditer(pattern, lowered):
            start, end = match.span()
            if any(not (end <= existing_start or start >= existing_end) for existing_start, existing_end in ranges):
                continue
            ranges.append((start, end))

    ranges.sort()
    return [HighlightRange(start=start, end=end) for start, end in ranges]


def file_id_for_chunk(chunk: RetrievedChunk) -> str:
    metadata_file_id = getattr(chunk.metadata, "file_id", None)
    if metadata_file_id:
        return metadata_file_id
    path = getattr(chunk.metadata, "file_path", "")
    if path:
        return file_id_for_path(path)
    return fallback_file_id(chunk.metadata.file_name)


def build_source_references(
    chunks: list[RetrievedChunk],
    query: str = "",
) -> list[SourceReference]:
    terms = query_terms(query)
    references: list[SourceReference] = []

    for chunk in chunks:
        file_id = file_id_for_chunk(chunk)
        quote = _quote_for_text(chunk.text, terms)
        references.append(
            SourceReference(
                rank=chunk.rank,
                citation_id=f"[{chunk.rank}]",
                chunk_id=chunk.chunk_id,
                file_id=file_id,
                file_name=chunk.metadata.file_name,
                display_title=display_title_for_file(chunk.metadata.file_name),
                page_number=chunk.metadata.page_number,
                chunk_index=chunk.metadata.chunk_index,
                section_name=chunk.metadata.section_name,
                score=chunk.score,
                quote=quote,
                context=_collapse_text(chunk.text),
                highlight_ranges=highlight_ranges(quote, terms),
                pdf_url=f"/api/files/{file_id}/pdf",
                page_text_url=f"/api/files/{file_id}/pages/{chunk.metadata.page_number}",
                excerpt=quote,
            )
        )

    return references
