package database

import (
	"log"

	"studybuddy-backend/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func Connect(dsn string) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		return nil, err
	}

	if err := db.AutoMigrate(
		&models.User{},
		&models.Space{},
		&models.Material{},
		&models.Summary{},
		&models.KeyPoints{},
		&models.Question{},
		&models.AnswerHistory{},
	); err != nil {
		log.Printf("Warning: AutoMigrate error: %v", err)
	}

	return db, nil
}
