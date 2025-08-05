import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/prisma';

export async function PUT(
  req: NextRequest,
  { params }: { params: { badgeId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { isPublic } = await req.json();
    
    if (typeof isPublic !== 'boolean') {
      return NextResponse.json(
        { error: 'isPublic must be a boolean' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get the badge information
    const userBadge = await prisma.userBadge.findUnique({
      where: {
        userId_badgeId: {
          userId: user.id,
          badgeId: params.badgeId
        }
      },
      include: {
        badge: true
      }
    });

    if (!userBadge) {
      return NextResponse.json({
        success: false,
        error: 'Badge not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      userBadge: {
        ...userBadge.badge,
        earnedAt: userBadge.earnedAt
      }
    });
  } catch (error) {
    console.error('Error updating badge privacy:', error);
    
    if ((error as any).code === 'P2025') {
      return NextResponse.json(
        { error: 'Badge not found for this user' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update badge privacy' },
      { status: 500 }
    );
  }
} 