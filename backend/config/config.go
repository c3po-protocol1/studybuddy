package config

import (
	"os"
	"strings"
)

type Config struct {
	DatabasePath    string
	JWTSecret       string
	AnthropicAPIKey string
	Port            string
}

func Load() *Config {
	dbURL := os.Getenv("DATABASE_URL")
	dbPath := ""
	if dbURL != "" {
		// Strip "file:" prefix if present
		dbPath = strings.TrimPrefix(dbURL, "file:")
	}
	if dbPath == "" {
		dbPath = "../prisma/dev.db"
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	jwtSecret := os.Getenv("AUTH_SECRET")
	if jwtSecret == "" {
		jwtSecret = os.Getenv("JWT_SECRET")
	}

	return &Config{
		DatabasePath:    dbPath,
		JWTSecret:       jwtSecret,
		AnthropicAPIKey: os.Getenv("ANTHROPIC_API_KEY"),
		Port:            port,
	}
}
