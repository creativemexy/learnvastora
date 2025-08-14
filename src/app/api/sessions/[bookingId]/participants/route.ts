import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// In-memory store for session participants (in production, use Redis)
const sessionParticipants = new Map<string, Map<string, {
  userId: string;
  userName: string;
  userRole: string;
  socketId: string;
  lastSeen: Date;
  isActive: boolean;
}>>();

export async function GET(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bookingId = params.bookingId;
    const participants = sessionParticipants.get(bookingId) || new Map();
    
    // Clean up inactive participants (30 seconds timeout)
    const now = new Date();
    const timeoutMs = 30000;
    
    for (const [userId, participant] of participants.entries()) {
      const timeSinceLastSeen = now.getTime() - participant.lastSeen.getTime();
      if (timeSinceLastSeen > timeoutMs) {
        participant.isActive = false;
      }
    }

    const activeParticipants = Array.from(participants.values())
      .filter(p => p.isActive)
      .map(p => ({
        id: p.userId,
        name: p.userName,
        role: p.userRole,
        socketId: p.socketId,
        lastSeen: p.lastSeen
      }));

    return NextResponse.json({ participants: activeParticipants });
  } catch (error) {
    console.error('Error fetching participants:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bookingId = params.bookingId;
    const { userId, userName, userRole, socketId, action } = await request.json();

    if (!sessionParticipants.has(bookingId)) {
      sessionParticipants.set(bookingId, new Map());
    }

    const participants = sessionParticipants.get(bookingId)!;

    switch (action) {
      case 'join':
        participants.set(userId, {
          userId,
          userName,
          userRole,
          socketId,
          lastSeen: new Date(),
          isActive: true
        });
        break;

      case 'reconnect':
        const existingParticipant = participants.get(userId);
        if (existingParticipant) {
          existingParticipant.socketId = socketId;
          existingParticipant.lastSeen = new Date();
          existingParticipant.isActive = true;
        }
        break;

      case 'leave':
        const participant = participants.get(userId);
        if (participant) {
          participant.isActive = false;
        }
        break;

      case 'heartbeat':
        const activeParticipant = participants.get(userId);
        if (activeParticipant) {
          activeParticipant.lastSeen = new Date();
        }
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating participant:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
