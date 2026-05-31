from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import FileResponse

from app.documents import page_text_for_document, resolve_paper_document


router = APIRouter()


@router.get("/{file_id}/pdf")
async def get_pdf(file_id: str) -> FileResponse:
    document = resolve_paper_document(file_id)
    return FileResponse(
        path=document.path,
        media_type="application/pdf",
        filename=document.file_name,
    )


@router.get("/{file_id}/pages/{page_number}")
async def get_page_text(file_id: str, page_number: int) -> dict[str, str | int]:
    document = resolve_paper_document(file_id)
    text = page_text_for_document(document, page_number)
    return {
        "file_id": document.file_id,
        "file_name": document.file_name,
        "display_title": document.display_title,
        "page_number": page_number,
        "text": text,
    }
