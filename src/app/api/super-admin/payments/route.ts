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

    if ((session.user as any).role !== 'SUPER_ADMIN' && (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin or Super admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const type = searchParams.get('type') || ''; // 'payment' or 'payout'
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const userId = searchParams.get('userId') || '';

    // Build where clause for payments
    let paymentWhereClause: any = {};

    if (search) {
      paymentWhereClause.OR = [
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { id: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (status) {
      paymentWhereClause.status = status.toUpperCase();
    }

    if (dateFrom) {
      paymentWhereClause.createdAt = {
        ...paymentWhereClause.createdAt,
        gte: new Date(dateFrom)
      };
    }

    if (dateTo) {
      paymentWhereClause.createdAt = {
        ...paymentWhereClause.createdAt,
        lte: new Date(dateTo)
      };
    }

    if (userId) {
      paymentWhereClause.userId = userId;
    }

    // Build where clause for payouts
    let payoutWhereClause: any = {};

    if (search) {
      payoutWhereClause.OR = [
        { tutor: { name: { contains: search, mode: 'insensitive' } } },
        { tutor: { email: { contains: search, mode: 'insensitive' } } },
        { reference: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (status) {
      payoutWhereClause.status = status.toUpperCase();
    }

    if (dateFrom) {
      payoutWhereClause.createdAt = {
        ...payoutWhereClause.createdAt,
        gte: new Date(dateFrom)
      };
    }

    if (dateTo) {
      payoutWhereClause.createdAt = {
        ...payoutWhereClause.createdAt,
        lte: new Date(dateTo)
      };
    }

    if (userId) {
      payoutWhereClause.tutorId = userId;
    }

    // Get data based on type filter
    let payments: any[] = [];
    let payouts: any[] = [];
    let totalPayments = 0;
    let totalPayouts = 0;

    if (type === 'payment' || type === '') {
      [payments, totalPayments] = await Promise.all([
        prisma.payment.findMany({
          where: paymentWhereClause,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                photo: true
              }
            },
            booking: {
              select: {
                id: true,
                scheduledAt: true,
                duration: true,
                tutor: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit
        }),
        prisma.payment.count({ where: paymentWhereClause })
      ]);
    }

    if (type === 'payout' || type === '') {
      [payouts, totalPayouts] = await Promise.all([
        prisma.payout.findMany({
          where: payoutWhereClause,
          include: {
            tutor: {
              select: {
                id: true,
                name: true,
                email: true,
                photo: true
              }
            },
            bankAccount: {
              select: {
                id: true,
                bankName: true,
                accountNumber: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit
        }),
        prisma.payout.count({ where: payoutWhereClause })
      ]);
    }

    // Transform payments data
    const transformedPayments = payments.map(payment => ({
      id: payment.id,
      type: 'payment',
      user: payment.user,
      amount: payment.amount,
      status: payment.status,
      createdAt: payment.createdAt,
      booking: payment.booking ? {
        id: payment.booking.id,
        scheduledAt: payment.booking.scheduledAt,
        duration: payment.booking.duration,
        tutor: payment.booking.tutor
      } : null
    }));

    // Transform payouts data
    const transformedPayouts = payouts.map(payout => ({
      id: payout.id,
      type: 'payout',
      tutor: payout.tutor,
      amount: payout.amount,
      status: payout.status,
      method: payout.method,
      reference: payout.reference,
      createdAt: payout.createdAt,
      processedAt: payout.processedAt,
      notes: payout.notes,
      bankAccount: payout.bankAccount
    }));

    // Combine and sort by date
    const allTransactions = [...transformedPayments, ...transformedPayouts]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    // Get financial statistics
    const paymentStats = await prisma.payment.aggregate({
      _count: { id: true },
      _sum: { amount: true }
    });

    const payoutStats = await prisma.payout.aggregate({
      _count: { id: true },
      _sum: { amount: true }
    });

    const statusStats = await prisma.payment.groupBy({
      by: ['status'],
      _count: { id: true },
      _sum: { amount: true }
    });

    const payoutStatusStats = await prisma.payout.groupBy({
      by: ['status'],
      _count: { id: true },
      _sum: { amount: true }
    });

    const todayPayments = await prisma.payment.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999))
        }
      }
    });

    const todayPayouts = await prisma.payout.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999))
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        transactions: allTransactions,
        statistics: {
          totalPayments: paymentStats._count.id,
          totalPaymentAmount: paymentStats._sum.amount || 0,
          totalPayouts: payoutStats._count.id,
          totalPayoutAmount: payoutStats._sum.amount || 0,
          netRevenue: (paymentStats._sum.amount || 0) - (payoutStats._sum.amount || 0),
          todayPayments,
          todayPayouts,
          paymentStatusBreakdown: statusStats.map(stat => ({
            status: stat.status,
            count: stat._count.id,
            amount: stat._sum.amount || 0
          })),
          payoutStatusBreakdown: payoutStatusStats.map(stat => ({
            status: stat.status,
            count: stat._count.id,
            amount: stat._sum.amount || 0
          }))
        },
        pagination: {
          page,
          limit,
          total: totalPayments + totalPayouts,
          totalPages: Math.ceil((totalPayments + totalPayouts) / limit)
        }
      }
    });

  } catch (error) {
    console.error('Payment management API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment data' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if ((session.user as any).role !== 'SUPER_ADMIN' && (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin or Super admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { transactionId, type, action, updates } = body;

    if (!transactionId || !type || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let result: any = {};

    if (type === 'payment') {
      switch (action) {
        case 'refund':
          result = await prisma.payment.update({
            where: { id: transactionId },
            data: { status: 'FAILED' }
          });
          break;
        
        case 'update':
          if (!updates) {
            return NextResponse.json({ error: 'Missing updates' }, { status: 400 });
          }
          result = await prisma.payment.update({
            where: { id: transactionId },
            data: updates
          });
          break;
        
        default:
          return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
      }
    } else if (type === 'payout') {
      switch (action) {
        case 'approve':
          result = await prisma.payout.update({
            where: { id: transactionId },
            data: { 
              status: 'PROCESSING',
              processedAt: new Date()
            }
          });
          break;
        
        case 'complete':
          result = await prisma.payout.update({
            where: { id: transactionId },
            data: { 
              status: 'COMPLETED',
              processedAt: new Date()
            }
          });
          break;
        
        case 'reject':
          result = await prisma.payout.update({
            where: { id: transactionId },
            data: { 
              status: 'FAILED',
              notes: updates?.notes || 'Rejected by admin'
            }
          });
          break;
        
        case 'update':
          if (!updates) {
            return NextResponse.json({ error: 'Missing updates' }, { status: 400 });
          }
          result = await prisma.payout.update({
            where: { id: transactionId },
            data: updates
          });
          break;
        
        default:
          return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: 'Invalid transaction type' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      action,
      result
    });

  } catch (error) {
    console.error('Payment update error:', error);
    return NextResponse.json(
      { error: 'Failed to update payment' },
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

    if ((session.user as any).role !== 'SUPER_ADMIN' && (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin or Super admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { type, data } = body;

    if (!type || !data) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let result: any = {};

    if (type === 'payout') {
      const { tutorId, amount, method, notes } = data;

      if (!tutorId || !amount || !method) {
        return NextResponse.json({ error: 'Missing payout data' }, { status: 400 });
      }

      // Generate unique reference
      const reference = `PAYOUT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      result = await prisma.payout.create({
        data: {
          tutorId,
          amount: parseFloat(amount),
          method,
          reference,
          notes,
          status: 'PENDING'
        }
      });
    } else {
      return NextResponse.json({ error: 'Invalid transaction type' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Payment creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
} 