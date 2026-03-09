package handlers

import (
	"database/sql"
	"net/http"
	"time"

	"studybuddy-backend/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type SpaceHandler struct {
	DB *sql.DB
}

func (h *SpaceHandler) GetSpaces(c *gin.Context) {
	rows, err := h.DB.Query(`
		SELECT s."id", s."name", s."emoji", s."color", s."createdAt",
		       COUNT(m."id") as materialCount
		FROM "Space" s
		LEFT JOIN "Material" m ON m."spaceId" = s."id"
		GROUP BY s."id"
		ORDER BY s."createdAt" DESC
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query spaces"})
		return
	}
	defer rows.Close()

	spaces := []models.Space{}
	for rows.Next() {
		var sp models.Space
		var createdAtStr string
		var matCount int
		if err := rows.Scan(&sp.ID, &sp.Name, &sp.Emoji, &sp.Color, &createdAtStr, &matCount); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to scan space"})
			return
		}
		sp.CreatedAt = parseTime(createdAtStr)
		sp.Count = &models.MaterialCount{Materials: matCount}
		spaces = append(spaces, sp)
	}

	c.JSON(http.StatusOK, spaces)
}

func (h *SpaceHandler) CreateSpace(c *gin.Context) {
	var body struct {
		Name  string `json:"name" binding:"required"`
		Emoji string `json:"emoji"`
		Color string `json:"color"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if body.Emoji == "" {
		body.Emoji = "📚"
	}
	if body.Color == "" {
		body.Color = "#6366f1"
	}

	id := uuid.New().String()
	_, err := h.DB.Exec(
		`INSERT INTO "Space" ("id", "name", "emoji", "color") VALUES (?, ?, ?, ?)`,
		id, body.Name, body.Emoji, body.Color,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create space"})
		return
	}

	space := models.Space{
		ID:        id,
		Name:      body.Name,
		Emoji:     body.Emoji,
		Color:     body.Color,
		CreatedAt: time.Now(),
		Count:     &models.MaterialCount{Materials: 0},
	}

	c.JSON(http.StatusCreated, space)
}

func (h *SpaceHandler) GetSpace(c *gin.Context) {
	spaceID := c.Param("id")

	var sp models.Space
	var createdAtStr string
	err := h.DB.QueryRow(
		`SELECT "id", "name", "emoji", "color", "createdAt" FROM "Space" WHERE "id" = ?`,
		spaceID,
	).Scan(&sp.ID, &sp.Name, &sp.Emoji, &sp.Color, &createdAtStr)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "space not found"})
		return
	}
	sp.CreatedAt = parseTime(createdAtStr)

	// Get materials with summary, keypoints count of questions
	matRows, err := h.DB.Query(`
		SELECT m."id", m."spaceId", m."filename", m."status", m."createdAt",
		       s."content",
		       kp."points",
		       COUNT(q."id") as questionCount
		FROM "Material" m
		LEFT JOIN "Summary" s ON s."materialId" = m."id"
		LEFT JOIN "KeyPoints" kp ON kp."materialId" = m."id"
		LEFT JOIN "Question" q ON q."materialId" = m."id"
		WHERE m."spaceId" = ?
		GROUP BY m."id"
		ORDER BY m."createdAt" ASC
	`, spaceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query materials"})
		return
	}
	defer matRows.Close()

	materials := []models.Material{}
	for matRows.Next() {
		var mat models.Material
		var matCreatedAtStr string
		var summaryContent sql.NullString
		var kpPoints sql.NullString
		var qCount int

		if err := matRows.Scan(
			&mat.ID, &mat.SpaceID, &mat.Filename, &mat.Status, &matCreatedAtStr,
			&summaryContent, &kpPoints, &qCount,
		); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to scan material"})
			return
		}
		mat.CreatedAt = parseTime(matCreatedAtStr)

		if summaryContent.Valid {
			mat.Summary = &models.Summary{Content: summaryContent.String}
		}
		if kpPoints.Valid {
			mat.KeyPoints = &models.KeyPoints{Points: kpPoints.String}
		}
		mat.Count = &models.QuestionCount{Questions: qCount}

		materials = append(materials, mat)
	}

	sp.Materials = materials
	c.JSON(http.StatusOK, sp)
}

func (h *SpaceHandler) DeleteSpace(c *gin.Context) {
	spaceID := c.Param("id")

	res, err := h.DB.Exec(`DELETE FROM "Space" WHERE "id" = ?`, spaceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete space"})
		return
	}

	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "space not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}
