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
    const userId = (session.user as any).id;

    // Get user's bookings with tutors and messages
    const bookings = await prisma.booking.findMany({
      where: { studentId: userId },
      include: {
        tutor: {
          select: {
            name: true,
            email: true,
            photo: true,
            isOnline: true,
            lastSeen: true
          }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { scheduledAt: 'desc' }
    });

    // Group bookings by tutor to avoid multiple conversations with same tutor
    const tutorConversations = new Map();

    bookings.forEach(booking => {
      const tutorId = booking.tutor.email; // Use email as unique identifier
      
      if (!tutorConversations.has(tutorId)) {
        // Only create conversation if there are messages
        if (booking.messages.length > 0) {
          const lastMessage = booking.messages[0];
          const unreadCount = booking.messages.filter(m => 
            m.senderId !== userId
          ).length;

          tutorConversations.set(tutorId, {
            id: booking.id,
            bookingId: booking.id,
            tutorName: booking.tutor.name,
            tutorAvatar: booking.tutor.photo || null,
            lastMessage: lastMessage.content,
            lastMessageTime: lastMessage.createdAt,
            unreadCount,
            isOnline: booking.tutor.isOnline || false,
            lastSeen: booking.tutor.lastSeen?.toISOString() || new Date().toISOString(),
            booking: {
              scheduledAt: booking.scheduledAt,
              status: booking.status,
              topic: `Session with ${booking.tutor.name}`
            }
          });
        }
      } else {
        // If tutor already has a conversation, update with latest message if this booking has newer messages
        const existingConversation = tutorConversations.get(tutorId);
        const lastMessage = booking.messages[0];
        
        if (lastMessage && new Date(lastMessage.createdAt) > new Date(existingConversation.lastMessageTime)) {
          const unreadCount = booking.messages.filter(m => 
            m.senderId !== userId
          ).length;
          
          tutorConversations.set(tutorId, {
            ...existingConversation,
            id: booking.id,
            bookingId: booking.id,
            lastMessage: lastMessage.content,
            lastMessageTime: lastMessage.createdAt,
            unreadCount: existingConversation.unreadCount + unreadCount
          });
        }
      }
    });

    // Convert map to array and sort by latest message time
    const conversations = Array.from(tutorConversations.values())
      .sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());

    return NextResponse.json(conversations);

  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
  }
} 