import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const space = await prisma.space.findUnique({
    where: { id },
    include: {
      materials: {
        orderBy: { createdAt: "desc" },
        include: { summary: true, keyPoints: true, _count: { select: { questions: true } } },
      },
    },
  });
  if (!space) return NextResponse.json({ error: "스터디 공간을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json(space);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.space.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
