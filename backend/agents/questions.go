package agents

import (
	"encoding/json"
	"fmt"
)

// QuestionData represents a generated question
type QuestionData struct {
	Type        string   `json:"type"`
	Question    string   `json:"question"`
	Options     []string `json:"options,omitempty"`
	Answer      string   `json:"answer"`
	Explanation string   `json:"explanation"`
	Topic       string   `json:"topic"`
}

// GenerateQuestions calls Claude to generate practice questions from content.
// Returns 7 multiple_choice and 3 short_answer questions.
func GenerateQuestions(content string) ([]QuestionData, error) {
	prompt := fmt.Sprintf(`다음 학습 자료를 바탕으로 연습 문제를 생성해주세요.

다음 요구사항을 반드시 지켜주세요:
1. 객관식(multiple_choice) 문제 7개 - 각 문제에 4개의 선택지 포함
2. 단답형(short_answer) 문제 3개
3. 총 10개의 문제

반드시 다음 JSON 배열 형식으로만 응답해주세요. 다른 텍스트는 포함하지 마세요:
[
  {
    "type": "multiple_choice",
    "question": "문제 내용",
    "options": ["선택지1", "선택지2", "선택지3", "선택지4"],
    "answer": "정답 선택지 번호 (1, 2, 3, 또는 4)",
    "explanation": "해설",
    "topic": "관련 주제"
  },
  {
    "type": "short_answer",
    "question": "문제 내용",
    "answer": "정답",
    "explanation": "해설",
    "topic": "관련 주제"
  }
]

학습 자료:
%s`, content)

	response, err := CallClaude(prompt, 2048)
	if err != nil {
		return nil, err
	}

	jsonStr := extractJSONArray(response)
	if jsonStr == "" {
		return nil, fmt.Errorf("no JSON array found in response")
	}

	var questions []QuestionData
	if err := json.Unmarshal([]byte(jsonStr), &questions); err != nil {
		return nil, fmt.Errorf("failed to parse questions JSON: %w", err)
	}

	return questions, nil
}
