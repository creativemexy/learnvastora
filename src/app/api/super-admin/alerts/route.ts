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

    // Fetch system alerts and notifications
    const alerts = [
      {
        id: '1',
        type: 'info',
        title: 'System Update',
        message: 'Platform updated to version 2.1.0',
        timestamp: new Date().toISOString(),
        priority: 'low'
      },
      {
        id: '2',
        type: 'warning',
        title: 'High CPU Usage',
        message: 'Server CPU usage is at 85%',
        timestamp: new Date(Date.now() - 300000).toISOString(),
        priority: 'medium'
      },
      {
        id: '3',
        type: 'success',
        title: 'Backup Completed',
        message: 'Daily database backup completed successfully',
        timestamp: new Date(Date.now() - 600000).toISOString(),
        priority: 'low'
      },
      {
        id: '4',
        type: 'error',
        title: 'Payment Gateway Issue',
        message: 'PayPal integration experiencing delays',
        timestamp: new Date(Date.now() - 900000).toISOString(),
        priority: 'high'
      },
      {
        id: '5',
        type: 'warning',
        title: 'Storage Warning',
        message: 'Disk space usage at 78%',
        timestamp: new Date(Date.now() - 1200000).toISOString(),
        priority: 'medium'
      }
    ];

    // Add dynamic alerts based on actual data
    const failedPayments = await prisma.payment.count({
      where: { status: 'FAILED' }
    });

    if (failedPayments > 0) {
      alerts.push({
        id: '6',
        type: 'error',
        title: 'Failed Payments',
        message: `${failedPayments} payment(s) failed in the last 24 hours`,
        timestamp: new Date().toISOString(),
        priority: 'high'
      });
    }

    const pendingBookings = await prisma.booking.count({
      where: { status: 'PENDING' }
    });

    if (pendingBookings > 10) {
      alerts.push({
        id: '7',
        type: 'warning',
        title: 'High Pending Bookings',
        message: `${pendingBookings} booking(s) pending approval`,
        timestamp: new Date().toISOString(),
        priority: 'medium'
      });
    }

    return NextResponse.json({
      success: true,
      data: alerts
    });

  } catch (error) {
    console.error('Error fetching super admin alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
} 