package models

import "time"

// User represents a user account
type User struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Password  string    `json:"-"`
	Name      *string   `json:"name"`
	CreatedAt time.Time `json:"createdAt"`
}

// MaterialCount holds the count of related entities
type MaterialCount struct {
	Materials int `json:"materials"`
}

// QuestionCount holds the count of questions
type QuestionCount struct {
	Questions int `json:"questions"`
}

// Space represents a study space
type Space struct {
	ID        string        `json:"id"`
	Name      string        `json:"name"`
	Emoji     string        `json:"emoji"`
	Color     string        `json:"color"`
	CreatedAt time.Time     `json:"createdAt"`
	Count     *MaterialCount `json:"_count,omitempty"`
	Materials []Material    `json:"materials,omitempty"`
}

// Summary represents an AI-generated summary
type Summary struct {
	ID         string    `json:"id"`
	MaterialID string    `json:"materialId"`
	Content    string    `json:"content"`
	CreatedAt  time.Time `json:"createdAt"`
}

// KeyPoints represents AI-generated key points
type KeyPoints struct {
	ID         string    `json:"id"`
	MaterialID string    `json:"materialId"`
	Points     string    `json:"points"`
	CreatedAt  time.Time `json:"createdAt"`
}

// Material represents an uploaded study material
type Material struct {
	ID        string         `json:"id"`
	SpaceID   string         `json:"spaceId"`
	Filename  string         `json:"filename"`
	Content   string         `json:"content,omitempty"`
	Status    string         `json:"status"`
	CreatedAt time.Time      `json:"createdAt"`
	Summary   *Summary       `json:"summary,omitempty"`
	KeyPoints *KeyPoints     `json:"keyPoints,omitempty"`
	Count     *QuestionCount `json:"_count,omitempty"`
	Questions []Question     `json:"questions,omitempty"`
}

// Question represents a practice question
type Question struct {
	ID          string         `json:"id"`
	MaterialID  string         `json:"materialId"`
	Type        string         `json:"type"`
	QuestionText string        `json:"question"`
	Options     *string        `json:"options"`
	Answer      string         `json:"answer"`
	Explanation string         `json:"explanation"`
	Topic       string         `json:"topic"`
	CreatedAt   time.Time      `json:"createdAt"`
	History     []AnswerHistory `json:"answerHistory,omitempty"`
}

// AnswerHistory records each answer attempt
type AnswerHistory struct {
	ID         string    `json:"id"`
	QuestionID string    `json:"questionId"`
	IsCorrect  bool      `json:"isCorrect"`
	UserAnswer string    `json:"userAnswer"`
	AnsweredAt time.Time `json:"answeredAt"`
}
