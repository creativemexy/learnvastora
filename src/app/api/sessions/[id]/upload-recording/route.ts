import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getServerSession } from "next-auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const maxSize = 200 * 1024 * 1024; // 200MB
const allowedTypes = ["video/webm", "video/mp4"];

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any).id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id;
  const sessionId = params.id;

  // Parse multipart form data
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.startsWith("multipart/form-data")) {
    return NextResponse.json({ error: "Invalid content type" }, { status: 400 });
  }
  const formData = await req.formData();
  const file = formData.get("recording") as File | null;
  if (!file) {
    return NextResponse.json({ error: "Missing recording file" }, { status: 400 });
  }
  if (file.size > maxSize) {
    return NextResponse.json({ error: "File too large (max 200MB)" }, { status: 413 });
  }
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "File type not allowed" }, { status: 415 });
  }

  // Save file to public/recordings
  const recordingsDir = path.join(process.cwd(), "public", "recordings");
  await mkdir(recordingsDir, { recursive: true });
  const ext = file.type === "video/mp4" ? ".mp4" : ".webm";
  const fileName = `session_${sessionId}_${Date.now()}${ext}`;
  const filePath = path.join(recordingsDir, fileName);
  const arrayBuffer = await file.arrayBuffer();
  await writeFile(filePath, Buffer.from(arrayBuffer));
  const fileUrl = `/recordings/${fileName}`;

  // Store reference in DB (SessionRecording model)
  // If model does not exist, you will need to add it to schema.prisma
  try {
    const recording = await prisma.sessionRecording.create({
      data: {
        sessionId,
        userId,
        url: fileUrl,
        fileName,
      },
    });
    return NextResponse.json(recording);
  } catch (e) {
    // If model does not exist, return fileUrl only
    return NextResponse.json({ url: fileUrl });
  }
} 