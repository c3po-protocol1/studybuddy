package agents

import (
	"fmt"
	"regexp"
	"strings"
)

// GenerateKeyPoints calls Claude to generate a JSON array of key points from content.
func GenerateKeyPoints(content string) (string, error) {
	prompt := fmt.Sprintf(`다음 학습 자료에서 핵심 암기 포인트를 추출해주세요.

반드시 JSON 배열 형식으로만 응답해주세요. 다른 텍스트는 포함하지 마세요.
각 항목은 간결하고 명확한 문장으로 작성해주세요.
최소 5개, 최대 15개의 핵심 포인트를 추출해주세요.

예시 형식:
["핵심 포인트 1", "핵심 포인트 2", "핵심 포인트 3"]

학습 자료:
%s`, content)

	response, err := CallClaude(prompt, 1024)
	if err != nil {
		return "", err
	}

	// Extract JSON array from response using regexp
	jsonArray := extractJSONArray(response)
	if jsonArray == "" {
		return "[]", nil
	}
	return jsonArray, nil
}

// extractJSONArray finds and returns the first JSON array [...] in the text.
func extractJSONArray(text string) string {
	// Try to find a JSON array pattern
	re := regexp.MustCompile(`(?s)\[.*?\]`)
	// Find the outermost array by looking for [ and ]
	start := strings.Index(text, "[")
	if start == -1 {
		return ""
	}

	// Find matching closing bracket
	depth := 0
	for i := start; i < len(text); i++ {
		if text[i] == '[' {
			depth++
		} else if text[i] == ']' {
			depth--
			if depth == 0 {
				return text[start : i+1]
			}
		}
	}

	// Fallback to simple regex
	match := re.FindString(text)
	return match
}
