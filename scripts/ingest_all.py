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
from app.ingestion.chunker import chunk_documents
from app.ingestion.embedder import embed_chunks
from app.ingestion.pdf_parser import parse_folder
from app.retrieval.vector_store import (
    get_chroma_client,
    get_collection_stats,
    upsert_chunks,
)


logging.basicConfig(level=logging.INFO, format="%(levelname)s:%(name)s:%(message)s")
logger = logging.getLogger(__name__)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Ingest all PDFs into ChromaDB.")
    parser.add_argument("--folder", default=str(settings.papers_path), help="PDF folder.")
    parser.add_argument("--reset", action="store_true", help="Delete collection first.")
    return parser.parse_args()


def reset_collection() -> None:
    client = get_chroma_client()
    try:
        client.delete_collection(settings.chroma_collection_name)
        logger.info("Deleted Chroma collection: %s", settings.chroma_collection_name)
    except Exception as exc:
        logger.info("Collection reset skipped: %s", exc)


def main() -> int:
    args = parse_args()
    if args.reset:
        reset_collection()

    documents = parse_folder(args.folder)
    chunks = chunk_documents(documents)
    chunks_with_embeddings = embed_chunks(chunks, show_progress=True)
    result = upsert_chunks(chunks_with_embeddings)
    stats = get_collection_stats()

    print("Ingest result:")
    print(result.model_dump_json(indent=2))
    print("\nCollection stats:")
    print(stats.model_dump_json(indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
