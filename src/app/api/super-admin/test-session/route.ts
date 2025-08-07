import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { role: true }
    });

    if (user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { studentId, tutorId, subject, duration, startTime } = body;

    // Debug logging
    console.log('Test session request body:', body);

    // Validate required fields
    console.log('Validating fields:', { studentId, tutorId, duration, startTime });
    console.log('Field types:', { 
      studentId: typeof studentId, 
      tutorId: typeof tutorId, 
      duration: typeof duration, 
      startTime: typeof startTime 
    });
    
    if (!studentId || !tutorId || !duration || !startTime) {
      console.log('Missing fields:', { studentId, tutorId, duration, startTime });
      return NextResponse.json({ 
        error: 'Missing required fields: studentId, tutorId, duration, startTime',
        received: { studentId, tutorId, duration, startTime }
      }, { status: 400 });
    }

    // Verify student and tutor exist
    console.log('Looking up student and tutor...');
    const [student, tutor] = await Promise.all([
      prisma.user.findUnique({
        where: { id: studentId },
        select: { id: true, name: true, email: true, role: true }
      }),
      prisma.user.findUnique({
        where: { id: tutorId },
        select: { id: true, name: true, email: true, role: true }
      })
    ]);

    console.log('Found student:', student);
    console.log('Found tutor:', tutor);

    if (!student || student.role !== 'STUDENT') {
      console.log('Student validation failed:', { student, expectedRole: 'STUDENT' });
      return NextResponse.json({ error: 'Invalid student ID' }, { status: 400 });
    }

    if (!tutor || tutor.role !== 'TUTOR') {
      console.log('Tutor validation failed:', { tutor, expectedRole: 'TUTOR' });
      return NextResponse.json({ error: 'Invalid tutor ID' }, { status: 400 });
    }

    // Create a test booking
    const booking = await prisma.booking.create({
      data: {
        studentId,
        tutorId,
        scheduledAt: new Date(startTime),
        duration,
        status: 'CONFIRMED',
        price: 0, // Free for test sessions
        isInstant: false,
        paidAt: new Date(), // Mark as paid immediately
        paymentReference: 'TEST_SESSION_' + Date.now(),
        paymentMethod: 'TEST_SESSION'
      }
    });

    // Create a payment record for the test session
    const payment = await prisma.payment.create({
      data: {
        userId: studentId, // Student is the one paying (even though it's free)
        bookingId: booking.id,
        amount: 0, // Free for test sessions
        status: 'PAID'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Test session created successfully',
      bookingId: booking.id,
      paymentId: payment.id,
      data: {
        booking,
        payment
      }
    });

  } catch (error) {
    console.error('Test session creation error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      {
        error: 'Failed to create test session',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
