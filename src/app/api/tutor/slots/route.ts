import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || (session.user as any).role !== "TUTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tutorId = (session.user as any).id;
  try {
    const slots = await prisma.slot.findMany({
      where: { tutorId },
      orderBy: [{ isRecurring: "desc" }, { date: "asc" }, { dayOfWeek: "asc" }, { startTime: "asc" }],
    });
    return NextResponse.json(slots, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      }
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch slots" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || (session.user as any).role !== "TUTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tutorId = (session.user as any).id;
  try {
    const { date, dayOfWeek, startTime, endTime, type, isRecurring } = await req.json();
    if (!startTime || !endTime || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const slot = await prisma.slot.create({
      data: {
        tutorId,
        date: date ? new Date(date) : undefined,
        dayOfWeek: isRecurring ? dayOfWeek : undefined,
        startTime,
        endTime,
        type,
        isRecurring: !!isRecurring,
      },
    });
    return NextResponse.json(slot);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create slot" }, { status: 500 });
  }
} 