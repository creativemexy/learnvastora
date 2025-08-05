import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if ((session.user as any).role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const tutorId = searchParams.get('tutorId') || '';
    const studentId = searchParams.get('studentId') || '';

    // Build where clause
    let whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { student: { name: { contains: search, mode: 'insensitive' } } },
        { tutor: { name: { contains: search, mode: 'insensitive' } } },
        { id: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (status) {
      whereClause.status = status.toUpperCase();
    }

    if (dateFrom) {
      whereClause.scheduledAt = {
        ...whereClause.scheduledAt,
        gte: new Date(dateFrom)
      };
    }

    if (dateTo) {
      whereClause.scheduledAt = {
        ...whereClause.scheduledAt,
        lte: new Date(dateTo)
      };
    }

    if (tutorId) {
      whereClause.tutorId = tutorId;
    }

    if (studentId) {
      whereClause.studentId = studentId;
    }

    // Get bookings with related data
    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where: whereClause,
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              photo: true
            }
          },
          tutor: {
            select: {
              id: true,
              name: true,
              email: true,
              photo: true,
              tutorProfile: {
                select: {
                  hourlyRate: true,
                  skills: true,
                  languages: true
                }
              }
            }
          },
          payment: {
            select: {
              id: true,
              amount: true,
              status: true,
              createdAt: true
            }
          },
          review: {
            select: {
              id: true,
              rating: true,
              comment: true,
              createdAt: true
            }
          },
          messages: {
            select: {
              id: true,
              content: true,
              createdAt: true
            }
          },
          sessionRecordings: {
            select: {
              id: true,
              url: true,
              fileName: true,
              createdAt: true
            }
          }
        },
        orderBy: { scheduledAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.booking.count({ where: whereClause })
    ]);

    // Transform data for frontend
    const transformedSessions = bookings.map(booking => {
      const totalMessages = booking.messages?.length || 0;
      const totalRecordings = booking.sessionRecordings?.length || 0;
      const isPaid = booking.payment?.status === 'PAID';
      const hasReview = booking.review !== null;

      return {
        id: booking.id,
        student: {
          id: booking.student.id,
          name: booking.student.name,
          email: booking.student.email,
          photo: booking.student.photo
        },
        tutor: {
          id: booking.tutor.id,
          name: booking.tutor.name,
          email: booking.tutor.email,
          photo: booking.tutor.photo,
          hourlyRate: booking.tutor.tutorProfile?.hourlyRate || 0,
          skills: booking.tutor.tutorProfile?.skills || [],
          languages: booking.tutor.tutorProfile?.languages || []
        },
        scheduledAt: booking.scheduledAt,
        status: booking.status,
        duration: booking.duration,
        price: booking.price,
        isInstant: booking.isInstant,
        payment: booking.payment ? {
          id: booking.payment.id,
          amount: booking.payment.amount,
          status: booking.payment.status,
          createdAt: booking.payment.createdAt
        } : null,
        review: booking.review ? {
          id: booking.review.id,
          rating: booking.review.rating,
          comment: booking.review.comment,
          createdAt: booking.review.createdAt
        } : null,
        stats: {
          totalMessages,
          totalRecordings,
          isPaid,
          hasReview,
          totalValue: booking.price
        }
      };
    });

    // Get session statistics
    const sessionStats = await prisma.booking.aggregate({
      _count: { id: true },
      _sum: { price: true }
    });

    const statusStats = await prisma.booking.groupBy({
      by: ['status'],
      _count: { id: true }
    });

    const todaySessions = await prisma.booking.count({
      where: {
        scheduledAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999))
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        sessions: transformedSessions,
        statistics: {
          totalSessions: sessionStats._count.id,
          totalRevenue: sessionStats._sum.price || 0,
          todaySessions,
          statusBreakdown: statusStats.map(stat => ({
            status: stat.status,
            count: stat._count.id
          }))
        },
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Session management API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session data' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if ((session.user as any).role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { sessionId, action, updates } = body;

    if (!sessionId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let result: any = {};

    switch (action) {
      case 'cancel':
        result = await prisma.booking.update({
          where: { id: sessionId },
          data: { status: 'CANCELLED' }
        });
        break;
      
      case 'reschedule':
        if (!updates || !updates.scheduledAt) {
          return NextResponse.json({ error: 'Missing new schedule time' }, { status: 400 });
        }
        result = await prisma.booking.update({
          where: { id: sessionId },
          data: { 
            scheduledAt: new Date(updates.scheduledAt),
            status: 'CONFIRMED'
          }
        });
        break;
      
      case 'update':
        if (!updates) {
          return NextResponse.json({ error: 'Missing updates' }, { status: 400 });
        }
        result = await prisma.booking.update({
          where: { id: sessionId },
          data: updates
        });
        break;
      
      case 'mark_completed':
        result = await prisma.booking.update({
          where: { id: sessionId },
          data: { status: 'COMPLETED' }
        });
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
    console.error('Session update error:', error);
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if ((session.user as any).role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session ID' }, { status: 400 });
    }

    // Check if session can be deleted (not completed or cancelled)
    const booking = await prisma.booking.findUnique({
      where: { id: sessionId },
      select: { status: true }
    });

    if (!booking) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (booking.status === 'COMPLETED' || booking.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Cannot delete completed or cancelled sessions' }, { status: 400 });
    }

    // Delete the session (this will cascade to related records)
    await prisma.booking.delete({
      where: { id: sessionId }
    });

    return NextResponse.json({
      success: true,
      message: 'Session deleted successfully'
    });

  } catch (error) {
    console.error('Session deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    );
  }
} 