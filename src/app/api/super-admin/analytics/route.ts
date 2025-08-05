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
    const period = searchParams.get('period') || '30d'; // 7d, 30d, 90d, 1y
    const type = searchParams.get('type') || 'overview'; // overview, users, sessions, revenue, tutors

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    let analyticsData: any = {};

    if (type === 'overview' || type === 'all') {
      // Overview Analytics
      const [
        totalUsers,
        totalTutors,
        totalStudents,
        totalSessions,
        totalRevenue,
        activeUsers,
        pendingApprovals,
        totalPayments,
        totalPayouts,
        netRevenue
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: 'TUTOR' } }),
        prisma.user.count({ where: { role: 'STUDENT' } }),
        prisma.booking.count(),
        prisma.payment.aggregate({ _sum: { amount: true } }),
        prisma.user.count({ where: { active: true } }),
        prisma.user.count({ where: { role: 'TUTOR', active: false } }),
        prisma.payment.aggregate({ _sum: { amount: true } }),
        prisma.payout.aggregate({ _sum: { amount: true } }),
        prisma.payment.aggregate({ _sum: { amount: true } }).then(p => p._sum.amount || 0)
          .then(payments => prisma.payout.aggregate({ _sum: { amount: true } }).then(p => p._sum.amount || 0)
            .then(payouts => payments - payouts))
      ]);

      // Recent activity
      const recentBookings = await prisma.booking.findMany({
        where: { createdAt: { gte: startDate } },
        include: {
          student: { select: { name: true } },
          tutor: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      const recentPayments = await prisma.payment.findMany({
        where: { createdAt: { gte: startDate } },
        include: {
          user: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      analyticsData.overview = {
        totalUsers,
        totalTutors,
        totalStudents,
        totalSessions,
        totalRevenue: totalRevenue._sum.amount || 0,
        activeUsers,
        pendingApprovals,
        totalPayments: totalPayments._sum.amount || 0,
        totalPayouts: totalPayouts._sum.amount || 0,
        netRevenue,
        recentBookings,
        recentPayments
      };
    }

    if (type === 'users' || type === 'all') {
      // User Analytics
      const userGrowth = await prisma.user.groupBy({
        by: ['role'],
        _count: { id: true },
        where: { createdAt: { gte: startDate } }
      });

      const userActivity = await prisma.user.groupBy({
        by: ['active'],
        _count: { id: true }
      });

      const topActiveUsers = await prisma.user.findMany({
        where: { active: true },
        include: {
          bookingsAsStudent: { select: { id: true } },
          bookingsAsTutor: { select: { id: true } }
        },
        take: 10
      });

      analyticsData.users = {
        userGrowth,
        userActivity,
        topActiveUsers: topActiveUsers.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          sessionsAsStudent: user.bookingsAsStudent?.length || 0,
          sessionsAsTutor: user.bookingsAsTutor?.length || 0,
          totalSessions: (user.bookingsAsStudent?.length || 0) + (user.bookingsAsTutor?.length || 0)
        }))
      };
    }

    if (type === 'sessions' || type === 'all') {
      // Session Analytics
      const sessionStats = await prisma.booking.aggregate({
        _count: { id: true },
        _sum: { price: true, duration: true },
        where: { createdAt: { gte: startDate } }
      });

      const sessionStatusBreakdown = await prisma.booking.groupBy({
        by: ['status'],
        _count: { id: true },
        where: { createdAt: { gte: startDate } }
      });

      const sessionTrends = await prisma.booking.groupBy({
        by: ['scheduledAt'],
        _count: { id: true },
        where: { 
          scheduledAt: { gte: startDate },
          status: 'COMPLETED'
        },
        orderBy: { scheduledAt: 'asc' }
      });

      const topTutors = await prisma.user.findMany({
        where: { 
          role: 'TUTOR',
          bookingsAsTutor: {
            some: {
              createdAt: { gte: startDate }
            }
          }
        },
        include: {
          bookingsAsTutor: {
            where: { createdAt: { gte: startDate } },
            select: { id: true, price: true, status: true }
          },
          reviewsReceived: {
            where: { createdAt: { gte: startDate } },
            select: { rating: true }
          }
        },
        take: 10
      });

      analyticsData.sessions = {
        totalSessions: sessionStats._count.id,
        totalRevenue: sessionStats._sum.price || 0,
        totalHours: sessionStats._sum.duration || 0,
        statusBreakdown: sessionStatusBreakdown,
        sessionTrends,
        topTutors: topTutors.map(tutor => ({
          id: tutor.id,
          name: tutor.name,
          email: tutor.email,
          totalSessions: tutor.bookingsAsTutor?.length || 0,
          totalRevenue: tutor.bookingsAsTutor?.reduce((sum, booking) => sum + (booking.price || 0), 0) || 0,
          averageRating: tutor.reviewsReceived?.length > 0 
            ? tutor.reviewsReceived.reduce((sum, review) => sum + review.rating, 0) / tutor.reviewsReceived.length 
            : 0
        }))
      };
    }

    if (type === 'revenue' || type === 'all') {
      // Revenue Analytics
      const revenueStats = await prisma.payment.aggregate({
        _count: { id: true },
        _sum: { amount: true },
        where: { createdAt: { gte: startDate } }
      });

      const payoutStats = await prisma.payout.aggregate({
        _count: { id: true },
        _sum: { amount: true },
        where: { createdAt: { gte: startDate } }
      });

      const revenueTrends = await prisma.payment.groupBy({
        by: ['createdAt'],
        _sum: { amount: true },
        where: { createdAt: { gte: startDate } },
        orderBy: { createdAt: 'asc' }
      });

      const paymentMethodBreakdown = await prisma.payment.groupBy({
        by: ['status'],
        _count: { id: true },
        _sum: { amount: true },
        where: { createdAt: { gte: startDate } }
      });

      const payoutMethodBreakdown = await prisma.payout.groupBy({
        by: ['method'],
        _count: { id: true },
        _sum: { amount: true },
        where: { createdAt: { gte: startDate } }
      });

      analyticsData.revenue = {
        totalRevenue: revenueStats._sum.amount || 0,
        totalPayments: revenueStats._count.id,
        totalPayouts: payoutStats._sum.amount || 0,
        totalPayoutCount: payoutStats._count.id,
        netRevenue: (revenueStats._sum.amount || 0) - (payoutStats._sum.amount || 0),
        revenueTrends,
        paymentMethodBreakdown,
        payoutMethodBreakdown
      };
    }

    if (type === 'tutors' || type === 'all') {
      // Tutor Analytics
      const tutorStats = await prisma.user.findMany({
        where: { role: 'TUTOR' },
        include: {
          bookingsAsTutor: {
            where: { createdAt: { gte: startDate } },
            select: { id: true, price: true, status: true }
          },
          reviewsReceived: {
            where: { createdAt: { gte: startDate } },
            select: { rating: true }
          },
          tutorProfile: {
            select: { hourlyRate: true, skills: true, languages: true }
          }
        }
      });

      const tutorPerformance = tutorStats.map(tutor => ({
        id: tutor.id,
        name: tutor.name,
        email: tutor.email,
        hourlyRate: tutor.tutorProfile?.hourlyRate || 0,
        skills: tutor.tutorProfile?.skills || [],
        languages: tutor.tutorProfile?.languages || [],
        totalSessions: tutor.bookingsAsTutor?.length || 0,
        completedSessions: tutor.bookingsAsTutor?.filter(b => b.status === 'COMPLETED').length || 0,
        totalRevenue: tutor.bookingsAsTutor?.reduce((sum, booking) => sum + (booking.price || 0), 0) || 0,
        averageRating: tutor.reviewsReceived?.length > 0 
          ? tutor.reviewsReceived.reduce((sum, review) => sum + review.rating, 0) / tutor.reviewsReceived.length 
          : 0,
        completionRate: tutor.bookingsAsTutor?.length > 0 
          ? (tutor.bookingsAsTutor.filter(b => b.status === 'COMPLETED').length / tutor.bookingsAsTutor.length) * 100 
          : 0
      }));

      const topPerformingTutors = tutorPerformance
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 10);

      const tutorSkillsBreakdown = await prisma.user.findMany({
        where: { 
          role: 'TUTOR',
          tutorProfile: { isNot: null }
        },
        include: {
          tutorProfile: {
            select: { skills: true }
          }
        }
      });

      const skillsCount: { [key: string]: number } = {};
      tutorSkillsBreakdown.forEach(tutor => {
        tutor.tutorProfile?.skills?.forEach(skill => {
          skillsCount[skill] = (skillsCount[skill] || 0) + 1;
        });
      });

      analyticsData.tutors = {
        totalTutors: tutorStats.length,
        activeTutors: tutorStats.filter(t => t.active).length,
        tutorPerformance,
        topPerformingTutors,
        skillsBreakdown: Object.entries(skillsCount)
          .map(([skill, count]) => ({ skill, count }))
          .sort((a, b) => b.count - a.count)
      };
    }

    // Platform Health Metrics
    const platformHealth = {
      uptime: 99.9,
      responseTime: 150,
      errorRate: 0.1,
      activeSessions: await prisma.booking.count({ where: { status: 'IN_PROGRESS' } }),
      pendingApprovals: await prisma.user.count({ where: { role: 'TUTOR', active: false } }),
      systemAlerts: 0
    };

    return NextResponse.json({
      success: true,
      data: {
        period,
        type,
        analytics: analyticsData,
        platformHealth,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
} 