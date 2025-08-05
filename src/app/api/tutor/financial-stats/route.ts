import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user || (user as any).role !== 'TUTOR') {
      return NextResponse.json({ error: 'Access denied. Tutors only.' }, { status: 403 });
    }

    // Calculate current date ranges
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get total earnings from payments
    const totalEarnings = await prisma.payment.aggregate({
      where: {
        booking: {
          tutorId: user.id
        },
        status: 'PAID'
      },
      _sum: {
        amount: true
      }
    });

    // Get this month's earnings
    const thisMonthEarnings = await prisma.payment.aggregate({
      where: {
        booking: {
          tutorId: user.id
        },
        status: 'PAID',
        createdAt: {
          gte: startOfMonth
        }
      },
      _sum: {
        amount: true
      }
    });

    // Get last month's earnings
    const lastMonthEarnings = await prisma.payment.aggregate({
      where: {
        booking: {
          tutorId: user.id
        },
        status: 'PAID',
        createdAt: {
          gte: startOfLastMonth,
          lte: endOfLastMonth
        }
      },
      _sum: {
        amount: true
      }
    });

    // Get pending payouts
    const pendingPayouts = await prisma.payout.aggregate({
      where: {
        tutorId: user.id,
        status: 'PENDING'
      },
      _sum: {
        amount: true
      }
    });

    // Get total payouts
    const totalPayouts = await prisma.payout.aggregate({
      where: {
        tutorId: user.id,
        status: 'COMPLETED'
      },
      _sum: {
        amount: true
      }
    });

    // Calculate available balance (total earnings - total payouts - pending payouts)
    const totalEarningsAmount = totalEarnings._sum.amount || 0;
    const totalPayoutsAmount = totalPayouts._sum.amount || 0;
    const pendingPayoutsAmount = pendingPayouts._sum.amount || 0;
    const availableBalance = totalEarningsAmount - totalPayoutsAmount - pendingPayoutsAmount;

    return NextResponse.json({
      totalEarnings: totalEarningsAmount,
      availableBalance: Math.max(0, availableBalance),
      pendingPayouts: pendingPayoutsAmount,
      totalPayouts: totalPayoutsAmount,
      thisMonthEarnings: thisMonthEarnings._sum.amount || 0,
      lastMonthEarnings: lastMonthEarnings._sum.amount || 0
    });

  } catch (error) {
    console.error('Error fetching financial stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch financial stats' },
      { status: 500 }
    );
  }
} 