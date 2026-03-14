package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"studybuddy-backend/agents"
	"studybuddy-backend/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AdaptiveHandler struct {
	DB *gorm.DB
}

// GetAdaptive handles GET /api/adaptive?materialId=xxx
// Returns prioritized questions sorted by wrong-answer count (desc)
func (h *AdaptiveHandler) GetAdaptive(c *gin.Context) {
	materialID := c.Query("materialId")
	if materialID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "materialId is required"})
		return
	}

	// Get all questions with their answer history
	rows, err := h.DB.Raw(`
		SELECT q."id", q."materialId", q."type", q."question", q."options",
		       q."answer", q."explanation", q."topic", q."createdAt",
		       SUM(CASE WHEN ah."isCorrect" = false THEN 1 ELSE 0 END) as wrongCount
		FROM "Question" q
		LEFT JOIN "AnswerHistory" ah ON ah."questionId" = q."id"
		WHERE q."materialId" = ?
		GROUP BY q."id"
		ORDER BY wrongCount DESC, q."createdAt" ASC
	`, materialID).Rows()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query questions"})
		return
	}
	defer rows.Close()

	questions := []models.Question{}
	for rows.Next() {
		var q models.Question
		var options sql.NullString
		var wrongCount int
		if err := rows.Scan(
			&q.ID, &q.MaterialID, &q.Type, &q.QuestionText, &options,
			&q.Answer, &q.Explanation, &q.Topic, &q.CreatedAt, &wrongCount,
		); err != nil {
			continue
		}
		if options.Valid {
			q.Options = &options.String
		}
		questions = append(questions, q)
	}

	c.JSON(http.StatusOK, questions)
}

// PostAdaptive handles POST /api/adaptive
// Generates new questions targeting weak topics based on wrong answers
func (h *AdaptiveHandler) PostAdaptive(c *gin.Context) {
	var body struct {
		MaterialID string `json:"materialId" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get material content
	var content string
	err := h.DB.Raw(`SELECT "content" FROM "Material" WHERE "id" = ?`, body.MaterialID).Row().Scan(&content)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "material not found"})
		return
	}

	// Get last 20 wrong answers with their topics
	rows, err := h.DB.Raw(`
		SELECT DISTINCT q."topic"
		FROM "AnswerHistory" ah
		JOIN "Question" q ON q."id" = ah."questionId"
		WHERE q."materialId" = ? AND ah."isCorrect" = false
		ORDER BY ah."answeredAt" DESC
		LIMIT 20
	`, body.MaterialID).Rows()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query answer history"})
		return
	}
	defer rows.Close()

	weakTopics := []string{}
	topicSet := map[string]bool{}
	for rows.Next() {
		var topic string
		if err := rows.Scan(&topic); err != nil {
			continue
		}
		if !topicSet[topic] {
			topicSet[topic] = true
			weakTopics = append(weakTopics, topic)
		}
	}

	if len(weakTopics) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"weakTopics": []string{},
			"questions":  []interface{}{},
			"message":    "틀린 문제가 없어 보충 문제를 생성할 수 없습니다.",
		})
		return
	}

	// Generate adaptive questions
	newQuestions, err := agents.GenerateAdaptiveQuestions(content, weakTopics)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate adaptive questions"})
		return
	}

	// Save new questions to DB
	savedQuestions := []models.Question{}
	for _, q := range newQuestions {
		qID := uuid.New().String()
		var optionsJSON *string
		if len(q.Options) > 0 {
			b, _ := json.Marshal(q.Options)
			s := string(b)
			optionsJSON = &s
		}

		result := h.DB.Exec(
			`INSERT INTO "Question" ("id", "materialId", "type", "question", "options", "answer", "explanation", "topic", "createdAt")
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
			qID, body.MaterialID, q.Type, q.Question, optionsJSON, q.Answer, q.Explanation, q.Topic,
		)
		if result.Error != nil {
			continue
		}

		savedQ := models.Question{
			ID:           qID,
			MaterialID:   body.MaterialID,
			Type:         q.Type,
			QuestionText: q.Question,
			Answer:       q.Answer,
			Explanation:  q.Explanation,
			Topic:        q.Topic,
		}
		if optionsJSON != nil {
			savedQ.Options = optionsJSON
		}
		savedQuestions = append(savedQuestions, savedQ)
	}

	c.JSON(http.StatusOK, gin.H{
		"weakTopics": weakTopics,
		"questions":  savedQuestions,
		"message":    "보충 문제가 생성되었습니다. 새 문제가 문제 목록에 추가되었습니다.",
	})
}
