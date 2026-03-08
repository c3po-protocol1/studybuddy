import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function summaryAgent(content: string): Promise<string> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `다음 학습 자료를 한국어로 명확하고 구조화된 요약문으로 작성해주세요.
핵심 개념과 중요한 내용을 포함하되, 학생이 이해하기 쉽게 정리해주세요.
마크다운 형식으로 작성해주세요 (제목, 단락 구분 등 활용).

학습 자료:
${content}`,
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  return textBlock?.text ?? "";
}
