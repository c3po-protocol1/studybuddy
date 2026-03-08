import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { summaryAgent } from "@/agents/summaryAgent";
import { keyPointsAgent } from "@/agents/keyPointsAgent";
import { questionAgent } from "@/agents/questionAgent";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: materialId } = await params;

  const material = await prisma.material.findUnique({ where: { id: materialId } });
  if (!material) {
    return NextResponse.json({ error: "자료를 찾을 수 없습니다." }, { status: 404 });
  }

  // Update status to processing
  await prisma.material.update({ where: { id: materialId }, data: { status: "processing" } });

  try {
    // Run all agents in parallel
    const [summaryText, keyPointsArray, questionsArray] = await Promise.all([
      summaryAgent(material.content),
      keyPointsAgent(material.content),
      questionAgent(material.content),
    ]);

    // Save results
    await prisma.$transaction([
      prisma.summary.upsert({
        where: { materialId },
        create: { materialId, content: summaryText },
        update: { content: summaryText },
      }),
      prisma.keyPoints.upsert({
        where: { materialId },
        create: { materialId, points: JSON.stringify(keyPointsArray) },
        update: { points: JSON.stringify(keyPointsArray) },
      }),
    ]);

    // Delete old questions and insert new ones
    await prisma.question.deleteMany({ where: { materialId } });
    if (questionsArray.length > 0) {
      await prisma.question.createMany({
        data: questionsArray.map((q) => ({
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

    await prisma.material.update({ where: { id: materialId }, data: { status: "done" } });
    return NextResponse.json({ success: true, status: "done" });
  } catch (error) {
    await prisma.material.update({ where: { id: materialId }, data: { status: "error" } });
    console.error("Processing error:", error);
    return NextResponse.json({ error: "AI 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
