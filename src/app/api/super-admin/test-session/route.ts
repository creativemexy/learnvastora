import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
    if (!studentId || !tutorId || !duration || !startTime) {
      console.log('Missing fields:', { studentId, tutorId, duration, startTime });
      return NextResponse.json({ 
        error: 'Missing required fields: studentId, tutorId, duration, startTime',
        received: { studentId, tutorId, duration, startTime }
      }, { status: 400 });
    }

    // Verify student and tutor exist
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

    if (!student || student.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Invalid student ID' }, { status: 400 });
    }

    if (!tutor || tutor.role !== 'TUTOR') {
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
        isInstant: false
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Test session created successfully',
      bookingId: booking.id,
      data: {
        booking
      }
    });

  } catch (error) {
    console.error('Test session creation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create test session',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
