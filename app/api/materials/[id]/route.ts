import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const material = await prisma.material.findUnique({
    where: { id },
    include: {
      summary: true,
      keyPoints: true,
      questions: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!material) {
    return NextResponse.json({ error: "자료를 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json(material);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.material.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
