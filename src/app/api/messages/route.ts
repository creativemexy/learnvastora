import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const bookingId = searchParams.get('bookingId');

    if (!bookingId) {
      return NextResponse.json({ error: "Booking ID required" }, { status: 400 });
    }

    // Get messages for the booking
    const messages = await prisma.message.findMany({
      where: { bookingId },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: "asc" }
    });

    return NextResponse.json(messages);

  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { bookingId, content } = await req.json();

    if (!bookingId || !content) {
      return NextResponse.json({ error: "Booking ID and content required" }, { status: 400 });
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        bookingId,
        senderId: (session.user as any).id,
        content
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json(message);

  } catch (error) {
    console.error("Error creating message:", error);
    return NextResponse.json({ error: "Failed to create message" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { bookingId } = await req.json();

    if (!bookingId) {
      return NextResponse.json({ error: "Booking ID required" }, { status: 400 });
    }

    // Mark all messages in the booking as read for the current user
    await prisma.message.updateMany({
      where: {
        bookingId,
        senderId: { not: (session.user as any).id } // Only mark messages from others as read
      },
      data: {
        // Note: We don't have an isRead field in the Message model yet
        // This would require adding that field to the schema
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Error marking messages as read:", error);
    return NextResponse.json({ error: "Failed to mark messages as read" }, { status: 500 });
  }
} 