import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adaptiveAgent } from "@/agents/adaptiveAgent";

export async function POST(request: Request) {
  const body = await request.json();
  const { materialId } = body;

  if (!materialId) {
    return NextResponse.json({ error: "materialId가 필요합니다." }, { status: 400 });
  }

  const material = await prisma.material.findUnique({ where: { id: materialId } });
  if (!material) {
    return NextResponse.json({ error: "자료를 찾을 수 없습니다." }, { status: 404 });
  }

  // Find topics where the user got wrong answers
  const wrongAnswers = await prisma.answerHistory.findMany({
    where: { isCorrect: false, question: { materialId } },
    include: { question: { select: { topic: true } } },
    orderBy: { answeredAt: "desc" },
    take: 20,
  });

  const weakTopics = [...new Set(wrongAnswers.map((a) => a.question.topic))];

  if (weakTopics.length === 0) {
    return NextResponse.json({
      message: "아직 틀린 문제가 없습니다. 더 많은 문제를 풀어보세요!",
      questions: [],
    });
  }

  const newQuestions = await adaptiveAgent(weakTopics, material.content);

  // Save adaptive questions to DB
  if (newQuestions.length > 0) {
    await prisma.question.createMany({
      data: newQuestions.map((q) => ({
        materialId,
        type: q.type,
        question: q.question,
        options: q.options ? JSON.stringify(q.options) : null,
        answer: q.answer,
        explanation: q.explanation,
        topic: q.topic,
      })),
    });
  }

  return NextResponse.json({
    weakTopics,
    questions: newQuestions,
    message: `${weakTopics.join(", ")} 주제의 보충 문제 ${newQuestions.length}개를 생성했습니다.`,
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const materialId = searchParams.get("materialId");

  if (!materialId) {
    return NextResponse.json({ error: "materialId가 필요합니다." }, { status: 400 });
  }

  // Return questions prioritized by wrong answer count
  const questions = await prisma.question.findMany({
    where: { materialId },
    include: {
      _count: { select: { answerHistory: true } },
      answerHistory: { select: { isCorrect: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const prioritized = questions.sort((a, b) => {
    const aWrong = a.answerHistory.filter((h) => !h.isCorrect).length;
    const bWrong = b.answerHistory.filter((h) => !h.isCorrect).length;
    return bWrong - aWrong;
  });

  return NextResponse.json(prioritized);
}
