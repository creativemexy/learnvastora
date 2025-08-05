import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sessionId = params.id;

    // Get recordings for the session
    const recordings = await prisma.sessionRecording.findMany({
      where: { sessionId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(recordings);

  } catch (error) {
    console.error("Error fetching recordings:", error);
    return NextResponse.json({ error: "Failed to fetch recordings" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sessionId = params.id;
    const { url, fileName } = await req.json();

    if (!url || !fileName) {
      return NextResponse.json({ error: "URL and filename required" }, { status: 400 });
    }

    // Create recording entry
    const recording = await prisma.sessionRecording.create({
      data: {
        sessionId,
        userId: (session.user as any).id,
        url,
        fileName
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json(recording);

  } catch (error) {
    console.error("Error creating recording:", error);
    return NextResponse.json({ error: "Failed to create recording" }, { status: 500 });
  }
} 