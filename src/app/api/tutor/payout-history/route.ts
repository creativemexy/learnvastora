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

    // Get query parameters for filtering
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    let whereClause: any = { tutorId: user.id };

    if (status && status !== 'all') {
      whereClause.status = status;
    }

    // Fetch payout history from database
    const payouts = await prisma.payout.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        bankAccount: true
      }
    });

    // Transform data to match frontend expectations
    const transformedPayouts = payouts.map(payout => ({
      id: payout.id,
      amount: payout.amount,
      status: payout.status,
      method: payout.method,
      createdAt: payout.createdAt.toISOString(),
      processedAt: payout.processedAt?.toISOString(),
      reference: payout.reference,
      bankAccount: payout.bankAccount ? {
        bankName: payout.bankAccount.bankName,
        accountNumber: payout.bankAccount.accountNumber
      } : null
    }));

    return NextResponse.json(transformedPayouts);

  } catch (error) {
    console.error('Error fetching payout history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payout history' },
      { status: 500 }
    );
  }
} 