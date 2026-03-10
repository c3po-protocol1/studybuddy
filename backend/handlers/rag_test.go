package handlers

import (
	"bytes"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

// newTestRAGHandler creates a RagHandler pointing at a test rag-service URL.
func newTestRAGHandler(ragServiceURL string) *RagHandler {
	return &RagHandler{RagServiceURL: ragServiceURL}
}

// multipartBody builds a minimal multipart/form-data body with a single file field.
func multipartBody(t *testing.T, fieldName, filename, content string) (io.Reader, string) {
	t.Helper()
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	fw, err := w.CreateFormFile(fieldName, filename)
	if err != nil {
		t.Fatalf("create form file: %v", err)
	}
	if _, err := fw.Write([]byte(content)); err != nil {
		t.Fatalf("write form file: %v", err)
	}
	w.Close()
	return &buf, w.FormDataContentType()
}

// ginContext creates a test *gin.Context backed by a ResponseRecorder.
func ginContext(t *testing.T, method, path string, body io.Reader, contentType string) (*gin.Context, *httptest.ResponseRecorder) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	req := httptest.NewRequest(method, path, body)
	req.Header.Set("Content-Type", contentType)
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	return c, w
}

// ── IngestRAG ───────────────────────────────────────────────────────────────

func TestRagIngest_Success(t *testing.T) {
	// Fake rag-service that returns 200 OK
	fakeSvc := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/ingest" || r.Method != http.MethodPost {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok","filename":"doc.txt","chunks":3}`))
	}))
	defer fakeSvc.Close()

	h := newTestRAGHandler(fakeSvc.URL)
	body, ct := multipartBody(t, "file", "doc.txt", "some study content")
	c, w := ginContext(t, http.MethodPost, "/api/rag/ingest", body, ct)

	h.IngestRAG(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d — body: %s", w.Code, w.Body.String())
	}
	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("invalid JSON: %v", err)
	}
	if resp["status"] != "ok" {
		t.Errorf("expected status=ok, got %v", resp["status"])
	}
}

func TestRagIngest_NoFile_Returns400(t *testing.T) {
	fakeSvc := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer fakeSvc.Close()

	h := newTestRAGHandler(fakeSvc.URL)
	// Send form without file field
	c, w := ginContext(t, http.MethodPost, "/api/rag/ingest",
		strings.NewReader(""), "application/x-www-form-urlencoded")

	h.IngestRAG(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestRagIngest_RagServiceError_Propagates(t *testing.T) {
	// Fake rag-service that returns 400
	fakeSvc := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"detail":"unsupported file type: .docx"}`))
	}))
	defer fakeSvc.Close()

	h := newTestRAGHandler(fakeSvc.URL)
	body, ct := multipartBody(t, "file", "doc.docx", "binary data")
	c, w := ginContext(t, http.MethodPost, "/api/rag/ingest", body, ct)

	h.IngestRAG(c)

	// Should proxy the upstream status code
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 from upstream, got %d — body: %s", w.Code, w.Body.String())
	}
}

func TestRagIngest_RagServiceUnavailable_Returns502(t *testing.T) {
	h := newTestRAGHandler("http://127.0.0.1:19999") // nothing listening here
	body, ct := multipartBody(t, "file", "doc.txt", "content")
	c, w := ginContext(t, http.MethodPost, "/api/rag/ingest", body, ct)

	h.IngestRAG(c)

	if w.Code != http.StatusBadGateway {
		t.Errorf("expected 502, got %d", w.Code)
	}
}

func TestRagIngest_FileTooLarge_Returns413(t *testing.T) {
	fakeSvc := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok","filename":"big.txt","chunks":1}`))
	}))
	defer fakeSvc.Close()

	h := newTestRAGHandler(fakeSvc.URL)

	// Build a multipart body > 50 MB
	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	fw, _ := mw.CreateFormFile("file", "big.txt")
	// Write 51 MB of zeros
	zeros := make([]byte, 1024)
	for i := 0; i < 51*1024; i++ {
		fw.Write(zeros)
	}
	mw.Close()

	c, w := ginContext(t, http.MethodPost, "/api/rag/ingest", &buf, mw.FormDataContentType())
	h.IngestRAG(c)

	if w.Code != http.StatusRequestEntityTooLarge {
		t.Errorf("expected 413, got %d", w.Code)
	}
}
