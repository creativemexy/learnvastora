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

    const recentActivity: any[] = [];

    // Get recent completed sessions
    const recentSessions = await prisma.booking.findMany({
      where: {
        studentId: user.id,
        status: 'COMPLETED'
      },
      include: {
        tutor: {
          select: { name: true }
        },
        review: {
          select: { rating: true }
        }
      },
      orderBy: { scheduledAt: 'desc' },
      take: 5
    });

    // Add session activities
    recentSessions.forEach(session => {
      recentActivity.push({
        id: `session_${session.id}`,
        type: 'session_completed',
        title: `Completed session with ${session.tutor.name}`,
        description: `Finished a ${session.duration}-minute session`,
        timestamp: session.scheduledAt.toISOString(),
        icon: '🎯',
        color: '#48dbfb',
        rating: session.review?.rating || null
      });
    });

    // Get recent reviews given
    const recentReviews = await prisma.review.findMany({
      where: {
        studentId: user.id
      },
      include: {
        tutor: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 3
    });

    // Add review activities
    recentReviews.forEach(review => {
      recentActivity.push({
        id: `review_${review.id}`,
        type: 'review_given',
        title: `Reviewed ${review.tutor.name}`,
        description: `Gave ${review.rating} stars`,
        timestamp: review.createdAt.toISOString(),
        icon: '⭐',
        color: '#ff9ff3',
        rating: review.rating
      });
    });

    // Get recent achievements (badges)
    const recentBadges = await prisma.userBadge.findMany({
      where: {
        userId: user.id
      },
      include: {
        badge: true
      },
      orderBy: { earnedAt: 'desc' },
      take: 3
    });

    // Add badge activities
    recentBadges.forEach(userBadge => {
      recentActivity.push({
        id: `badge_${userBadge.id}`,
        type: 'achievement_unlocked',
        title: `Earned ${userBadge.badge.name} badge`,
        description: userBadge.badge.description,
        timestamp: userBadge.earnedAt.toISOString(),
        icon: '🏆',
        color: userBadge.badge.color || '#ff6b6b'
      });
    });

    // Get recent payments
    const recentPayments = await prisma.payment.findMany({
      where: {
        userId: user.id,
        status: 'PAID'
      },
      include: {
        booking: {
          include: {
            tutor: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 3
    });

    // Add payment activities
    recentPayments.forEach(payment => {
      recentActivity.push({
        id: `payment_${payment.id}`,
        type: 'payment_made',
        title: `Paid for session with ${payment.booking.tutor.name}`,
        description: `Amount: $${payment.amount}`,
        timestamp: payment.createdAt.toISOString(),
        icon: '💳',
        color: '#1dd1a1'
      });
    });

    // Sort all activities by timestamp (most recent first)
    recentActivity.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Return top 10 most recent activities
    return NextResponse.json(recentActivity.slice(0, 10));
  } catch (error) {
    console.error('Recent activity error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 