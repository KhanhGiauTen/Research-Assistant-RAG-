from __future__ import annotations

import argparse
import asyncio
import logging
from pathlib import Path
import sys


PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = PROJECT_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.generation.llm_client import (  # noqa: E402
    GenerationRequest,
    Message,
    build_rag_prompt,
    check_ollama_health,
    generate,
    generate_stream,
)
from app.ingestion.chunker import ChunkMetadata  # noqa: E402
from app.retrieval.retriever import RetrievedChunk  # noqa: E402


logging.basicConfig(level=logging.INFO, format="%(levelname)s:%(name)s:%(message)s")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Test Ollama LLM integration.")
    parser.add_argument("--generate", action="store_true", help="Call Ollama generation.")
    parser.add_argument("--stream", action="store_true", help="Call Ollama streaming.")
    return parser.parse_args()


def mock_chunks() -> list[RetrievedChunk]:
    metadata = ChunkMetadata(
        file_name="mock-paper.pdf",
        file_path="/tmp/mock-paper.pdf",
        page_number=1,
        chunk_index=0,
        total_chunks_in_page=1,
        char_count=180,
    )
    return [
        RetrievedChunk(
            chunk_id="mock-paper.pdf::page_1::chunk_0",
            text=(
                "The paper proposes a local retrieval augmented generation system "
                "where retrieved passages are passed to a local language model."
            ),
            score=0.91,
            metadata=metadata,
            rank=1,
        )
    ]


async def main() -> int:
    args = parse_args()
    chunks = mock_chunks()
    history = [
        Message(role="user", content="What system are we discussing?"),
        Message(role="assistant", content="A local research assistant."),
    ]
    request = GenerationRequest(
        query="What does the mock paper propose?",
        context_chunks=chunks,
        conversation_history=history,
    )

    health = await check_ollama_health()
    print("Health:")
    print(health)

    messages = build_rag_prompt(request.query, chunks, history)
    print("\nPrompt message count:", len(messages))
    print("System message preview:")
    print(messages[0]["content"][:800])

    if args.generate:
        if not health["available"] or not health["model_loaded"]:
            print("\nSkipping generate: Ollama or requested model is unavailable.")
        else:
            response = await generate(request)
            print(response.model_dump_json(indent=2))

    if args.stream:
        if not health["available"] or not health["model_loaded"]:
            print("\nSkipping stream: Ollama or requested model is unavailable.")
        else:
            async for event in generate_stream(request):
                print(event)

    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
