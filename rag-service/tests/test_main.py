"""
Tests for rag-service FastAPI app.
LightRAG calls are fully mocked — no OpenAI key needed.
We patch app.rag_engine.ingest_text / query_rag directly to avoid any
sys.modules manipulation that causes segfaults with PyMuPDF on Python 3.14.
"""
import io
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _txt_upload(content: str = "hello world", name: str = "doc.txt"):
    return ("file", (name, io.BytesIO(content.encode()), "text/plain"))


# ---------------------------------------------------------------------------
# /health
# ---------------------------------------------------------------------------
class TestHealth:
    def test_health_returns_ok(self):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok"}


# ---------------------------------------------------------------------------
# /ingest
# ---------------------------------------------------------------------------
class TestIngest:
    @patch("app.rag_engine.ingest_text", new_callable=AsyncMock)
    def test_ingest_txt_success(self, mock_ingest):
        resp = client.post("/ingest", files=[_txt_upload("Study notes about photosynthesis.")])
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["filename"] == "doc.txt"
        assert data["chunks"] >= 1
        mock_ingest.assert_called_once()

    @patch("app.rag_engine.ingest_text", new_callable=AsyncMock)
    def test_ingest_md_success(self, mock_ingest):
        resp = client.post(
            "/ingest",
            files=[("file", ("notes.md", io.BytesIO(b"# Title\nSome content."), "text/markdown"))],
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

    def test_ingest_unsupported_type_returns_400(self):
        resp = client.post(
            "/ingest",
            files=[("file", ("report.docx", io.BytesIO(b"data"), "application/octet-stream"))],
        )
        assert resp.status_code == 400
        assert "unsupported" in resp.json()["detail"].lower()

    def test_ingest_empty_file_returns_400(self):
        resp = client.post("/ingest", files=[_txt_upload("", "empty.txt")])
        assert resp.status_code == 400
        assert "empty" in resp.json()["detail"].lower()

    def test_ingest_no_file_returns_422(self):
        resp = client.post("/ingest")
        assert resp.status_code == 422

    @patch("app.rag_engine.ingest_text", new_callable=AsyncMock)
    def test_ingest_pdf_success(self, mock_ingest):
        """Use a real (minimal) PDF that PyMuPDF can parse."""
        # A valid 1-page PDF with visible text created by PyMuPDF itself
        import fitz  # type: ignore  # noqa: PLC0415
        doc = fitz.open()
        page = doc.new_page()
        page.insert_text((72, 72), "Hello, this is a test PDF with enough content for LightRAG.")
        pdf_bytes = doc.tobytes()
        doc.close()

        resp = client.post(
            "/ingest",
            files=[("file", ("lecture.pdf", io.BytesIO(pdf_bytes), "application/pdf"))],
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"
        mock_ingest.assert_called_once()

    @patch("app.rag_engine.ingest_text", new_callable=AsyncMock)
    def test_ingest_rag_failure_returns_500(self, mock_ingest):
        mock_ingest.side_effect = RuntimeError("LightRAG exploded")
        resp = client.post("/ingest", files=[_txt_upload("some content")])
        assert resp.status_code == 500
        assert "ingestion failed" in resp.json()["detail"].lower()

    @patch("app.rag_engine.ingest_text", new_callable=AsyncMock)
    def test_ingest_chunks_count(self, mock_ingest):
        """Chunk count scales with text length."""
        long_text = "word " * 500  # ~2500 chars → 3 chunks at 1200-char size
        resp = client.post("/ingest", files=[_txt_upload(long_text, "long.txt")])
        assert resp.status_code == 200
        assert resp.json()["chunks"] >= 2


# ---------------------------------------------------------------------------
# /query
# ---------------------------------------------------------------------------
class TestQuery:
    @patch("app.rag_engine.query_rag", new_callable=AsyncMock, return_value="mocked answer")
    def test_query_returns_result(self, mock_query):
        resp = client.get("/query", params={"q": "What is photosynthesis?"})
        assert resp.status_code == 200
        assert resp.json()["result"] == "mocked answer"
        mock_query.assert_called_once_with("What is photosynthesis?", mode="hybrid")

    def test_query_missing_q_returns_422(self):
        resp = client.get("/query")
        assert resp.status_code == 422

    @patch("app.rag_engine.query_rag", new_callable=AsyncMock, return_value="local answer")
    def test_query_custom_mode(self, mock_query):
        resp = client.get("/query", params={"q": "test", "mode": "local"})
        assert resp.status_code == 200
        mock_query.assert_called_once_with("test", mode="local")

    def test_query_invalid_mode_returns_400(self):
        resp = client.get("/query", params={"q": "test", "mode": "invalid_mode"})
        assert resp.status_code == 400
        assert "invalid mode" in resp.json()["detail"].lower()

    @patch("app.rag_engine.query_rag", new_callable=AsyncMock)
    def test_query_failure_returns_500(self, mock_query):
        mock_query.side_effect = RuntimeError("query failed")
        resp = client.get("/query", params={"q": "test"})
        assert resp.status_code == 500
        assert "query failed" in resp.json()["detail"].lower()
