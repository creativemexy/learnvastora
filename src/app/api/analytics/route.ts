import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '30d';
    const type = searchParams.get('type') || 'overview';
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    // Calculate date range
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

    switch (type) {
      case 'overview':
        analyticsData = await getOverviewAnalytics(userId, userRole, startDate, now);
        break;
      case 'sessions':
        analyticsData = await getSessionAnalytics(userId, userRole, startDate, now);
        break;
      case 'performance':
        analyticsData = await getPerformanceAnalytics(userId, userRole, startDate, now);
        break;
      case 'financial':
        analyticsData = await getFinancialAnalytics(userId, userRole, startDate, now);
        break;
      case 'engagement':
        analyticsData = await getEngagementAnalytics(userId, userRole, startDate, now);
        break;
      case 'trends':
        analyticsData = await getTrendAnalytics(userId, userRole, startDate, now);
        break;
      default:
        analyticsData = await getOverviewAnalytics(userId, userRole, startDate, now);
    }

    return NextResponse.json({
      success: true,
      period,
      type,
      data: analyticsData,
      generatedAt: now.toISOString()
    });

  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}

async function getOverviewAnalytics(userId: string, userRole: string, startDate: Date, endDate: Date) {
  const whereClause = userRole === 'TUTOR' 
    ? { tutorId: userId }
    : { studentId: userId };

  const bookings = await prisma.booking.findMany({
    where: {
      ...whereClause,
      createdAt: { gte: startDate, lte: endDate }
    },
    include: {
      student: true,
      tutor: true,
      review: true,
      payment: true
    }
  });

  const totalSessions = bookings.length;
  const completedSessions = bookings.filter(b => b.status === 'COMPLETED').length;
  const cancelledSessions = bookings.filter(b => b.status === 'CANCELLED').length;
  const totalHours = bookings
    .filter(b => b.status === 'COMPLETED')
    .reduce((sum, b) => sum + (b.duration / 60), 0);

  const averageRating = bookings
    .filter(b => b.review?.rating)
    .reduce((sum, b) => sum + (b.review?.rating || 0), 0) / 
    bookings.filter(b => b.review?.rating).length || 0;

  const totalSpent = bookings
    .filter(b => b.payment?.amount && b.status === 'COMPLETED')
    .reduce((sum, b) => sum + (b.payment?.amount || 0), 0);

  return {
    totalSessions,
    completedSessions,
    cancelledSessions,
    totalHours: Math.round(totalHours * 100) / 100,
    averageRating: Math.round(averageRating * 10) / 10,
    totalSpent: Math.round(totalSpent * 100) / 100,
    completionRate: totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0,
    cancellationRate: totalSessions > 0 ? Math.round((cancelledSessions / totalSessions) * 100) : 0
  };
}

async function getSessionAnalytics(userId: string, userRole: string, startDate: Date, endDate: Date) {
  const whereClause = userRole === 'TUTOR' 
    ? { tutorId: userId }
    : { studentId: userId };

  const bookings = await prisma.booking.findMany({
    where: {
      ...whereClause,
      createdAt: { gte: startDate, lte: endDate }
    },
    include: {
      student: true,
      tutor: true,
      review: true
    },
    orderBy: { scheduledAt: 'asc' }
  });

  // Group by date for time series
  const sessionsByDate = new Map<string, number>();
  const ratingsByDate = new Map<string, number[]>();

  bookings.forEach(booking => {
    const date = booking.scheduledAt.toISOString().split('T')[0];
    sessionsByDate.set(date, (sessionsByDate.get(date) || 0) + 1);
    
    if (booking.review?.rating) {
      const ratings = ratingsByDate.get(date) || [];
      ratings.push(booking.review.rating);
      ratingsByDate.set(date, ratings);
    }
  });

  // Convert to arrays for charts
  const timeSeriesData = Array.from(sessionsByDate.entries()).map(([date, count]) => ({
    date,
    sessions: count,
    averageRating: ratingsByDate.get(date) 
      ? Math.round((ratingsByDate.get(date)!.reduce((a, b) => a + b, 0) / ratingsByDate.get(date)!.length) * 10) / 10
      : 0
  }));

  // Session duration distribution
  const durationDistribution = bookings
    .filter(b => b.status === 'COMPLETED')
    .reduce((acc, b) => {
      const duration = Math.round(b.duration / 15) * 15; // Round to 15-minute intervals
      acc[duration] = (acc[duration] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

  return {
    timeSeriesData,
    durationDistribution: Object.entries(durationDistribution).map(([duration, count]) => ({
      duration: `${duration}min`,
      count
    })),
    totalSessions: bookings.length,
    averageSessionDuration: bookings.length > 0 
      ? Math.round(bookings.reduce((sum, b) => sum + b.duration, 0) / bookings.length)
      : 0
  };
}

async function getPerformanceAnalytics(userId: string, userRole: string, startDate: Date, endDate: Date) {
  const whereClause = userRole === 'TUTOR' 
    ? { tutorId: userId }
    : { studentId: userId };

  const bookings = await prisma.booking.findMany({
    where: {
      ...whereClause,
      createdAt: { gte: startDate, lte: endDate }
    },
    include: {
      review: true,
      student: true,
      tutor: true
    }
  });

  const reviews = bookings.filter(b => b.review);
  
  // Rating distribution
  const ratingDistribution = reviews.reduce((acc, b) => {
    const rating = b.review!.rating;
    acc[rating] = (acc[rating] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  // Average rating over time
  const ratingsByWeek = new Map<string, number[]>();
  reviews.forEach(booking => {
    const week = getWeekNumber(booking.scheduledAt);
    const ratings = ratingsByWeek.get(week) || [];
    ratings.push(booking.review!.rating);
    ratingsByWeek.set(week, ratings);
  });

  const weeklyRatings = Array.from(ratingsByWeek.entries()).map(([week, ratings]) => ({
    week,
    averageRating: Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
  }));

  return {
    ratingDistribution: Object.entries(ratingDistribution).map(([rating, count]) => ({
      rating: parseInt(rating),
      count
    })),
    weeklyRatings,
    totalReviews: reviews.length,
    averageRating: reviews.length > 0 
      ? Math.round(reviews.reduce((sum, b) => sum + b.review!.rating, 0) / reviews.length * 10) / 10
      : 0,
    topRating: reviews.length > 0 ? Math.max(...reviews.map(b => b.review!.rating)) : 0,
    lowestRating: reviews.length > 0 ? Math.min(...reviews.map(b => b.review!.rating)) : 0
  };
}

async function getFinancialAnalytics(userId: string, userRole: string, startDate: Date, endDate: Date) {
  if (userRole === 'TUTOR') {
    // Tutor earnings analytics - get payments for bookings where user is the tutor
    const payments = await prisma.payment.findMany({
      where: {
        booking: {
          tutorId: userId
        },
        createdAt: { gte: startDate, lte: endDate },
        status: 'PAID'
      },
      include: {
        booking: true
      }
    });

    const earningsByMonth = new Map<string, number>();
    payments.forEach(payment => {
      const month = payment.createdAt.toISOString().slice(0, 7); // YYYY-MM
      earningsByMonth.set(month, (earningsByMonth.get(month) || 0) + payment.amount);
    });

    const monthlyEarnings = Array.from(earningsByMonth.entries()).map(([month, amount]) => ({
      month,
      earnings: Math.round(amount * 100) / 100
    }));

    const totalEarnings = payments.reduce((sum, p) => sum + p.amount, 0);
    const averageEarning = payments.length > 0 ? totalEarnings / payments.length : 0;

    return {
      monthlyEarnings,
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      averageEarning: Math.round(averageEarning * 100) / 100,
      totalPayments: payments.length
    };
  } else {
    // Student spending analytics - get payments for bookings where user is the student
    const payments = await prisma.payment.findMany({
      where: {
        booking: {
          studentId: userId
        },
        createdAt: { gte: startDate, lte: endDate },
        status: 'PAID'
      },
      include: {
        booking: true
      }
    });

    const spendingByMonth = new Map<string, number>();
    payments.forEach(payment => {
      const month = payment.createdAt.toISOString().slice(0, 7);
      spendingByMonth.set(month, (spendingByMonth.get(month) || 0) + payment.amount);
    });

    const monthlySpending = Array.from(spendingByMonth.entries()).map(([month, amount]) => ({
      month,
      spending: Math.round(amount * 100) / 100
    }));

    const totalSpent = payments.reduce((sum, p) => sum + p.amount, 0);
    const averageSpending = payments.length > 0 ? totalSpent / payments.length : 0;

    return {
      monthlySpending,
      totalSpent: Math.round(totalSpent * 100) / 100,
      averageSpending: Math.round(averageSpending * 100) / 100,
      totalPayments: payments.length
    };
  }
}

async function getEngagementAnalytics(userId: string, userRole: string, startDate: Date, endDate: Date) {
  // Get user activity data
  const bookings = await prisma.booking.findMany({
    where: {
      [userRole === 'TUTOR' ? 'tutorId' : 'studentId']: userId,
      createdAt: { gte: startDate, lte: endDate }
    },
    include: {
      sessionRecordings: true,
      messages: true
    }
  });

  // Calculate engagement metrics
  const totalSessions = bookings.length;
  const sessionsWithRecordings = bookings.filter(b => b.sessionRecordings.length > 0).length;
  const sessionsWithMessages = bookings.filter(b => b.messages.length > 0).length;

  // Activity by day of week
  const activityByDay = new Array(7).fill(0);
  bookings.forEach(booking => {
    const dayOfWeek = booking.scheduledAt.getDay();
    activityByDay[dayOfWeek]++;
  });

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dailyActivity = dayNames.map((day, index) => ({
    day,
    sessions: activityByDay[index]
  }));

  return {
    totalSessions,
    sessionsWithRecordings,
    sessionsWithMessages,
    recordingRate: totalSessions > 0 ? Math.round((sessionsWithRecordings / totalSessions) * 100) : 0,
    messagingRate: totalSessions > 0 ? Math.round((sessionsWithMessages / totalSessions) * 100) : 0,
    dailyActivity,
    averageSessionsPerWeek: Math.round((totalSessions / 4) * 10) / 10 // Assuming 4 weeks in period
  };
}

async function getTrendAnalytics(userId: string, userRole: string, startDate: Date, endDate: Date) {
  const whereClause = userRole === 'TUTOR' 
    ? { tutorId: userId }
    : { studentId: userId };

  const bookings = await prisma.booking.findMany({
    where: {
      ...whereClause,
      createdAt: { gte: startDate, lte: endDate }
    },
    include: {
      review: true,
      payment: true
    },
    orderBy: { createdAt: 'asc' }
  });

  // Calculate trends over time
  const weeklyData = new Map<string, {
    sessions: number;
    ratings: number[];
    revenue: number;
  }>();

  bookings.forEach(booking => {
    const week = getWeekNumber(booking.scheduledAt);
    const current = weeklyData.get(week) || { sessions: 0, ratings: [], revenue: 0 };
    
    current.sessions++;
    if (booking.review?.rating) {
      current.ratings.push(booking.review.rating);
    }
    if (booking.payment?.amount) {
      current.revenue += booking.payment.amount;
    }
    
    weeklyData.set(week, current);
  });

  const trendData = Array.from(weeklyData.entries()).map(([week, data]) => ({
    week,
    sessions: data.sessions,
    averageRating: data.ratings.length > 0 
      ? Math.round((data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length) * 10) / 10
      : 0,
    revenue: Math.round(data.revenue * 100) / 100
  }));

  return {
    trendData,
    growthRate: calculateGrowthRate(trendData, 'sessions'),
    ratingTrend: calculateGrowthRate(trendData, 'averageRating'),
    revenueTrend: calculateGrowthRate(trendData, 'revenue')
  };
}

// Helper functions
function getWeekNumber(date: Date): string {
  const year = date.getFullYear();
  const week = Math.ceil((date.getTime() - new Date(year, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

function calculateGrowthRate(data: any[], field: string): number {
  if (data.length < 2) return 0;
  
  const first = data[0][field];
  const last = data[data.length - 1][field];
  
  if (first === 0) return last > 0 ? 100 : 0;
  
  return Math.round(((last - first) / first) * 100);
} 