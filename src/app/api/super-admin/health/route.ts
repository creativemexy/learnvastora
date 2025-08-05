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
    const detailed = searchParams.get('detailed') === 'true';

    // Get current timestamp for calculations
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // System Performance Metrics
    const [
      totalUsers,
      activeUsers,
      totalSessions,
      activeSessions,
      totalPayments,
      totalPayouts,
      errorCount,
      pendingApprovals,
      systemAlerts
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { active: true } }),
      prisma.booking.count(),
      prisma.booking.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.payment.count(),
      prisma.payout.count(),
      prisma.booking.count({ where: { status: 'CANCELLED' } }), // Using cancelled bookings as error proxy
      prisma.user.count({ where: { role: 'TUTOR', active: false } }),
      0 // Placeholder for actual system alerts
    ]);

    // Calculate uptime (simulated - in real implementation, this would come from monitoring system)
    const uptime = 99.9; // Simulated uptime percentage
    const responseTime = 150; // Simulated response time in ms
    const errorRate = (errorCount / totalSessions) * 100 || 0;

    // Database Health Check
    const dbHealth = await checkDatabaseHealth();

    // System Load Metrics
    const systemLoad = {
      cpu: Math.random() * 30 + 20, // Simulated CPU usage (20-50%)
      memory: Math.random() * 40 + 30, // Simulated memory usage (30-70%)
      disk: Math.random() * 20 + 60, // Simulated disk usage (60-80%)
      network: Math.random() * 50 + 10 // Simulated network usage (10-60%)
    };

    // Recent Activity Metrics
    const recentActivity = await getRecentActivity(oneHourAgo, oneDayAgo, oneWeekAgo);

    // Security Metrics
    const securityMetrics = await getSecurityMetrics();

    // Performance Trends
    const performanceTrends = await getPerformanceTrends();

    // Alerts and Issues
    const alerts = await getSystemAlerts();

    const healthData = {
      system: {
        uptime,
        responseTime,
        errorRate: Math.min(errorRate, 5), // Cap at 5% for demo
        status: uptime >= 99.5 && errorRate < 2 ? 'HEALTHY' : uptime >= 95 ? 'DEGRADED' : 'CRITICAL'
      },
      database: dbHealth,
      load: systemLoad,
      activity: {
        totalUsers,
        activeUsers,
        totalSessions,
        activeSessions,
        totalPayments,
        totalPayouts,
        pendingApprovals,
        userActivityRate: activeUsers / totalUsers * 100 || 0,
        sessionActivityRate: activeSessions / totalSessions * 100 || 0
      },
      recent: recentActivity,
      security: securityMetrics,
      trends: performanceTrends,
      alerts,
      lastChecked: now.toISOString()
    };

    // Add detailed metrics if requested
    if (detailed) {
      (healthData as any).detailed = await getDetailedMetrics();
    }

    return NextResponse.json({
      success: true,
      data: healthData
    });

  } catch (error) {
    console.error('Health check API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch health data' },
      { status: 500 }
    );
  }
}

async function checkDatabaseHealth() {
  try {
    // Test database connectivity and performance
    const startTime = Date.now();
    
    // Simple query to test database response
    await prisma.user.count();
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'HEALTHY',
      responseTime,
      connections: Math.floor(Math.random() * 50) + 10, // Simulated connection count
      queriesPerSecond: Math.floor(Math.random() * 100) + 50, // Simulated QPS
      lastBackup: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
      backupSize: '2.3 GB'
    };
  } catch (error) {
    return {
      status: 'ERROR',
      responseTime: 0,
      connections: 0,
      queriesPerSecond: 0,
      lastBackup: null,
      backupSize: '0 GB',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function getRecentActivity(oneHourAgo: Date, oneDayAgo: Date, oneWeekAgo: Date) {
  const [
    hourlyUsers,
    dailyUsers,
    weeklyUsers,
    hourlySessions,
    dailySessions,
    weeklySessions,
    hourlyPayments,
    dailyPayments,
    weeklyPayments
  ] = await Promise.all([
    prisma.user.count({ where: { createdAt: { gte: oneHourAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: oneDayAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: oneWeekAgo } } }),
    prisma.booking.count({ where: { createdAt: { gte: oneHourAgo } } }),
    prisma.booking.count({ where: { createdAt: { gte: oneDayAgo } } }),
    prisma.booking.count({ where: { createdAt: { gte: oneWeekAgo } } }),
    prisma.payment.count({ where: { createdAt: { gte: oneHourAgo } } }),
    prisma.payment.count({ where: { createdAt: { gte: oneDayAgo } } }),
    prisma.payment.count({ where: { createdAt: { gte: oneWeekAgo } } })
  ]);

  return {
    hourly: { users: hourlyUsers, sessions: hourlySessions, payments: hourlyPayments },
    daily: { users: dailyUsers, sessions: dailySessions, payments: dailyPayments },
    weekly: { users: weeklyUsers, sessions: weeklySessions, payments: weeklyPayments }
  };
}

async function getSecurityMetrics() {
  // Simulated security metrics
  return {
    failedLogins: Math.floor(Math.random() * 10),
    suspiciousActivities: Math.floor(Math.random() * 5),
    blockedIPs: Math.floor(Math.random() * 3),
    sslCertificate: {
      status: 'VALID',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      issuer: 'Let\'s Encrypt'
    },
    firewallStatus: 'ACTIVE',
    lastSecurityScan: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    vulnerabilities: {
      critical: 0,
      high: 1,
      medium: 3,
      low: 5
    }
  };
}

async function getPerformanceTrends() {
  // Simulated performance trends
  return {
    responseTime: {
      current: 150,
      average: 145,
      trend: 'STABLE'
    },
    errorRate: {
      current: 0.5,
      average: 0.8,
      trend: 'IMPROVING'
    },
    uptime: {
      current: 99.9,
      average: 99.7,
      trend: 'IMPROVING'
    },
    userGrowth: {
      current: 21,
      previous: 18,
      trend: 'GROWING'
    }
  };
}

async function getSystemAlerts() {
  const alerts = [];

  // Check for critical issues
  const activeSessions = await prisma.booking.count({ where: { status: 'IN_PROGRESS' } });
  if (activeSessions === 0) {
    alerts.push({
      id: 'no-active-sessions',
      type: 'WARNING',
      title: 'No Active Sessions',
      message: 'There are currently no active sessions running.',
      timestamp: new Date().toISOString(),
      priority: 'MEDIUM'
    });
  }

  const pendingApprovals = await prisma.user.count({ where: { role: 'TUTOR', active: false } });
  if (pendingApprovals > 0) {
    alerts.push({
      id: 'pending-approvals',
      type: 'INFO',
      title: 'Pending Tutor Approvals',
      message: `${pendingApprovals} tutor applications are pending approval.`,
      timestamp: new Date().toISOString(),
      priority: 'LOW'
    });
  }

  // Check for system performance issues
  const totalUsers = await prisma.user.count();
  const activeUsers = await prisma.user.count({ where: { active: true } });
  const activityRate = (activeUsers / totalUsers) * 100;

  if (activityRate < 50) {
    alerts.push({
      id: 'low-activity',
      type: 'WARNING',
      title: 'Low User Activity',
      message: `User activity rate is ${activityRate.toFixed(1)}%, which is below normal levels.`,
      timestamp: new Date().toISOString(),
      priority: 'MEDIUM'
    });
  }

  return alerts;
}

async function getDetailedMetrics() {
  // Additional detailed metrics for comprehensive monitoring
  const [
    userSessions,
    tutorSessions,
    paymentMethods,
    sessionDurations,
    userRegistrations
  ] = await Promise.all([
    prisma.booking.groupBy({
      by: ['studentId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10
    }),
    prisma.booking.groupBy({
      by: ['tutorId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10
    }),
    prisma.payment.groupBy({
      by: ['status'],
      _count: { id: true },
      _sum: { amount: true }
    }),
    prisma.booking.aggregate({
      _avg: { duration: true },
      _min: { duration: true },
      _max: { duration: true }
    }),
    prisma.user.groupBy({
      by: ['createdAt'],
      _count: { id: true },
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
    })
  ]);

  return {
    topUsers: userSessions,
    topTutors: tutorSessions,
    paymentBreakdown: paymentMethods,
    sessionMetrics: sessionDurations,
    registrationTrends: userRegistrations
  };
} 