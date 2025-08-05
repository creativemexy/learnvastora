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
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'week';

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get real booking data for the period
    const bookings = await prisma.booking.findMany({
      where: {
        studentId: user.id,
        status: 'COMPLETED',
        scheduledAt: {
          gte: startDate,
          lte: now
        }
      },
      select: {
        scheduledAt: true,
        duration: true,
        review: {
          select: {
            rating: true
          }
        }
      },
      orderBy: { scheduledAt: 'asc' }
    });

    // Group bookings by date and calculate activity metrics
    const activityByDate = new Map<string, { sessions: number; hours: number; words: number }>();

    // Initialize all dates in the range with zero activity
    const days = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      activityByDate.set(dateStr, { sessions: 0, hours: 0, words: 0 });
    }

    // Add real booking data
    bookings.forEach(booking => {
      const date = booking.scheduledAt.toISOString().split('T')[0];
      const current = activityByDate.get(date) || { sessions: 0, hours: 0, words: 0 };
      
      current.sessions += 1;
      current.hours += booking.duration / 60; // Convert minutes to hours
      
      // Estimate words learned based on session duration and rating
      const baseWords = booking.duration / 2; // 1 word per 2 minutes
      const ratingBonus = booking.review?.rating ? (booking.review.rating - 2.5) * 10 : 0;
      current.words += Math.max(0, Math.floor(baseWords + ratingBonus));
      
      activityByDate.set(date, current);
    });

    // Convert to array format expected by frontend
    const activityData = Array.from(activityByDate.entries()).map(([date, data]) => ({
      date,
      sessions: data.sessions,
      hours: Math.round(data.hours * 10) / 10, // Round to 1 decimal
      words: Math.round(data.words)
    }));

    return NextResponse.json(activityData);
  } catch (error) {
    console.error('Profile activity error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 