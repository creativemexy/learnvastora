import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = (session.user as any).id;

    // Get unread messages where user is the recipient
    const unreadMessages = await prisma.message.findMany({
      where: {
        booking: {
          OR: [
            { studentId: userId },
            { tutorId: userId }
          ]
        },
        senderId: { not: userId }, // Not sent by the current user
      },
      include: {
        sender: {
          select: {
            name: true,
          },
        },
        booking: {
          select: {
            id: true,
            scheduledAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10, // Limit to recent messages
    });

    return NextResponse.json(unreadMessages);
  } catch (error) {
    console.error("Error fetching unread messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch unread messages" },
      { status: 500 }
    );
  }
} 