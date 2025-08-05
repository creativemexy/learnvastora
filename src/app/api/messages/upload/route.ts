import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getServerSession } from "next-auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const maxSize = 10 * 1024 * 1024; // 10MB
const allowedTypes = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "video/mp4", "video/webm", "video/quicktime"
];

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any).id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const senderId = (session.user as any).id;
  const { bookingId, content } = await req.json();
  if (!bookingId || !content) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const message = await prisma.message.create({
    data: {
      bookingId,
      senderId,
      content,
    },
  });
  return NextResponse.json(message);
} 