from __future__ import annotations

from pathlib import Path
import sys

import fitz
import pytest


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


@pytest.fixture()
def sample_pdf(tmp_path: Path) -> Path:
    path = tmp_path / "sample.pdf"
    document = fitz.open()
    page = document.new_page()
    page.insert_text(
        (72, 72),
        (
            "Abstract\n"
            "This sample paper describes a local retrieval augmented generation "
            "assistant for research papers. It contains enough text for parsing "
            "and chunking tests.\n\n"
            "Introduction\n"
            "The system reads PDF documents, creates chunks, and retrieves local "
            "evidence for answers without paid APIs."
        ),
    )
    document.save(path)
    document.close()
    return path
