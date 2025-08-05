import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
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

    const { amount, bankAccountId } = await req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid withdrawal amount' }, { status: 400 });
    }

    // Get user's payout settings to check minimum amount
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId: user.id }
    });

    let payoutSettings = {};
    if (tutorProfile?.payoutSettings) {
      try {
        payoutSettings = typeof tutorProfile.payoutSettings === "string" 
          ? JSON.parse(tutorProfile.payoutSettings) 
          : tutorProfile.payoutSettings;
      } catch {
        payoutSettings = {};
      }
    }

    const settings = payoutSettings as any;
    const minPayoutAmount = settings.minPayoutAmount || 50;

    if (amount < minPayoutAmount) {
      return NextResponse.json({ 
        error: `Minimum withdrawal amount is ₦${minPayoutAmount}` 
      }, { status: 400 });
    }

    // Calculate available balance
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

    const totalPayouts = await prisma.payout.aggregate({
      where: {
        tutorId: user.id,
        status: { in: ['COMPLETED', 'PENDING'] }
      },
      _sum: {
        amount: true
      }
    });

    const totalEarningsAmount = totalEarnings._sum.amount || 0;
    const totalPayoutsAmount = totalPayouts._sum.amount || 0;
    const availableBalance = totalEarningsAmount - totalPayoutsAmount;

    if (amount > availableBalance) {
      return NextResponse.json({ 
        error: 'Insufficient balance' 
      }, { status: 400 });
    }

    // Generate unique reference number
    const reference = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create payout record
    const payout = await prisma.payout.create({
      data: {
        tutorId: user.id,
        bankAccountId: bankAccountId || null,
        amount: amount,
        status: 'PENDING',
        method: 'bank',
        reference: reference,
        notes: 'Withdrawal request'
      }
    });

    return NextResponse.json({
      success: true,
      payout: {
        id: payout.id,
        amount: payout.amount,
        reference: payout.reference,
        status: payout.status
      }
    });

  } catch (error) {
    console.error('Error processing withdrawal:', error);
    return NextResponse.json(
      { error: 'Failed to process withdrawal' },
      { status: 500 }
    );
  }
} 