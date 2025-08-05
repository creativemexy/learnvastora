import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch comprehensive statistics
    const [
      totalUsers,
      totalTutors,
      totalStudents,
      totalSessions,
      totalRevenue,
      activeUsers,
      pendingApprovals,
      totalAdmins,
      securityAlerts,
      recentActivity
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'TUTOR' } }),
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.booking.count(),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'PAID' }
      }),
      prisma.user.count({ where: { active: true } }),
      prisma.booking.count({ where: { status: 'PENDING' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.payment.count({ where: { status: 'FAILED' } }),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true
        }
      })
    ]);

    // Calculate platform uptime (mock data for now)
    const platformUptime = 99.8;
    const dataUsage = 75.5; // GB

    const stats = {
      totalUsers,
      totalTutors,
      totalStudents,
      totalSessions,
      totalRevenue: totalRevenue._sum.amount || 0,
      activeUsers,
      pendingApprovals,
      systemHealth: 'healthy',
      totalAdmins,
      platformUptime,
      securityAlerts,
      dataUsage,
      recentActivity
    };

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching super admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
} 