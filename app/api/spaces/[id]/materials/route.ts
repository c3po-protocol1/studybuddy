import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (buffer: Buffer) => Promise<{ text: string }>;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: spaceId } = await params;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let content = "";

  if (file.name.endsWith(".pdf")) {
    const parsed = await pdfParse(buffer);
    content = parsed.text;
  } else {
    content = buffer.toString("utf-8");
  }

  if (!content.trim()) {
    return NextResponse.json({ error: "파일 내용을 읽을 수 없습니다." }, { status: 400 });
  }

  const material = await prisma.material.create({
    data: {
      spaceId,
      filename: file.name,
      content: content.slice(0, 50000), // limit content size
      status: "pending",
    },
  });

  return NextResponse.json(material, { status: 201 });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: spaceId } = await params;
  const materials = await prisma.material.findMany({
    where: { spaceId },
    orderBy: { createdAt: "desc" },
    include: { summary: true, keyPoints: true, _count: { select: { questions: true } } },
  });
  return NextResponse.json(materials);
}
