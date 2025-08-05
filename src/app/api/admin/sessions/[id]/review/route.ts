import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is Admin or Super Admin
    if ((session.user as any).role !== 'ADMIN' && (session.user as any).role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const bookingId = params.id;
    const body = await req.json();
    const { action, adminNotes, adminRating } = body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Get the booking with related data
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        tutor: true,
        student: true,
        sessionRecordings: true,
        review: true
      }
    });

    if (!booking) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (booking.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Only completed sessions can be reviewed' }, { status: 400 });
    }

    // Create admin review record
    const adminReview = await prisma.adminActivity.create({
      data: {
        adminId: (session.user as any).id,
        action: action === 'approve' ? 'SESSION_APPROVED' : 'SESSION_REJECTED',
        details: {
          bookingId: bookingId,
          adminNotes,
          adminRating,
          tutorId: booking.tutorId,
          studentId: booking.studentId,
          sessionDuration: booking.duration,
          sessionPrice: booking.price,
          action: action,
          reviewedAt: new Date().toISOString()
        }
      }
    });

    // If approved, create payment record for tutor
    if (action === 'approve') {
      // Calculate payment amount (₦4,000 per 30-minute session)
      const paymentAmount = (booking.duration / 30) * 4000;

      await prisma.payment.create({
        data: {
          userId: booking.tutorId,
          bookingId: bookingId,
          amount: paymentAmount,
          status: 'PAID'
        }
      });

      // Create notification for tutor
      await prisma.notification.create({
        data: {
          userId: booking.tutorId,
          type: 'PAYMENT_RECEIVED',
          title: 'Session Payment Approved',
          message: `Your session payment of ₦${paymentAmount.toLocaleString()} has been approved by admin.`,
          data: {
            bookingId: bookingId,
            amount: paymentAmount,
            sessionDate: booking.scheduledAt
          }
        }
      });
    } else {
      // Create notification for tutor about rejection
      await prisma.notification.create({
        data: {
          userId: booking.tutorId,
          type: 'SYSTEM_UPDATE',
          title: 'Session Review Rejected',
          message: `Your completed session has been reviewed and rejected by admin. Please check the details.`,
          data: {
            bookingId: bookingId,
            adminNotes,
            reviewedAt: new Date().toISOString()
          }
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: `Session ${action}d successfully`,
      data: {
        adminReview,
        action,
        bookingId
      }
    });

  } catch (error) {
    console.error('Error reviewing session:', error);
    return NextResponse.json(
      { error: 'Failed to review session' },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is Admin or Super Admin
    if ((session.user as any).role !== 'ADMIN' && (session.user as any).role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const bookingId = params.id;

    // Get the booking with all related data for review
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
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
        messages: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            sender: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });

    if (!booking) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Get admin review history for this session
    const adminReviews = await prisma.adminActivity.findMany({
      where: {
        action: {
          in: ['SESSION_APPROVED', 'SESSION_REJECTED']
        }
      },
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Filter reviews for this specific booking
    const filteredReviews = adminReviews.filter(review => 
      review.details && 
      typeof review.details === 'object' && 
      'bookingId' in review.details && 
      review.details.bookingId === bookingId
    );

    return NextResponse.json({
      success: true,
      data: {
        booking,
        adminReviews: filteredReviews
      }
    });

  } catch (error) {
    console.error('Error fetching session details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session details' },
      { status: 500 }
    );
  }
} 