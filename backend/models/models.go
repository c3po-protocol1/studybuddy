package models

import "time"

// User represents a user account
type User struct {
	ID        string    `json:"id" gorm:"primaryKey;column:id"`
	Email     string    `json:"email" gorm:"column:email;uniqueIndex;not null"`
	Password  string    `json:"-" gorm:"column:password;not null"`
	Name      *string   `json:"name" gorm:"column:name"`
	CreatedAt time.Time `json:"createdAt" gorm:"column:createdAt;default:now()"`
}

func (User) TableName() string { return "User" }

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
	ID        string         `json:"id" gorm:"primaryKey;column:id"`
	Name      string         `json:"name" gorm:"column:name;not null"`
	Emoji     string         `json:"emoji" gorm:"column:emoji;not null;default:'📚'"`
	Color     string         `json:"color" gorm:"column:color;not null;default:'#6366f1'"`
	CreatedAt time.Time      `json:"createdAt" gorm:"column:createdAt;default:now()"`
	Count     *MaterialCount `json:"_count,omitempty" gorm:"-"`
	Materials []Material     `json:"materials,omitempty" gorm:"-"`
}

func (Space) TableName() string { return "Space" }

// Summary represents an AI-generated summary
type Summary struct {
	ID         string    `json:"id" gorm:"primaryKey;column:id"`
	MaterialID string    `json:"materialId" gorm:"column:materialId;uniqueIndex;not null"`
	Content    string    `json:"content" gorm:"column:content;not null"`
	CreatedAt  time.Time `json:"createdAt" gorm:"column:createdAt;default:now()"`
}

func (Summary) TableName() string { return "Summary" }

// KeyPoints represents AI-generated key points
type KeyPoints struct {
	ID         string    `json:"id" gorm:"primaryKey;column:id"`
	MaterialID string    `json:"materialId" gorm:"column:materialId;uniqueIndex;not null"`
	Points     string    `json:"points" gorm:"column:points;not null"`
	CreatedAt  time.Time `json:"createdAt" gorm:"column:createdAt;default:now()"`
}

func (KeyPoints) TableName() string { return "KeyPoints" }

// Material represents an uploaded study material
type Material struct {
	ID        string         `json:"id" gorm:"primaryKey;column:id"`
	SpaceID   string         `json:"spaceId" gorm:"column:spaceId;not null"`
	Filename  string         `json:"filename" gorm:"column:filename;not null"`
	Content   string         `json:"content,omitempty" gorm:"column:content;not null"`
	Status    string         `json:"status" gorm:"column:status;not null;default:'pending'"`
	CreatedAt time.Time      `json:"createdAt" gorm:"column:createdAt;default:now()"`
	Summary   *Summary       `json:"summary,omitempty" gorm:"-"`
	KeyPoints *KeyPoints     `json:"keyPoints,omitempty" gorm:"-"`
	Count     *QuestionCount `json:"_count,omitempty" gorm:"-"`
	Questions []Question     `json:"questions,omitempty" gorm:"-"`
}

func (Material) TableName() string { return "Material" }

// Question represents a practice question
type Question struct {
	ID           string          `json:"id" gorm:"primaryKey;column:id"`
	MaterialID   string          `json:"materialId" gorm:"column:materialId;not null"`
	Type         string          `json:"type" gorm:"column:type;not null"`
	QuestionText string          `json:"question" gorm:"column:question;not null"`
	Options      *string         `json:"options" gorm:"column:options"`
	Answer       string          `json:"answer" gorm:"column:answer;not null"`
	Explanation  string          `json:"explanation" gorm:"column:explanation;not null"`
	Topic        string          `json:"topic" gorm:"column:topic;not null"`
	CreatedAt    time.Time       `json:"createdAt" gorm:"column:createdAt;default:now()"`
	History      []AnswerHistory `json:"answerHistory,omitempty" gorm:"-"`
}

func (Question) TableName() string { return "Question" }

// AnswerHistory records each answer attempt
type AnswerHistory struct {
	ID         string    `json:"id" gorm:"primaryKey;column:id"`
	QuestionID string    `json:"questionId" gorm:"column:questionId;not null"`
	IsCorrect  bool      `json:"isCorrect" gorm:"column:isCorrect;not null"`
	UserAnswer string    `json:"userAnswer" gorm:"column:userAnswer;not null"`
	AnsweredAt time.Time `json:"answeredAt" gorm:"column:answeredAt;default:now()"`
}

func (AnswerHistory) TableName() string { return "AnswerHistory" }

// UserSettings stores per-user AI configuration
type UserSettings struct {
	UserID          string    `json:"userId" gorm:"primaryKey;column:userId"`
	AnthropicAPIKey string    `json:"anthropicApiKey" gorm:"column:anthropicApiKey;not null;default:''"`
	LLMModel        string    `json:"llmModel" gorm:"column:llmModel;not null;default:'claude-3-5-haiku-20241022'"`
	UpdatedAt       time.Time `json:"updatedAt" gorm:"column:updatedAt;autoUpdateTime"`
}

func (UserSettings) TableName() string { return "UserSettings" }
