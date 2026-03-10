package handlers

import (
	"bytes"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

const (
	maxRAGFileSize = 50 << 20 // 50 MB
)

// RagHandler proxies document ingest/query requests to the Python rag-service.
type RagHandler struct {
	// RagServiceURL is the base URL of the rag-service (e.g. http://rag-service:8000).
	// Falls back to RAG_SERVICE_URL env var, then http://rag-service:8000.
	RagServiceURL string
}

func (h *RagHandler) ragURL() string {
	if h.RagServiceURL != "" {
		return h.RagServiceURL
	}
	if u := os.Getenv("RAG_SERVICE_URL"); u != "" {
		return u
	}
	return "http://rag-service:8000"
}

// IngestRAG handles POST /api/rag/ingest
// Accepts a multipart file upload and forwards it to the rag-service.
func (h *RagHandler) IngestRAG(c *gin.Context) {
	// Enforce size limit before parsing
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxRAGFileSize)

	if err := c.Request.ParseMultipartForm(maxRAGFileSize); err != nil {
		if err.Error() == "http: request body too large" {
			c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": "file too large (max 50 MB)"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to parse multipart form"})
		return
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file field is required"})
		return
	}
	defer file.Close()

	// Re-encode as multipart to forward to rag-service
	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	fw, err := mw.CreateFormFile("file", header.Filename)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to build forward request"})
		return
	}
	if _, err := io.Copy(fw, file); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read file"})
		return
	}
	mw.Close()

	// POST to rag-service
	ragURL := fmt.Sprintf("%s/ingest", h.ragURL())
	req, err := http.NewRequestWithContext(c.Request.Context(), http.MethodPost, ragURL, &buf)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create request"})
		return
	}
	req.Header.Set("Content-Type", mw.FormDataContentType())

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": fmt.Sprintf("rag-service unavailable: %v", err)})
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	c.Data(resp.StatusCode, "application/json", body)
}
