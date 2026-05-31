from __future__ import annotations

import logging
from pathlib import Path
import re
import unicodedata

import fitz
from pydantic import BaseModel
from tqdm import tqdm


logger = logging.getLogger(__name__)


class PageContent(BaseModel):
    page_number: int
    text: str
    char_count: int


class ParsedDocument(BaseModel):
    file_name: str
    file_path: str
    total_pages: int
    pages: list[PageContent]


def clean_text(text: str) -> str:
    normalized = unicodedata.normalize("NFKC", text)
    normalized = normalized.replace("\x00", " ")
    normalized = re.sub(r"[ \t\r\f\v]+", " ", normalized)
    normalized = re.sub(r"\n{3,}", "\n\n", normalized)
    return normalized.strip()


def parse_pdf(file_path: str | Path) -> ParsedDocument:
    path = Path(file_path).expanduser().resolve()
    if not path.exists():
        raise FileNotFoundError(f"PDF file does not exist: {path}")
    if not path.is_file():
        raise FileNotFoundError(f"PDF path is not a file: {path}")

    logger.info("Parsing PDF: %s", path)
    pages: list[PageContent] = []

    with fitz.open(path) as pdf:
        total_pages = pdf.page_count
        page_numbers = range(total_pages)
        iterator = (
            tqdm(page_numbers, desc=f"Parsing {path.name}", unit="page", leave=False)
            if total_pages > 10
            else page_numbers
        )

        for page_index in iterator:
            page = pdf.load_page(page_index)
            text = clean_text(page.get_text("text"))
            char_count = len(text)

            if char_count < 50:
                logger.debug(
                    "Skipping short page %s in %s (%s chars)",
                    page_index + 1,
                    path.name,
                    char_count,
                )
                continue

            pages.append(
                PageContent(
                    page_number=page_index + 1,
                    text=text,
                    char_count=char_count,
                )
            )

    if not pages:
        raise ValueError(
            f"No extractable text found in {path}. The PDF may be scanned or empty."
        )

    return ParsedDocument(
        file_name=path.name,
        file_path=str(path),
        total_pages=total_pages,
        pages=pages,
    )


def parse_folder(folder_path: str | Path) -> list[ParsedDocument]:
    folder = Path(folder_path).expanduser().resolve()
    if not folder.exists():
        raise FileNotFoundError(f"PDF folder does not exist: {folder}")
    if not folder.is_dir():
        raise FileNotFoundError(f"PDF folder path is not a directory: {folder}")

    documents: list[ParsedDocument] = []
    pdf_files = sorted(folder.rglob("*.pdf"))
    logger.info("Found %s PDF file(s) in %s", len(pdf_files), folder)

    for pdf_file in pdf_files:
        try:
            documents.append(parse_pdf(pdf_file))
        except (FileNotFoundError, ValueError, RuntimeError) as exc:
            logger.warning("Skipping %s: %s", pdf_file, exc)

    return documents
