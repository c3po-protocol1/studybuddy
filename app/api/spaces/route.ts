import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const spaces = await prisma.space.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { materials: true } } },
  });
  return NextResponse.json(spaces);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, emoji, color } = body;
  if (!name?.trim()) {
    return NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 });
  }
  const space = await prisma.space.create({
    data: { name: name.trim(), emoji: emoji ?? "📚", color: color ?? "#6366f1" },
  });
  return NextResponse.json(space, { status: 201 });
}
