import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { BadgeService } from '@/lib/badge-service';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await BadgeService.initializeBadges();

    return NextResponse.json({ 
      message: 'Badges initialized successfully',
      success: true 
    });
  } catch (error) {
    console.error('Error initializing badges:', error);
    return NextResponse.json(
      { error: 'Failed to initialize badges' },
      { status: 500 }
    );
  }
} 