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

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'overview';
    const period = searchParams.get('period') || '30d';

    // Calculate date range based on period
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    let data: any = {};

    switch (type) {
      case 'overview':
        data = await getOverviewData(startDate, now);
        break;
      case 'users':
        data = await getUserAnalytics(startDate, now);
        break;
      case 'sessions':
        data = await getSessionAnalytics(startDate, now);
        break;
      case 'financial':
        data = await getFinancialAnalytics(startDate, now);
        break;
      case 'performance':
        data = await getPerformanceAnalytics(startDate, now);
        break;
      default:
        data = await getOverviewData(startDate, now);
    }

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Admin Analytics API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

async function getOverviewData(startDate: Date, endDate: Date) {
  const [
    totalUsers,
    totalTutors,
    totalStudents,
    totalSessions,
    totalRevenue,
    activeUsers,
    newUsersThisPeriod,
    newSessionsThisPeriod,
    revenueThisPeriod
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'TUTOR' } }),
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.booking.count(),
    prisma.payment.aggregate({
      where: { status: 'PAID' },
      _sum: { amount: true }
    }),
    prisma.user.count({ where: { isOnline: true } }),
    prisma.user.count({
      where: {
        createdAt: { gte: startDate, lte: endDate }
      }
    }),
    prisma.booking.count({
      where: {
        createdAt: { gte: startDate, lte: endDate }
      }
    }),
    prisma.payment.aggregate({
      where: {
        status: 'PAID',
        createdAt: { gte: startDate, lte: endDate }
      },
      _sum: { amount: true }
    })
  ]);

  return {
    totalUsers,
    totalTutors,
    totalStudents,
    totalSessions,
    totalRevenue: totalRevenue._sum.amount || 0,
    activeUsers,
    newUsersThisPeriod,
    newSessionsThisPeriod,
    revenueThisPeriod: revenueThisPeriod._sum.amount || 0,
    period: { startDate, endDate }
  };
}

async function getUserAnalytics(startDate: Date, endDate: Date) {
  const [
    userRegistrations,
    userGrowth,
    userTypes,
    activeUsersByDay
  ] = await Promise.all([
    prisma.user.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate }
      },
      select: {
        createdAt: true,
        role: true
      },
      orderBy: { createdAt: 'asc' }
    }),
    prisma.user.groupBy({
      by: ['role'],
      _count: { id: true }
    }),
    prisma.user.groupBy({
      by: ['role'],
      _count: { id: true }
    }),
    prisma.user.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: { gte: startDate, lte: endDate }
      },
      _count: { id: true }
    })
  ]);

  return {
    userRegistrations,
    userGrowth,
    userTypes,
    activeUsersByDay
  };
}

async function getSessionAnalytics(startDate: Date, endDate: Date) {
  const [
    totalSessions,
    completedSessions,
    cancelledSessions,
    sessionsByStatus,
    sessionsByDay
  ] = await Promise.all([
    prisma.booking.count({
      where: {
        createdAt: { gte: startDate, lte: endDate }
      }
    }),
    prisma.booking.count({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: startDate, lte: endDate }
      }
    }),
    prisma.booking.count({
      where: {
        status: 'CANCELLED',
        createdAt: { gte: startDate, lte: endDate }
      }
    }),
    prisma.booking.groupBy({
      by: ['status'],
      where: {
        createdAt: { gte: startDate, lte: endDate }
      },
      _count: { id: true }
    }),
    prisma.booking.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: { gte: startDate, lte: endDate }
      },
      _count: { id: true }
    })
  ]);

  return {
    totalSessions,
    completedSessions,
    cancelledSessions,
    sessionsByStatus,
    sessionsByDay
  };
}

async function getFinancialAnalytics(startDate: Date, endDate: Date) {
  const [
    totalRevenue,
    revenueByPeriod,
    paymentsByStatus,
    averageTransactionValue
  ] = await Promise.all([
    prisma.payment.aggregate({
      where: { status: 'PAID' },
      _sum: { amount: true }
    }),
    prisma.payment.aggregate({
      where: {
        status: 'PAID',
        createdAt: { gte: startDate, lte: endDate }
      },
      _sum: { amount: true }
    }),
    prisma.payment.groupBy({
      by: ['status'],
      _count: { id: true },
      _sum: { amount: true }
    }),
    prisma.payment.aggregate({
      where: { status: 'PAID' },
      _avg: { amount: true }
    })
  ]);

  return {
    totalRevenue: totalRevenue._sum.amount || 0,
    revenueByPeriod: revenueByPeriod._sum.amount || 0,
    paymentsByStatus,
    averageTransactionValue: averageTransactionValue._avg.amount || 0
  };
}

async function getPerformanceAnalytics(startDate: Date, endDate: Date) {
  const [
    systemUptime,
    averageResponseTime,
    errorRate,
    userSatisfaction
  ] = await Promise.all([
    // Mock system uptime (99.9%)
    Promise.resolve(99.9),
    // Mock average response time (150ms)
    Promise.resolve(150),
    // Mock error rate (0.1%)
    Promise.resolve(0.1),
    // Mock user satisfaction (4.8/5)
    Promise.resolve(4.8)
  ]);

  return {
    systemUptime,
    averageResponseTime,
    errorRate,
    userSatisfaction
  };
} 