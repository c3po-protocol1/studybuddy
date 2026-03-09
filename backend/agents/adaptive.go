package agents

import (
	"encoding/json"
	"fmt"
	"strings"
)

// GenerateAdaptiveQuestions calls Claude to generate questions targeting weak topics.
func GenerateAdaptiveQuestions(content string, weakTopics []string) ([]QuestionData, error) {
	topicsStr := strings.Join(weakTopics, ", ")

	prompt := fmt.Sprintf(`학생이 다음 주제에서 어려움을 겪고 있습니다: %s

학습 자료를 참고하여 이 약점 주제들을 집중적으로 다루는 보충 문제 5개를 생성해주세요.

반드시 다음 JSON 배열 형식으로만 응답해주세요. 다른 텍스트는 포함하지 마세요:
[
  {
    "type": "multiple_choice",
    "question": "문제 내용",
    "options": ["선택지1", "선택지2", "선택지3", "선택지4"],
    "answer": "정답 선택지 번호 (1, 2, 3, 또는 4)",
    "explanation": "해설",
    "topic": "관련 주제"
  }
]

객관식과 단답형을 혼합하여 5개의 문제를 만들어주세요.

학습 자료:
%s`, topicsStr, content)

	response, err := CallClaude(prompt, 1024)
	if err != nil {
		return nil, err
	}

	jsonStr := extractJSONArray(response)
	if jsonStr == "" {
		return nil, fmt.Errorf("no JSON array found in response")
	}

	var questions []QuestionData
	if err := json.Unmarshal([]byte(jsonStr), &questions); err != nil {
		return nil, fmt.Errorf("failed to parse adaptive questions JSON: %w", err)
	}

	return questions, nil
}
