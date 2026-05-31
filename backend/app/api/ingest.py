from __future__ import annotations

from datetime import datetime, timezone
import logging
from pathlib import Path
from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

from app.config import settings
from app.ingestion.chunker import chunk_document
from app.ingestion.embedder import embed_chunks
from app.ingestion.pdf_parser import parse_pdf
from app.retrieval.cache import query_cache
from app.retrieval.vector_store import delete_file, get_collection_stats, upsert_chunks


logger = logging.getLogger(__name__)
router = APIRouter()


class IngestResponse(BaseModel):
    job_id: str
    files: list[str]
    status: Literal["processing", "queued"]
    message: str


class JobStatus(BaseModel):
    job_id: str
    files: list[str]
    status: Literal["processing", "completed", "failed"]
    progress: str
    created_at: datetime
    completed_at: datetime | None = None
    error: str | None = None
    chunks_indexed: int = 0


class FileInfo(BaseModel):
    file_name: str
    chunk_count: int


class IndexedFilesResponse(BaseModel):
    files: list[FileInfo]
    total_chunks: int


class DeleteFileResponse(BaseModel):
    deleted: bool
    chunks_removed: int
    file_deleted_from_disk: bool = False


_jobs: dict[str, JobStatus] = {}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _safe_file_name(upload: UploadFile) -> str:
    if not upload.filename:
        raise HTTPException(status_code=422, detail="Uploaded file is missing a name")
    return Path(upload.filename).name


def _validate_pdf(upload: UploadFile) -> str:
    file_name = _safe_file_name(upload)
    is_pdf_name = file_name.lower().endswith(".pdf")
    is_pdf_content = upload.content_type == "application/pdf"
    if not is_pdf_name and not is_pdf_content:
        raise HTTPException(status_code=422, detail=f"Only PDF files are supported: {file_name}")
    return file_name


def _is_inside_papers_dir(path: Path) -> bool:
    return path.resolve().is_relative_to(settings.papers_path)


def ingest_files(file_paths: list[str], job_id: str) -> None:
    job = _jobs[job_id]
    total_chunks = 0

    try:
        for file_path in file_paths:
            path = Path(file_path)
            job.progress = f"Parsing {path.name}..."
            document = parse_pdf(path)

            job.progress = f"Chunking {path.name}..."
            chunks = chunk_document(document)

            job.progress = f"Embedding {len(chunks)} chunks from {path.name}..."
            chunks_with_embeddings = embed_chunks(chunks, show_progress=False)

            job.progress = f"Indexing {path.name}..."
            result = upsert_chunks(chunks_with_embeddings)
            query_cache.invalidate_all()
            total_chunks += result.inserted + result.updated
            job.chunks_indexed = total_chunks

        job.status = "completed"
        job.progress = "Completed"
        job.completed_at = _now()
        logger.info("Ingestion job %s completed", job_id)
    except Exception as exc:
        logger.exception("Ingestion job %s failed", job_id)
        job.status = "failed"
        job.progress = "Failed"
        job.error = str(exc)
        job.completed_at = _now()


@router.post("/upload", response_model=IngestResponse)
async def upload_and_ingest(
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...),
) -> IngestResponse:
    if not files:
        raise HTTPException(status_code=422, detail="At least one PDF file is required")

    file_names = [_validate_pdf(upload) for upload in files]
    settings.papers_path.mkdir(parents=True, exist_ok=True)

    saved_paths: list[str] = []
    for upload, file_name in zip(files, file_names, strict=True):
        target_path = (settings.papers_path / file_name).resolve()
        if not _is_inside_papers_dir(target_path):
            raise HTTPException(status_code=422, detail=f"Invalid file name: {file_name}")

        content = await upload.read()
        target_path.write_bytes(content)
        saved_paths.append(str(target_path))

    job_id = str(uuid4())
    _jobs[job_id] = JobStatus(
        job_id=job_id,
        files=file_names,
        status="processing",
        progress="Queued",
        created_at=_now(),
    )
    background_tasks.add_task(ingest_files, saved_paths, job_id)

    return IngestResponse(
        job_id=job_id,
        files=file_names,
        status="processing",
        message="Ingestion started",
    )


@router.get("/status/{job_id}", response_model=JobStatus)
async def get_job_status(job_id: str) -> JobStatus:
    if job_id not in _jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return _jobs[job_id]


@router.get("/files", response_model=IndexedFilesResponse)
async def list_files() -> IndexedFilesResponse:
    stats = get_collection_stats()
    return IndexedFilesResponse(
        files=[
            FileInfo(file_name=file_name, chunk_count=count)
            for file_name, count in stats.chunks_per_file.items()
        ],
        total_chunks=stats.total_chunks,
    )


@router.delete("/files/{file_name:path}", response_model=DeleteFileResponse)
async def delete_indexed_file(
    file_name: str,
    delete_from_disk: bool = False,
) -> DeleteFileResponse:
    safe_name = Path(file_name).name
    chunks_removed = delete_file(safe_name)
    if chunks_removed:
        query_cache.invalidate_all()
    file_deleted = False

    if delete_from_disk:
        target_path = (settings.papers_path / safe_name).resolve()
        if _is_inside_papers_dir(target_path) and target_path.exists():
            target_path.unlink()
            file_deleted = True

    return DeleteFileResponse(
        deleted=chunks_removed > 0 or file_deleted,
        chunks_removed=chunks_removed,
        file_deleted_from_disk=file_deleted,
    )
