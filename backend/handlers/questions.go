package handlers

import (
	"database/sql"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type QuestionHandler struct {
	DB *gorm.DB
}

// AnswerQuestion handles POST /api/questions/:id/answer
func (h *QuestionHandler) AnswerQuestion(c *gin.Context) {
	questionID := c.Param("id")

	var body struct {
		UserAnswer string `json:"userAnswer" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get question
	var (
		answer      string
		explanation string
		qType       string
	)
	err := h.DB.Raw(
		`SELECT "answer", "explanation", "type" FROM "Question" WHERE "id" = ?`,
		questionID,
	).Row().Scan(&answer, &explanation, &qType)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "question not found"})
		return
	}

	// Compare answers (case-insensitive, trimmed)
	userAnswerNorm := strings.TrimSpace(strings.ToLower(body.UserAnswer))
	correctAnswerNorm := strings.TrimSpace(strings.ToLower(answer))
	isCorrect := userAnswerNorm == correctAnswerNorm

	// Insert answer history
	historyID := uuid.New().String()

	result := h.DB.Exec(
		`INSERT INTO "AnswerHistory" ("id", "questionId", "isCorrect", "userAnswer") VALUES (?, ?, ?, ?)`,
		historyID, questionID, isCorrect, body.UserAnswer,
	)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to record answer"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"isCorrect":     isCorrect,
		"correctAnswer": answer,
		"explanation":   explanation,
		"historyId":     historyID,
	})
}

// nullStringPtr helper for sql.NullString
func nullStringPtr(ns sql.NullString) *string {
	if ns.Valid {
		return &ns.String
	}
	return nil
}
