import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface GeneratedQuestion {
  type: "multiple_choice" | "short_answer";
  question: string;
  options?: string[];
  answer: string;
  explanation: string;
  topic: string;
}

export async function questionAgent(
  content: string
): Promise<GeneratedQuestion[]> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `다음 학습 자료를 바탕으로 연습 문제 10개를 만들어주세요.
- 4지선다형(multiple_choice) 7개, 단답형(short_answer) 3개를 만들어주세요.
- 실제 시험처럼 어렵고 의미있는 문제를 만들어주세요.
- 반드시 다음 JSON 형식으로만 응답해주세요. 다른 텍스트는 포함하지 마세요.

[
  {
    "type": "multiple_choice",
    "question": "문제 내용",
    "options": ["1번 보기", "2번 보기", "3번 보기", "4번 보기"],
    "answer": "정답 번호 또는 내용",
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
