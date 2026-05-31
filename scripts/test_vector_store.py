from __future__ import annotations

import argparse
import logging
from pathlib import Path
import sys


PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = PROJECT_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.config import settings
from app.ingestion.chunker import chunk_document
from app.ingestion.embedder import embed_chunks
from app.ingestion.pdf_parser import parse_pdf
from app.retrieval.retriever import format_context, retrieve
from app.retrieval.vector_store import get_collection_stats, upsert_chunks


logging.basicConfig(level=logging.INFO, format="%(levelname)s:%(name)s:%(message)s")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Test ChromaDB vector store flow.")
    parser.add_argument("--pdf", help="PDF to ingest. Defaults to first PDF in papers dir.")
    parser.add_argument(
        "--query",
        default="What is the main contribution of this paper?",
        help="Semantic query to test retrieval.",
    )
    return parser.parse_args()


def _default_pdf() -> Path:
    pdfs = sorted(settings.papers_path.rglob("*.pdf"))
    if not pdfs:
        raise FileNotFoundError(f"No PDF files found in {settings.papers_path}")
    return pdfs[0]


def main() -> int:
    args = parse_args()
    pdf_path = Path(args.pdf).resolve() if args.pdf else _default_pdf()

    document = parse_pdf(pdf_path)
    chunks = chunk_document(document)
    chunks_with_embeddings = embed_chunks(chunks, show_progress=True)

    first_result = upsert_chunks(chunks_with_embeddings)
    print("First upsert:")
    print(first_result.model_dump_json(indent=2))

    stats = get_collection_stats()
    print("\nStats:")
    print(stats.model_dump_json(indent=2))

    retrieval = retrieve(args.query, top_k=3, score_threshold=0.0)
    print("\nTop chunks:")
    for chunk in retrieval.chunks:
        print(
            f"{chunk.rank}. score={chunk.score:.3f} "
            f"{chunk.metadata.file_name} page={chunk.metadata.page_number}"
        )

    print("\nContext preview:")
    print(format_context(retrieval.chunks)[:1200])

    second_result = upsert_chunks(chunks_with_embeddings)
    print("\nSecond upsert:")
    print(second_result.model_dump_json(indent=2))

    if second_result.inserted != 0:
        raise RuntimeError("Expected second upsert to be idempotent with inserted=0")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
