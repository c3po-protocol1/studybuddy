package database

import (
	"database/sql"
	"log"

	_ "modernc.org/sqlite"
)

func Connect(dbPath string) (*sql.DB, error) {
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, err
	}

	if err := db.Ping(); err != nil {
		return nil, err
	}

	// Enable WAL mode for better concurrency
	if _, err := db.Exec("PRAGMA journal_mode=WAL"); err != nil {
		log.Printf("Warning: could not set WAL mode: %v", err)
	}
	if _, err := db.Exec("PRAGMA foreign_keys=ON"); err != nil {
		log.Printf("Warning: could not enable foreign keys: %v", err)
	}

	if err := createTables(db); err != nil {
		return nil, err
	}

	return db, nil
}

func createTables(db *sql.DB) error {
	stmts := []string{
		`CREATE TABLE IF NOT EXISTS "User" (
			"id" TEXT NOT NULL PRIMARY KEY,
			"email" TEXT NOT NULL UNIQUE,
			"password" TEXT NOT NULL,
			"name" TEXT,
			"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS "Space" (
			"id" TEXT NOT NULL PRIMARY KEY,
			"name" TEXT NOT NULL,
			"emoji" TEXT NOT NULL DEFAULT '📚',
			"color" TEXT NOT NULL DEFAULT '#6366f1',
			"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS "Material" (
			"id" TEXT NOT NULL PRIMARY KEY,
			"spaceId" TEXT NOT NULL REFERENCES "Space"("id") ON DELETE CASCADE,
			"filename" TEXT NOT NULL,
			"content" TEXT NOT NULL,
			"status" TEXT NOT NULL DEFAULT 'pending',
			"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS "Summary" (
			"id" TEXT NOT NULL PRIMARY KEY,
			"materialId" TEXT NOT NULL UNIQUE REFERENCES "Material"("id") ON DELETE CASCADE,
			"content" TEXT NOT NULL,
			"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS "KeyPoints" (
			"id" TEXT NOT NULL PRIMARY KEY,
			"materialId" TEXT NOT NULL UNIQUE REFERENCES "Material"("id") ON DELETE CASCADE,
			"points" TEXT NOT NULL,
			"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS "Question" (
			"id" TEXT NOT NULL PRIMARY KEY,
			"materialId" TEXT NOT NULL REFERENCES "Material"("id") ON DELETE CASCADE,
			"type" TEXT NOT NULL,
			"question" TEXT NOT NULL,
			"options" TEXT,
			"answer" TEXT NOT NULL,
			"explanation" TEXT NOT NULL,
			"topic" TEXT NOT NULL,
			"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS "AnswerHistory" (
			"id" TEXT NOT NULL PRIMARY KEY,
			"questionId" TEXT NOT NULL REFERENCES "Question"("id") ON DELETE CASCADE,
			"isCorrect" INTEGER NOT NULL,
			"userAnswer" TEXT NOT NULL,
			"answeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`,
	}

	for _, stmt := range stmts {
		if _, err := db.Exec(stmt); err != nil {
			return err
		}
	}
	return nil
}
