import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is Admin or Super Admin
    if ((session.user as any).role !== 'ADMIN' && (session.user as any).role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const tutorId = searchParams.get('tutorId');
    const studentId = searchParams.get('studentId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    // New filters
    const sessionType = searchParams.get('sessionType'); // 'INSTANT' | 'REGULAR'
    const paymentStatus = searchParams.get('paymentStatus'); // 'PAID' | 'PENDING' | 'FAILED'
    const reviewStatus = searchParams.get('reviewStatus'); // 'REVIEWED' | 'NOT_REVIEWED'
    const tutorName = searchParams.get('tutorName');
    const studentName = searchParams.get('studentName');
    const minDuration = searchParams.get('minDuration');
    const maxDuration = searchParams.get('maxDuration');

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    if (tutorId) {
      where.tutorId = tutorId;
    }
    if (studentId) {
      where.studentId = studentId;
    }
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }
    if (sessionType) {
      where.isInstant = sessionType === 'INSTANT';
    }
    if (minDuration || maxDuration) {
      where.duration = {};
      if (minDuration) where.duration.gte = Number(minDuration);
      if (maxDuration) where.duration.lte = Number(maxDuration);
    }

    // Tutor name/email filter
    if (tutorName) {
      where.tutor = {
        OR: [
          { name: { contains: tutorName, mode: 'insensitive' } },
          { email: { contains: tutorName, mode: 'insensitive' } }
        ]
      };
    }
    // Student name/email filter
    if (studentName) {
      where.student = {
        OR: [
          { name: { contains: studentName, mode: 'insensitive' } },
          { email: { contains: studentName, mode: 'insensitive' } }
        ]
      };
    }

    // Payment status filter (requires join)
    if (paymentStatus) {
      where.payment = { status: paymentStatus };
    }

    // Review status filter
    if (reviewStatus === 'REVIEWED') {
      where.review = { NOT: null };
    } else if (reviewStatus === 'NOT_REVIEWED') {
      where.review = null;
    }

    // Get sessions with related data
    const sessions = await prisma.booking.findMany({
      where,
      include: {
        tutor: {
          select: {
            id: true,
            name: true,
            email: true,
            photo: true
          }
        },
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            photo: true
          }
        },
        sessionRecordings: {
          select: {
            id: true,
            url: true,
            fileName: true,
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
        payment: {
          select: {
            id: true,
            status: true,
            amount: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    });

    // Get total count for pagination
    const totalSessions = await prisma.booking.count({ where });
    const totalPages = Math.ceil(totalSessions / limit);

    // Get session statistics
    const stats = await prisma.booking.groupBy({
      by: ['status'],
      where,
      _count: {
        id: true
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        sessions,
        pagination: {
          page,
          limit,
          totalSessions,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        stats: {
          byStatus: stats
        }
      }
    });

  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
} 