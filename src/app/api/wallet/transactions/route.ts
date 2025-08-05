import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if ((session.user as any)?.role !== "STUDENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userId = (session.user as any).id;

    // Get real payment transactions
    const payments = await prisma.payment.findMany({
      where: {
        userId
      },
      include: {
        booking: {
          include: {
            tutor: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20 // Limit to recent 20 transactions
    });

    // Transform payments into transaction format
    const transactions = payments.map(payment => ({
      id: payment.id,
      amount: payment.amount,
      currency: "USD",
      status: payment.status.toLowerCase(),
      type: payment.status === 'PAID' ? 'payment' : payment.status === 'FAILED' ? 'refund' : 'pending',
      description: payment.booking ? 
        `Session with ${payment.booking.tutor.name}` : 
        'Payment transaction',
      tutorName: payment.booking?.tutor.name || 'Unknown Tutor',
      createdAt: payment.createdAt.toISOString(),
      bookingId: payment.bookingId,
      paymentMethod: payment.booking?.paymentMethod || 'Unknown'
    }));

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 