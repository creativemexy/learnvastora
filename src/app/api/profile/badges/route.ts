import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        userBadges: {
          include: {
            badge: true
          },
          orderBy: {
            earnedAt: 'desc'
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all available badges to show progress
    const allBadges = await prisma.badge.findMany({
      where: { isActive: true },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });

    // Create a map of earned badges
    const earnedBadges = new Map(
      user.userBadges.map(ub => [ub.badge.key, ub])
    );

    // Combine all badges with earned status and progress
    const badgesWithProgress = allBadges.map(badge => {
      const earned = earnedBadges.get(badge.key);
      return {
        ...badge,
        isEarned: !!earned,
        earnedAt: earned?.earnedAt || null
      };
    });

    return NextResponse.json({ 
      badges: badgesWithProgress,
      totalEarned: user.userBadges.length,
      totalAvailable: allBadges.length
    });
  } catch (error) {
    console.error('Error fetching user badges:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user badges' },
      { status: 500 }
    );
  }
} 