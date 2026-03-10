package handlers

import (
	"net/http"
	"time"

	"studybuddy-backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type SettingsHandler struct {
	DB *gorm.DB
}

type settingsRequest struct {
	AnthropicAPIKey string `json:"anthropicApiKey"`
	LLMModel        string `json:"llmModel"`
}

func (h *SettingsHandler) GetSettings(c *gin.Context) {
	userID := c.GetString("userID")

	var settings models.UserSettings
	result := h.DB.Where(`"userId" = ?`, userID).First(&settings)
	if result.Error != nil {
		// Return defaults if not found
		c.JSON(http.StatusOK, models.UserSettings{
			UserID:          userID,
			AnthropicAPIKey: "",
			LLMModel:        "claude-3-5-haiku-20241022",
			UpdatedAt:       time.Now(),
		})
		return
	}

	c.JSON(http.StatusOK, settings)
}

func (h *SettingsHandler) PutSettings(c *gin.Context) {
	userID := c.GetString("userID")

	var req settingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.LLMModel == "" {
		req.LLMModel = "claude-3-5-haiku-20241022"
	}

	settings := models.UserSettings{
		UserID:          userID,
		AnthropicAPIKey: req.AnthropicAPIKey,
		LLMModel:        req.LLMModel,
		UpdatedAt:       time.Now(),
	}

	result := h.DB.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "userId"}},
		DoUpdates: clause.AssignmentColumns([]string{"anthropicApiKey", "llmModel", "updatedAt"}),
	}).Create(&settings)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save settings"})
		return
	}

	c.JSON(http.StatusOK, settings)
}
