import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;

    // Get badges for the user
    const userBadges = await prisma.userBadge.findMany({
      where: {
        userId: userId
      },
      include: {
        badge: true
      },
      orderBy: {
        earnedAt: 'desc'
      }
    });

    // Get user info for context
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        role: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        role: user.role
      },
      badges: userBadges.map(ub => ({
        ...ub.badge,
        earnedAt: ub.earnedAt
      })),
      totalBadges: userBadges.length
    });
  } catch (error) {
    console.error('Error fetching user badges:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user badges' },
      { status: 500 }
    );
  }
} 