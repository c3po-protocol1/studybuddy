import Anthropic from "@anthropic-ai/sdk";
import type { GeneratedQuestion } from "./questionAgent";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function adaptiveAgent(
  weakTopics: string[],
  content: string
): Promise<GeneratedQuestion[]> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `학생이 다음 주제에서 반복적으로 틀리고 있습니다: ${weakTopics.join(", ")}

아래 학습 자료를 참고하여, 해당 약점 주제에 집중된 연습 문제 5개를 추가로 만들어주세요.
더 쉬운 개념부터 단계적으로 이해할 수 있도록 구성하세요.
반드시 JSON 배열 형식으로만 응답해주세요.

[
  {
    "type": "multiple_choice" 또는 "short_answer",
    "question": "문제 내용",
    "options": ["보기1", "보기2", "보기3", "보기4"],
    "answer": "정답",
    "explanation": "해설",
    "topic": "관련 주제"
  }
]

학습 자료:
${content}`,
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  const raw = textBlock?.text ?? "[]";
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  try {
    return JSON.parse(jsonMatch?.[0] ?? "[]");
  } catch {
    return [];
  }
}
