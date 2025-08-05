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
    
    // Get admin dashboard data
    const stats = await Promise.all([
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: 'TUTOR' } }),
      prisma.booking.count(),
      prisma.payment.count({ where: { status: 'PAID' } })
    ]);
    
    const [studentCount, tutorCount, bookingCount, paymentCount] = stats;
    
    return NextResponse.json({
      success: true,
      data: {
        stats: {
          students: studentCount,
          tutors: tutorCount,
          bookings: bookingCount,
          payments: paymentCount
        },
        user: {
          id: (session.user as any).id,
          email: (session.user as any).email,
          name: (session.user as any).name,
          role: (session.user as any).role
        }
      }
    });
    
  } catch (error) {
    console.error('Admin API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
} 