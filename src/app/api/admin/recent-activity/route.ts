import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    // Get session
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user is Admin or Super Admin
    if ((session.user as any).role !== 'ADMIN' && (session.user as any).role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get recent activities from various sources
    const [
      recentUsers,
      recentSessions,
      recentPayments,
      recentReviews
    ] = await Promise.all([
      // Recent user registrations
      prisma.user.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      // Recent sessions
      prisma.booking.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        },
        select: {
          id: true,
          status: true,
          scheduledAt: true,
          createdAt: true,
          student: {
            select: { name: true }
          },
          tutor: {
            select: { name: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      // Recent payments
      prisma.payment.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        },
        select: {
          id: true,
          amount: true,
          status: true,
          createdAt: true,
          user: {
            select: { name: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      // Recent reviews
      prisma.review.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        },
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          student: {
            select: { name: true }
          },
          tutor: {
            select: { name: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    // Combine and format activities
    const activities = [
      ...recentUsers.map(user => ({
        id: `user-${user.id}`,
        type: 'user_registration',
        description: `New ${user.role.toLowerCase()} registered: ${user.name}`,
        timestamp: user.createdAt.toISOString(),
        user: user.name
      })),
      ...recentSessions.map(session => ({
        id: `session-${session.id}`,
        type: 'session_completed',
        description: `Session ${session.status.toLowerCase()} between ${session.student?.name} and ${session.tutor?.name}`,
        timestamp: session.createdAt.toISOString(),
        user: `${session.student?.name} & ${session.tutor?.name}`
      })),
      ...recentPayments.map(payment => ({
        id: `payment-${payment.id}`,
        type: 'payment_processed',
        description: `Payment of ₦${payment.amount} ${payment.status.toLowerCase()} by ${payment.user?.name}`,
        timestamp: payment.createdAt.toISOString(),
        user: payment.user?.name
      })),
      ...recentReviews.map(review => ({
        id: `review-${review.id}`,
        type: 'review_submitted',
        description: `${review.student?.name} left a ${review.rating}-star review for ${review.tutor?.name}`,
        timestamp: review.createdAt.toISOString(),
        user: review.student?.name
      }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
     .slice(0, 20); // Get top 20 most recent activities

    return NextResponse.json({
      success: true,
      activities
    });

  } catch (error) {
    console.error('Admin Recent Activity API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
} 