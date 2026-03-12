package config

import "os"

type Config struct {
	DatabaseURL string
	JWTSecret   string
	Port        string
	// Claude API
	AnthropicAPIKey string
	ClaudeModel     string
}

func Load() *Config {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://studybuddy:studybuddy@localhost:5432/studybuddy?sslmode=disable"
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	jwtSecret := os.Getenv("AUTH_SECRET")
	if jwtSecret == "" {
		jwtSecret = os.Getenv("JWT_SECRET")
	}

	claudeModel := os.Getenv("CLAUDE_MODEL")
	if claudeModel == "" {
		claudeModel = "claude-sonnet-4-6"
	}

	return &Config{
		DatabaseURL:     dbURL,
		JWTSecret:       jwtSecret,
		AnthropicAPIKey: os.Getenv("ANTHROPIC_API_KEY"),
		ClaudeModel:     claudeModel,
		Port:            port,
	}
}
