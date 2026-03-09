package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"sync"
	"time"
	"unicode/utf8"

	"studybuddy-backend/agents"
	"studybuddy-backend/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type MaterialHandler struct {
	DB *sql.DB
}

// UploadMaterial handles POST /api/spaces/:id/materials
func (h *MaterialHandler) UploadMaterial(c *gin.Context) {
	spaceID := c.Param("id")

	// Verify space exists
	var spaceExists bool
	err := h.DB.QueryRow(`SELECT COUNT(*) > 0 FROM "Space" WHERE "id" = ?`, spaceID).Scan(&spaceExists)
	if err != nil || !spaceExists {
		c.JSON(http.StatusNotFound, gin.H{"error": "space not found"})
		return
	}

	// Parse multipart form
	if err := c.Request.ParseMultipartForm(50 << 20); err != nil { // 50MB max
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to parse form"})
		return
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file is required"})
		return
	}
	defer file.Close()

	fileBytes, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read file"})
		return
	}

	var content string
	filename := header.Filename

	if strings.HasSuffix(strings.ToLower(filename), ".pdf") {
		content, err = extractPDFText(fileBytes)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	} else {
		// Text file - read directly
		if !utf8.Valid(fileBytes) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "file is not valid UTF-8 text"})
			return
		}
		content = string(fileBytes)
	}

	// Truncate to 50KB
	const maxBytes = 50 * 1024
	if len(content) > maxBytes {
		content = content[:maxBytes]
	}

	if len(strings.TrimSpace(content)) < 10 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "파일 내용을 읽을 수 없습니다."})
		return
	}

	id := uuid.New().String()
	_, err = h.DB.Exec(
		`INSERT INTO "Material" ("id", "spaceId", "filename", "content", "status") VALUES (?, ?, ?, ?, 'pending')`,
		id, spaceID, filename, content,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save material"})
		return
	}

	mat := models.Material{
		ID:        id,
		SpaceID:   spaceID,
		Filename:  filename,
		Status:    "pending",
		CreatedAt: time.Now(),
	}
	c.JSON(http.StatusCreated, mat)
}

// GetMaterials handles GET /api/spaces/:id/materials
func (h *MaterialHandler) GetMaterials(c *gin.Context) {
	spaceID := c.Param("id")

	rows, err := h.DB.Query(`
		SELECT "id", "spaceId", "filename", "status", "createdAt"
		FROM "Material"
		WHERE "spaceId" = ?
		ORDER BY "createdAt" ASC
	`, spaceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query materials"})
		return
	}
	defer rows.Close()

	materials := []models.Material{}
	for rows.Next() {
		var mat models.Material
		var createdAtStr string
		if err := rows.Scan(&mat.ID, &mat.SpaceID, &mat.Filename, &mat.Status, &createdAtStr); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to scan material"})
			return
		}
		mat.CreatedAt = parseTime(createdAtStr)
		materials = append(materials, mat)
	}

	c.JSON(http.StatusOK, materials)
}

// GetMaterial handles GET /api/materials/:id
func (h *MaterialHandler) GetMaterial(c *gin.Context) {
	materialID := c.Param("id")

	var mat models.Material
	var createdAtStr string
	err := h.DB.QueryRow(
		`SELECT "id", "spaceId", "filename", "content", "status", "createdAt" FROM "Material" WHERE "id" = ?`,
		materialID,
	).Scan(&mat.ID, &mat.SpaceID, &mat.Filename, &mat.Content, &mat.Status, &createdAtStr)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "material not found"})
		return
	}
	mat.CreatedAt = parseTime(createdAtStr)

	// Get summary
	var summaryContent sql.NullString
	var summaryID sql.NullString
	err = h.DB.QueryRow(
		`SELECT "id", "content" FROM "Summary" WHERE "materialId" = ?`, materialID,
	).Scan(&summaryID, &summaryContent)
	if err == nil && summaryContent.Valid {
		mat.Summary = &models.Summary{
			ID:         summaryID.String,
			MaterialID: materialID,
			Content:    summaryContent.String,
		}
	}

	// Get key points
	var kpID sql.NullString
	var kpPoints sql.NullString
	err = h.DB.QueryRow(
		`SELECT "id", "points" FROM "KeyPoints" WHERE "materialId" = ?`, materialID,
	).Scan(&kpID, &kpPoints)
	if err == nil && kpPoints.Valid {
		mat.KeyPoints = &models.KeyPoints{
			ID:         kpID.String,
			MaterialID: materialID,
			Points:     kpPoints.String,
		}
	}

	// Get questions ordered by createdAt ASC
	qRows, err := h.DB.Query(`
		SELECT "id", "materialId", "type", "question", "options", "answer", "explanation", "topic", "createdAt"
		FROM "Question"
		WHERE "materialId" = ?
		ORDER BY "createdAt" ASC
	`, materialID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query questions"})
		return
	}
	defer qRows.Close()

	questions := []models.Question{}
	for qRows.Next() {
		var q models.Question
		var qCreatedAtStr string
		var options sql.NullString
		if err := qRows.Scan(
			&q.ID, &q.MaterialID, &q.Type, &q.QuestionText, &options,
			&q.Answer, &q.Explanation, &q.Topic, &qCreatedAtStr,
		); err != nil {
			continue
		}
		q.CreatedAt = parseTime(qCreatedAtStr)
		if options.Valid {
			q.Options = &options.String
		}
		questions = append(questions, q)
	}
	mat.Questions = questions

	c.JSON(http.StatusOK, mat)
}

// DeleteMaterial handles DELETE /api/materials/:id
func (h *MaterialHandler) DeleteMaterial(c *gin.Context) {
	materialID := c.Param("id")

	res, err := h.DB.Exec(`DELETE FROM "Material" WHERE "id" = ?`, materialID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete material"})
		return
	}

	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "material not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// ProcessMaterial handles POST /api/materials/:id/process
func (h *MaterialHandler) ProcessMaterial(c *gin.Context) {
	materialID := c.Param("id")

	// Get material content
	var content string
	err := h.DB.QueryRow(`SELECT "content" FROM "Material" WHERE "id" = ?`, materialID).Scan(&content)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "material not found"})
		return
	}

	// Set status to processing
	_, err = h.DB.Exec(`UPDATE "Material" SET "status" = 'processing' WHERE "id" = ?`, materialID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update status"})
		return
	}

	// Run agents in parallel
	var (
		summaryContent string
		kpJSON         string
		questions      []agents.QuestionData
		summaryErr     error
		kpErr          error
		qErr           error
		wg             sync.WaitGroup
	)

	wg.Add(3)

	go func() {
		defer wg.Done()
		summaryContent, summaryErr = agents.GenerateSummary(content)
	}()

	go func() {
		defer wg.Done()
		kpJSON, kpErr = agents.GenerateKeyPoints(content)
	}()

	go func() {
		defer wg.Done()
		questions, qErr = agents.GenerateQuestions(content)
	}()

	wg.Wait()

	// Check for errors
	if summaryErr != nil || kpErr != nil || qErr != nil {
		h.DB.Exec(`UPDATE "Material" SET "status" = 'error' WHERE "id" = ?`, materialID)
		errMsg := "AI processing failed"
		if summaryErr != nil {
			errMsg = fmt.Sprintf("summary: %v", summaryErr)
		} else if kpErr != nil {
			errMsg = fmt.Sprintf("keypoints: %v", kpErr)
		} else if qErr != nil {
			errMsg = fmt.Sprintf("questions: %v", qErr)
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": errMsg})
		return
	}

	// Upsert summary
	summaryID := uuid.New().String()
	_, err = h.DB.Exec(
		`INSERT OR REPLACE INTO "Summary" ("id", "materialId", "content") VALUES (
			COALESCE((SELECT "id" FROM "Summary" WHERE "materialId" = ?), ?),
			?, ?
		)`,
		materialID, summaryID, materialID, summaryContent,
	)
	if err != nil {
		h.DB.Exec(`UPDATE "Material" SET "status" = 'error' WHERE "id" = ?`, materialID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save summary"})
		return
	}

	// Upsert key points
	kpID := uuid.New().String()
	_, err = h.DB.Exec(
		`INSERT OR REPLACE INTO "KeyPoints" ("id", "materialId", "points") VALUES (
			COALESCE((SELECT "id" FROM "KeyPoints" WHERE "materialId" = ?), ?),
			?, ?
		)`,
		materialID, kpID, materialID, kpJSON,
	)
	if err != nil {
		h.DB.Exec(`UPDATE "Material" SET "status" = 'error' WHERE "id" = ?`, materialID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save key points"})
		return
	}

	// Delete old questions and insert new ones
	h.DB.Exec(`DELETE FROM "Question" WHERE "materialId" = ?`, materialID)

	for _, q := range questions {
		qID := uuid.New().String()
		var optionsJSON *string
		if len(q.Options) > 0 {
			b, _ := json.Marshal(q.Options)
			s := string(b)
			optionsJSON = &s
		}

		_, err = h.DB.Exec(
			`INSERT INTO "Question" ("id", "materialId", "type", "question", "options", "answer", "explanation", "topic")
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			qID, materialID, q.Type, q.Question, optionsJSON, q.Answer, q.Explanation, q.Topic,
		)
		if err != nil {
			// Non-fatal, continue
			continue
		}
	}

	// Set status to done
	h.DB.Exec(`UPDATE "Material" SET "status" = 'done' WHERE "id" = ?`, materialID)

	c.JSON(http.StatusOK, gin.H{"success": true, "status": "done"})
}

// extractPDFText tries to extract readable text from PDF bytes.
func extractPDFText(data []byte) (string, error) {
	// Try to extract text from PDF parentheses notation
	re := regexp.MustCompile(`\(([^)]{2,})\)`)
	matches := re.FindAllSubmatch(data, -1)

	var sb strings.Builder
	for _, m := range matches {
		text := string(m[1])
		// Filter: only include if it contains printable ASCII or common chars
		if isPrintableText(text) {
			sb.WriteString(text)
			sb.WriteString(" ")
		}
	}

	result := strings.TrimSpace(sb.String())

	// If too little text extracted, return error
	if len(result) < 100 {
		return "", fmt.Errorf("파일 내용을 읽을 수 없습니다.")
	}

	return result, nil
}

// isPrintableText checks if the string contains mostly printable characters.
func isPrintableText(s string) bool {
	if !utf8.ValidString(s) {
		return false
	}
	printable := 0
	total := len([]rune(s))
	if total == 0 {
		return false
	}
	for _, r := range s {
		if r >= 32 && r < 127 {
			printable++
		} else if r > 127 {
			// Unicode characters (Korean, etc.)
			printable++
		}
	}
	ratio := float64(printable) / float64(total)
	return ratio > 0.7
}

// parseTime parses common SQLite datetime strings
func parseTime(s string) time.Time {
	formats := []string{
		time.RFC3339,
		"2006-01-02T15:04:05Z",
		"2006-01-02 15:04:05",
		"2006-01-02T15:04:05",
	}
	for _, f := range formats {
		if t, err := time.Parse(f, s); err == nil {
			return t
		}
	}
	return time.Time{}
}
