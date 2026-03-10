"""
LightRAG microservice — FastAPI app.

Endpoints:
  POST /ingest   — upload a document; runs LightRAG ingestion pipeline
  GET  /query    — query the knowledge graph
  GET  /health   — liveness check
"""
import io
import os
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, File, HTTPException, Query, UploadFile

ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md"}
VALID_MODES = {"naive", "local", "global", "hybrid"}

app = FastAPI(title="StudyBuddy RAG Service", version="1.0.0")


def _extract_text(filename: str, data: bytes) -> str:
    """Return plain text from file bytes based on extension."""
    ext = Path(filename).suffix.lower()

    if ext == ".pdf":
        try:
            import fitz  # PyMuPDF  # type: ignore
        except ImportError as exc:
            raise RuntimeError("PyMuPDF not installed. Run: pip install pymupdf") from exc

        doc = fitz.open(stream=io.BytesIO(data), filetype="pdf")
        return "\n".join(page.get_text() for page in doc).strip()

    # TXT / MD — assume UTF-8
    return data.decode("utf-8", errors="replace").strip()


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/ingest")
async def ingest(file: UploadFile = File(...)):
    """Ingest a document into LightRAG."""
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"unsupported file type: {ext or '(none)'}. Allowed: {sorted(ALLOWED_EXTENSIONS)}",
        )

    data = await file.read()

    try:
        text = _extract_text(file.filename, data)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"text extraction failed: {exc}") from exc

    if not text:
        raise HTTPException(status_code=400, detail="empty document — no text could be extracted")

    # Lazy import so tests can patch before this runs
    from app import rag_engine  # noqa: PLC0415

    try:
        await rag_engine.ingest_text(text)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"ingestion failed: {exc}") from exc

    # Approximate chunk count (LightRAG default chunk size ~1200 chars)
    chunk_size = 1200
    chunks = max(1, (len(text) + chunk_size - 1) // chunk_size)

    return {"status": "ok", "filename": file.filename, "chunks": chunks}


@app.get("/query")
async def query(
    q: str = Query(..., description="Question to ask the knowledge graph"),
    mode: str = Query("hybrid", description="Retrieval mode: naive|local|global|hybrid"),
):
    """Query the LightRAG knowledge graph."""
    if mode not in VALID_MODES:
        raise HTTPException(
            status_code=400,
            detail=f"invalid mode '{mode}'. Valid modes: {sorted(VALID_MODES)}",
        )

    from app import rag_engine  # noqa: PLC0415

    try:
        result = await rag_engine.query_rag(q, mode=mode)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"query failed: {exc}") from exc

    return {"result": result}
