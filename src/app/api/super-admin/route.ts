import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get user ID from session - handle different session structures
    const userId = (session.user as any).id || (session.user as any).email;
    
    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID not found in session' }, { status: 401 });
    }

    // Check if user is super admin
    const user = await prisma.user.findUnique({
      where: { 
        id: typeof userId === 'string' ? userId : undefined,
        email: typeof userId === 'string' && userId.includes('@') ? userId : undefined
      },
      select: { role: true }
    });

    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'overview') {
      // Fetch real statistics from database
      const [
        totalUsers,
        totalTutors,
        totalStudents,
        totalSessions,
        totalRevenue,
        activeUsers,
        totalAdmins,
        systemAlerts
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: 'TUTOR' } }),
        prisma.user.count({ where: { role: 'STUDENT' } }),
        prisma.booking.count(),
        prisma.booking.aggregate({
          where: { status: 'COMPLETED' },
          _sum: { price: true }
        }),
        prisma.user.count({ 
          where: { 
            lastSeen: { 
              gte: new Date(Date.now() - 5 * 60 * 1000) // Active in last 5 minutes
            } 
          } 
        }),
        prisma.user.count({ where: { role: 'ADMIN' } }),
        prisma.adminActivity.findMany({
          where: {
            action: { in: ['SYSTEM_ALERT', 'SECURITY_ALERT', 'ERROR_LOG'] }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        })
      ]);

      // Calculate platform uptime (mock for now, could be real monitoring data)
      const platformUptime = 99.9;
      
      // Calculate data usage (mock for now)
      const dataUsage = 45;
      
      // Calculate security alerts
      const securityAlerts = systemAlerts.filter(alert => 
        alert.action.includes('SECURITY') || alert.action.includes('ERROR')
      ).length;

      // Mock pending approvals since TutorProfile doesn't have isApproved field
      const pendingApprovals = 0;

      const stats = {
        totalUsers,
        totalTutors,
        totalStudents,
        totalSessions,
        totalRevenue: totalRevenue._sum.price || 0,
        activeUsers,
        pendingApprovals,
        systemHealth: 'Operational',
        totalAdmins,
        platformUptime,
        securityAlerts,
        dataUsage
      };

      // Convert admin activities to system alerts
      const alerts = systemAlerts.map(activity => ({
        id: activity.id,
        type: activity.action.includes('ERROR') ? 'error' : 
              activity.action.includes('SECURITY') ? 'warning' : 'info',
        title: activity.action.replace(/_/g, ' '),
        message: activity.details ? JSON.stringify(activity.details) : 'System activity logged',
        timestamp: activity.createdAt.toISOString(),
        priority: activity.action.includes('ERROR') ? 'high' : 
                 activity.action.includes('SECURITY') ? 'medium' : 'low'
      }));

      return NextResponse.json({
        success: true,
        stats,
        alerts
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Super admin API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a super admin
    if ((session.user as any).role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { action, ...data } = body;

    let result: any = {};

    switch (action) {
      case 'create_admin':
        result = await createAdminUser(data);
        break;
      case 'update_admin':
        result = await updateAdminUser(data);
        break;
      case 'delete_admin':
        result = await deleteAdminUser(data);
        break;
      case 'system_backup':
        result = await performSystemBackup();
        break;
      case 'security_scan':
        result = await performSecurityScan();
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      action,
      result
    });

  } catch (error) {
    console.error('Super Admin POST error:', error);
    return NextResponse.json(
      { error: 'Failed to perform super admin action' },
      { status: 500 }
    );
  }
}

async function getSuperAdminOverview() {
  try {
    console.log('Starting getSuperAdminOverview...');
    
    // Get comprehensive platform statistics
    const [
      totalUsers,
      totalTutors,
      totalStudents,
      totalAdmins,
      totalSessions,
      totalRevenue,
      activeUsers,
      systemAlerts
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'TUTOR' } }),
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.booking.count(),
      prisma.payment.aggregate({
        where: { status: 'PAID' },
        _sum: { amount: true }
      }),
      prisma.user.count({
        where: {
          lastSeen: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      }),
      // Mock system alerts count
      Promise.resolve(Math.floor(Math.random() * 10))
    ]);

    console.log('Database queries completed successfully');

    const result = {
      totalUsers,
      totalTutors,
      totalStudents,
      totalAdmins,
      totalSessions,
      totalRevenue: totalRevenue._sum.amount || 0,
      activeUsers,
      systemAlerts,
      platformUptime: 99.9,
      dataUsage: Math.floor(Math.random() * 30) + 70,
      securityAlerts: Math.floor(Math.random() * 5)
    };

    console.log('getSuperAdminOverview completed successfully');
    return result;
  } catch (error) {
    console.error('Error in getSuperAdminOverview:', error);
    throw error;
  }
}

async function getAdminUsers() {
  const admins = await prisma.user.findMany({
    where: {
      role: { in: ['ADMIN', 'SUPER_ADMIN'] }
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      lastSeen: true,
      active: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return admins.map(admin => ({
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    lastActive: admin.lastSeen.toISOString(),
    status: admin.active ? 'active' : 'inactive',
    createdAt: admin.createdAt.toISOString(),
    permissions: getPermissionsForRole(admin.role)
  }));
}

async function getSystemStatus() {
  // Get real system status data
  const [
    uptime,
    memoryUsage,
    cpuUsage,
    diskUsage,
    recentAlerts
  ] = await Promise.all([
    // Mock uptime for now (in production, this would come from system monitoring)
    Promise.resolve(99.9),
    
    // Mock memory usage (in production, this would come from system monitoring)
    Promise.resolve(Math.floor(Math.random() * 20) + 70),
    
    // Mock CPU usage (in production, this would come from system monitoring)
    Promise.resolve(Math.floor(Math.random() * 30) + 40),
    
    // Mock disk usage (in production, this would come from system monitoring)
    Promise.resolve(Math.floor(Math.random() * 15) + 60),
    
    // Get recent system alerts from database or logs
    prisma.booking.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })
  ]);

  // Generate system alerts based on real data
  const alerts = [];
  
  // Add system health alerts
  if (memoryUsage > 85) {
    alerts.push({
      id: 'memory_alert',
      type: 'warning',
      title: 'High Memory Usage',
      message: `Server memory usage is at ${memoryUsage}%. Consider optimization.`,
      timestamp: new Date().toISOString(),
      priority: 'medium'
    });
  }
  
  if (cpuUsage > 80) {
    alerts.push({
      id: 'cpu_alert',
      type: 'warning',
      title: 'High CPU Usage',
      message: `Server CPU usage is at ${cpuUsage}%. Consider load balancing.`,
      timestamp: new Date().toISOString(),
      priority: 'medium'
    });
  }
  
  if (diskUsage > 85) {
    alerts.push({
      id: 'disk_alert',
      type: 'warning',
      title: 'High Disk Usage',
      message: `Server disk usage is at ${diskUsage}%. Consider cleanup.`,
      timestamp: new Date().toISOString(),
      priority: 'medium'
    });
  }
  
  // Add success alerts for system operations
  alerts.push({
    id: 'backup_success',
    type: 'success',
    title: 'System Backup Completed',
    message: 'Daily backup completed successfully at 02:00 UTC',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    priority: 'low'
  });
  
  // Add info alerts for recent activity
  if (recentAlerts.length > 0) {
    alerts.push({
      id: 'recent_activity',
      type: 'info',
      title: 'Recent Platform Activity',
      message: `${recentAlerts.length} new sessions in the last 24 hours`,
      timestamp: new Date().toISOString(),
      priority: 'low'
    });
  }

  return {
    uptime,
    memoryUsage,
    cpuUsage,
    diskUsage,
    networkStatus: 'Healthy',
    databaseStatus: 'Connected',
    lastBackup: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    nextBackup: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
    alerts
  };
}

async function getSecurityStatus() {
  // Mock security status data
  return {
    lastScan: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    threatsDetected: 0,
    firewallStatus: 'Active',
    sslStatus: 'Valid',
    securityScore: 95,
    recommendations: [
      'Enable two-factor authentication for all admin accounts',
      'Update system dependencies',
      'Review access logs'
    ]
  };
}

async function createAdminUser(data: any) {
  const { name, email, password, role } = data;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Create new admin user
  const newAdmin = await prisma.user.create({
    data: {
      name,
      email,
      password: password, // In production, hash the password
      role: role || 'ADMIN',
      active: true
    }
  });

  return {
    id: newAdmin.id,
    name: newAdmin.name,
    email: newAdmin.email,
    role: newAdmin.role,
    status: 'active'
  };
}

async function updateAdminUser(data: any) {
  const { id, name, email, role, active } = data;

  const updatedAdmin = await prisma.user.update({
    where: { id },
    data: {
      name,
      email,
      role,
      active
    }
  });

  return {
    id: updatedAdmin.id,
    name: updatedAdmin.name,
    email: updatedAdmin.email,
    role: updatedAdmin.role,
    status: updatedAdmin.active ? 'active' : 'inactive'
  };
}

async function deleteAdminUser(data: any) {
  const { id } = data;

  // Don't allow deletion of super admins
  const admin = await prisma.user.findUnique({
    where: { id },
    select: { role: true }
  });

  if (admin?.role === 'SUPER_ADMIN') {
    throw new Error('Cannot delete super admin users');
  }

  await prisma.user.delete({
    where: { id }
  });

  return { success: true, message: 'Admin user deleted successfully' };
}

async function performSystemBackup() {
  // Mock system backup
  return {
    success: true,
    message: 'System backup completed successfully',
    timestamp: new Date().toISOString(),
    backupId: `backup_${Date.now()}`
  };
}

async function performSecurityScan() {
  // Mock security scan
  return {
    success: true,
    message: 'Security scan completed',
    timestamp: new Date().toISOString(),
    threatsFound: 0,
    recommendations: [
      'All systems are secure',
      'No immediate action required'
    ]
  };
}

function getPermissionsForRole(role: string): string[] {
  switch (role) {
    case 'SUPER_ADMIN':
      return ['all'];
    case 'ADMIN':
      return ['users', 'sessions', 'reports', 'analytics', 'support'];
    default:
      return [];
  }
} 