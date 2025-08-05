import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || (session.user as any).role !== "TUTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tutorId = (session.user as any).id;
  try {
    const { startTime, endTime, type, date, dayOfWeek, isRecurring } = await req.json();
    const slot = await prisma.slot.update({
      where: { 
        id: params.id, 
        tutorId: tutorId 
      },
      data: {
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
        ...(type && { type }),
        ...(date && { date: new Date(date) }),
        ...(typeof dayOfWeek !== 'undefined' && { dayOfWeek }),
        ...(typeof isRecurring !== 'undefined' && { isRecurring }),
      },
    });
    return NextResponse.json(slot);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update slot" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || (session.user as any).role !== "TUTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tutorId = (session.user as any).id;
  try {
    await prisma.slot.delete({ where: { id: params.id, tutorId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete slot" }, { status: 500 });
  }
} 