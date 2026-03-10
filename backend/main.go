package main

import (
	"log"

	"studybuddy-backend/config"
	"studybuddy-backend/database"
	"studybuddy-backend/handlers"
	"studybuddy-backend/middleware"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load env files (try multiple locations; later files override earlier)
	godotenv.Load("../.env")
	godotenv.Load("../.env.local")
	godotenv.Load(".env")
	godotenv.Load(".env.local")

	cfg := config.Load()

	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	sqlDB, err := db.DB()
	if err == nil {
		defer sqlDB.Close()
	}

	// Initialize handlers
	authHandler := &handlers.AuthHandler{
		DB:        db,
		JWTSecret: cfg.JWTSecret,
	}
	spaceHandler := &handlers.SpaceHandler{DB: db}
	materialHandler := &handlers.MaterialHandler{DB: db}
	questionHandler := &handlers.QuestionHandler{DB: db}
	adaptiveHandler := &handlers.AdaptiveHandler{DB: db}
	ragHandler := &handlers.RagHandler{}

	r := gin.Default()

	// CORS configuration
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", "*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowHeaders:     []string{"Authorization", "Content-Type", "X-Requested-With"},
		AllowCredentials: true,
	}))

	api := r.Group("/api")
	{
		// Auth routes (no JWT required)
		auth := api.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
		}

		// Protected routes (JWT required)
		protected := api.Group("/")
		protected.Use(middleware.Auth(cfg.JWTSecret))
		{
			// Spaces
			protected.GET("/spaces", spaceHandler.GetSpaces)
			protected.POST("/spaces", spaceHandler.CreateSpace)
			protected.GET("/spaces/:id", spaceHandler.GetSpace)
			protected.DELETE("/spaces/:id", spaceHandler.DeleteSpace)

			// Materials under spaces
			protected.POST("/spaces/:id/materials", materialHandler.UploadMaterial)
			protected.GET("/spaces/:id/materials", materialHandler.GetMaterials)

			// Materials standalone
			protected.GET("/materials/:id", materialHandler.GetMaterial)
			protected.DELETE("/materials/:id", materialHandler.DeleteMaterial)
			protected.POST("/materials/:id/process", materialHandler.ProcessMaterial)

			// Questions
			protected.POST("/questions/:id/answer", questionHandler.AnswerQuestion)

			// Adaptive learning
			protected.GET("/adaptive", adaptiveHandler.GetAdaptive)
			protected.POST("/adaptive", adaptiveHandler.PostAdaptive)

			// RAG document ingest
			protected.POST("/rag/ingest", ragHandler.IngestRAG)
		}
	}

	log.Printf("StudyBuddy Go backend starting on :%s", cfg.Port)
	log.Printf("Database: %s", cfg.DatabaseURL)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
