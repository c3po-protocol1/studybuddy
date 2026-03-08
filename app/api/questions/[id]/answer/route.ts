import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: questionId } = await params;
  const body = await request.json();
  const { userAnswer } = body;

  if (!userAnswer?.trim()) {
    return NextResponse.json({ error: "답변을 입력해주세요." }, { status: 400 });
  }

  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!question) {
    return NextResponse.json({ error: "문제를 찾을 수 없습니다." }, { status: 404 });
  }

  const isCorrect =
    question.answer.trim().toLowerCase() === userAnswer.trim().toLowerCase();

  const history = await prisma.answerHistory.create({
    data: { questionId, isCorrect, userAnswer: userAnswer.trim() },
  });

  return NextResponse.json({
    isCorrect,
    correctAnswer: question.answer,
    explanation: question.explanation,
    historyId: history.id,
  });
}
