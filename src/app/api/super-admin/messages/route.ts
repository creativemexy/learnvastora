import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a super admin
    if ((session.user as any).role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'conversations';
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    let data: any = {};

    switch (action) {
      case 'conversations':
        data = await getSuperAdminConversations(page, limit);
        break;
      case 'messages':
        if (!userId) {
          return NextResponse.json({ error: 'User ID required for messages' }, { status: 400 });
        }
        data = await getMessagesWithUser(userId, page, limit);
        break;
      case 'system_messages':
        data = await getSystemMessages(page, limit);
        break;
      default:
        data = await getSuperAdminConversations(page, limit);
    }

    return NextResponse.json({
      success: true,
      action,
      data
    });

  } catch (error) {
    console.error('Super Admin Messages API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a super admin
    if ((session.user as any).role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { action, ...data } = body;

    let result: any = {};

    switch (action) {
      case 'send_message':
        result = await sendMessageToUser(data);
        break;
      case 'send_system_message':
        result = await sendSystemMessage(data);
        break;
      case 'send_bulk_message':
        result = await sendBulkMessage(data);
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      action,
      result
    });

  } catch (error) {
    console.error('Super Admin Messages POST error:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}

async function getSuperAdminConversations(page: number, limit: number) {
  // Get all users with recent message activity
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { messagesSent: { some: {} } },
        { bookingsAsStudent: { some: { messages: { some: {} } } } },
        { bookingsAsTutor: { some: { messages: { some: {} } } } }
      ]
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      photo: true,
      isOnline: true,
      lastSeen: true,
      messagesSent: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          content: true,
          createdAt: true,
          bookingId: true
        }
      },
      _count: {
        select: {
          messagesSent: true
        }
      }
    },
    orderBy: { lastSeen: 'desc' },
    skip: (page - 1) * limit,
    take: limit
  });

  const conversations = users.map(user => ({
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    userRole: user.role,
    userPhoto: user.photo,
    isOnline: user.isOnline,
    lastSeen: user.lastSeen.toISOString(),
    lastMessage: user.messagesSent[0]?.content || 'No messages yet',
    lastMessageTime: user.messagesSent[0]?.createdAt.toISOString() || user.lastSeen.toISOString(),
    totalMessages: user._count.messagesSent
  }));

  return {
    conversations,
    pagination: {
      page,
      limit,
      total: await prisma.user.count({
        where: {
          OR: [
            { messagesSent: { some: {} } },
            { bookingsAsStudent: { some: { messages: { some: {} } } } },
            { bookingsAsTutor: { some: { messages: { some: {} } } } }
          ]
        }
      })
    }
  };
}

async function getMessagesWithUser(userId: string, page: number, limit: number) {
  // Get all messages between super admin and the user
  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: userId },
        { senderId: (await getSuperAdminId()) }
      ],
      booking: {
        OR: [
          { studentId: userId },
          { tutorId: userId }
        ]
      }
    },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          photo: true
        }
      },
      booking: {
        select: {
          id: true,
          scheduledAt: true,
          status: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit
  });

  return {
    messages: messages.reverse(), // Show oldest first
    pagination: {
      page,
      limit,
      total: await prisma.message.count({
        where: {
          OR: [
            { senderId: userId },
            { senderId: (await getSuperAdminId()) }
          ],
          booking: {
            OR: [
              { studentId: userId },
              { tutorId: userId }
            ]
          }
        }
      })
    }
  };
}

async function getSystemMessages(page: number, limit: number) {
  // Get system-wide messages sent by super admin
  const messages = await prisma.message.findMany({
    where: {
      sender: {
        role: 'SUPER_ADMIN'
      },
      content: {
        startsWith: '[SYSTEM]'
      }
    },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      },
      booking: {
        select: {
          id: true,
          student: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          tutor: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit
  });

  return {
    messages,
    pagination: {
      page,
      limit,
      total: await prisma.message.count({
        where: {
          sender: {
            role: 'SUPER_ADMIN'
          },
          content: {
            startsWith: '[SYSTEM]'
          }
        }
      })
    }
  };
}

async function sendMessageToUser(data: any) {
  const { userId, message, bookingId } = data;
  const superAdminId = await getSuperAdminId();

  // Create or find a booking for this conversation
  let targetBookingId = bookingId;
  
  if (!targetBookingId) {
    // Find existing booking or create a system booking
    const existingBooking = await prisma.booking.findFirst({
      where: {
        OR: [
          { studentId: userId, tutorId: superAdminId },
          { studentId: superAdminId, tutorId: userId }
        ]
      }
    });

    if (!existingBooking) {
      // Create a system booking for super admin messaging
      const systemBooking = await prisma.booking.create({
        data: {
          studentId: userId,
          tutorId: superAdminId,
          scheduledAt: new Date(),
          status: 'COMPLETED',
          // topic: 'System Communication', // Removed as it's not in the schema
          // amount: 0, // Removed as it's not in the schema
          // duration: 0 // Removed as it's not in the schema
        }
      });
      targetBookingId = systemBooking.id;
    } else {
      targetBookingId = existingBooking.id;
    }
  }

  // Send the message
  const newMessage = await prisma.message.create({
    data: {
      bookingId: targetBookingId,
      senderId: superAdminId,
      content: message
    },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          photo: true
        }
      }
    }
  });

  // Create notification for the user
  await prisma.notification.create({
    data: {
      userId,
      type: 'NEW_MESSAGE',
      title: 'New Message from Admin',
      message: `You have received a new message from the platform administrator.`,
      data: {
        messageId: newMessage.id,
        bookingId: targetBookingId
      }
    }
  });

  return {
    messageId: newMessage.id,
    bookingId: targetBookingId,
    sentAt: newMessage.createdAt.toISOString()
  };
}

async function sendSystemMessage(data: any) {
  const { message, targetRoles, targetUsers } = data;
  const superAdminId = await getSuperAdminId();

  const systemMessage = `[SYSTEM] ${message}`;
  const sentMessages = [];

  // Determine target users
  let usersToMessage: string[] = [];

  if (targetUsers && targetUsers.length > 0) {
    usersToMessage = targetUsers;
  } else if (targetRoles && targetRoles.length > 0) {
    const users = await prisma.user.findMany({
      where: {
        role: { in: targetRoles },
        active: true
      },
      select: { id: true }
    });
    usersToMessage = users.map(u => u.id);
  } else {
    // Send to all active users
    const allUsers = await prisma.user.findMany({
      where: { active: true },
      select: { id: true }
    });
    usersToMessage = allUsers.map(u => u.id);
  }

  // Send message to each user
  for (const userId of usersToMessage) {
    try {
      const result = await sendMessageToUser({
        userId,
        message: systemMessage,
        bookingId: null
      });
      sentMessages.push({ userId, ...result });
    } catch (error) {
      console.error(`Failed to send message to user ${userId}:`, error);
      sentMessages.push({ userId, error: 'Failed to send' });
    }
  }

  return {
    totalSent: sentMessages.length,
    successful: sentMessages.filter(m => !m.error).length,
    failed: sentMessages.filter(m => m.error).length,
    details: sentMessages
  };
}

async function sendBulkMessage(data: any) {
  const { message, userIds } = data;
  const superAdminId = await getSuperAdminId();

  const sentMessages = [];

  for (const userId of userIds) {
    try {
      const result = await sendMessageToUser({
        userId,
        message,
        bookingId: null
      });
      sentMessages.push({ userId, ...result });
    } catch (error) {
      console.error(`Failed to send message to user ${userId}:`, error);
      sentMessages.push({ userId, error: 'Failed to send' });
    }
  }

  return {
    totalSent: sentMessages.length,
    successful: sentMessages.filter(m => !m.error).length,
    failed: sentMessages.filter(m => m.error).length,
    details: sentMessages
  };
}

async function getSuperAdminId(): Promise<string> {
  const superAdmin = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' },
    select: { id: true }
  });
  
  if (!superAdmin) {
    throw new Error('No super admin found');
  }
  
  return superAdmin.id;
} 