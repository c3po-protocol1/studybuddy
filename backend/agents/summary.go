package agents

import "fmt"

// GenerateSummary calls Claude to generate a markdown summary of the content.
func GenerateSummary(content string) (string, error) {
	prompt := fmt.Sprintf(`다음 학습 자료를 읽고 핵심 내용을 한국어로 마크다운 형식의 요약으로 작성해주세요.

요약은 다음 구조를 따라주세요:
- 제목 (## 형식)
- 주요 개념 설명
- 중요 사항 목록 (- 형식)
- 결론

학습 자료:
%s`, content)

	return CallClaude(prompt, 1024)
}
