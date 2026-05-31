from __future__ import annotations

import argparse
import logging
from pathlib import Path
import sys


PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = PROJECT_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.ingestion.chunker import chunk_document
from app.ingestion.embedder import embed_chunks, embed_text
from app.ingestion.pdf_parser import parse_pdf


logging.basicConfig(level=logging.INFO, format="%(levelname)s:%(name)s:%(message)s")
logger = logging.getLogger(__name__)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Test the PDF ingestion pipeline.")
    parser.add_argument("--pdf", required=True, help="Path to a sample PDF file.")
    parser.add_argument(
        "--embed-limit",
        type=int,
        default=5,
        help="Number of chunks to embed for a quick smoke test.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    document = parse_pdf(args.pdf)
    total_chars = sum(page.char_count for page in document.pages)

    print(f"Parsed: {document.file_name}")
    print(f"Pages with text: {len(document.pages)} / {document.total_pages}")
    print(f"Total chars: {total_chars}")

    chunks = chunk_document(document)
    avg_size = sum(len(chunk.text) for chunk in chunks) / len(chunks) if chunks else 0
    unique_ids = {chunk.chunk_id for chunk in chunks}

    print(f"Chunks: {len(chunks)}")
    print(f"Unique chunk IDs: {len(unique_ids)}")
    print(f"Average chunk size: {avg_size:.0f} chars")

    if chunks:
        sample = chunks[0]
        print("\nSample chunk:")
        print(sample.model_dump_json(indent=2)[:1000])

    embed_sample = chunks[: max(args.embed_limit, 0)]
    chunks_with_embeddings = embed_chunks(embed_sample, show_progress=False)
    if chunks_with_embeddings:
        print(f"\nEmbedding dimension: {len(chunks_with_embeddings[0][1])}")

    query_vector = embed_text("hello world")
    print(f"Query embedding dimension: {len(query_vector)}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
