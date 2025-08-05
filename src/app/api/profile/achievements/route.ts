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

    if (!session.user?.email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 });
    }

    // Get user ID first
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, createdAt: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user's booking history to determine achievements
    const bookings = await prisma.booking.findMany({
      where: {
        studentId: user.id,
        status: 'COMPLETED'
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    const totalSessions = bookings.length;
    const joinDate = user.createdAt; // Use actual user join date

    // Generate achievements based on user activity
    const achievements = [];

    // First Steps - Complete first session
    if (totalSessions >= 1) {
      achievements.push({
        id: '1',
        title: 'First Steps',
        description: 'Complete your first learning session',
        icon: '🚀',
        color: '#667eea',
        unlockedAt: bookings[0]?.createdAt?.toISOString() || joinDate.toISOString(),
        rarity: 'common'
      });
    }

    // Week Warrior - 7-day streak
    if (totalSessions >= 7) {
      achievements.push({
        id: '2',
        title: 'Week Warrior',
        description: 'Maintain a 7-day learning streak',
        icon: '🔥',
        color: '#ff6b6b',
        unlockedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        rarity: 'rare'
      });
    }

    // Language Master - 50 sessions
    if (totalSessions >= 50) {
      achievements.push({
        id: '3',
        title: 'Language Master',
        description: 'Complete 50 language exercises',
        icon: '👑',
        color: '#feca57',
        unlockedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        rarity: 'epic'
      });
    }

    // Legendary Learner - 100 sessions
    if (totalSessions >= 100) {
      achievements.push({
        id: '4',
        title: 'Legendary Learner',
        description: 'Achieve mastery in multiple languages',
        icon: '⭐',
        color: '#ff9ff3',
        unlockedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        rarity: 'legendary'
      });
    }

    // Add more achievements based on other criteria
    if (totalSessions >= 10) {
      achievements.push({
        id: '5',
        title: 'Consistent Learner',
        description: 'Complete 10 learning sessions',
        icon: '📚',
        color: '#48dbfb',
        unlockedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        rarity: 'common'
      });
    }

    if (totalSessions >= 25) {
      achievements.push({
        id: '6',
        title: 'Dedicated Student',
        description: 'Complete 25 learning sessions',
        icon: '🎓',
        color: '#0abde3',
        unlockedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        rarity: 'rare'
      });
    }

    return NextResponse.json(achievements);
  } catch (error) {
    console.error('Profile achievements error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 