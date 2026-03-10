import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function keyPointsAgent(content: string): Promise<string[]> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `다음 학습 자료에서 시험에 꼭 나올 핵심 암기 포인트를 추출해주세요.
반드시 JSON 배열 형식으로 응답해주세요. 각 항목은 짧고 명확한 한 문장으로 작성하세요.
예: ["개념1에 대한 설명", "개념2에 대한 설명", ...]
다른 텍스트 없이 JSON 배열만 반환해주세요.

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
