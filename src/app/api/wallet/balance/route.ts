import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export async function GET() {
    const session = await getServerSession(authOptions);
  if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

  try {
    // Calculate wallet balance from payments
    const payments = await prisma.payment.findMany({
      where: { 
        userId,
        status: 'PAID'
      },
      select: {
        amount: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calculate total balance (sum of all paid payments)
    const balance = payments.reduce((total, payment) => total + payment.amount, 0);
    const lastUpdated = payments.length > 0 ? payments[0].createdAt : new Date();

    return NextResponse.json({ 
      balance: balance,
      currency: 'NGN', // Using Nigerian Naira as per project requirements
      lastUpdated: lastUpdated.toISOString(),
    });
  } catch (error) {
    console.error("Error fetching wallet balance:", error);
    return NextResponse.json({ error: "Failed to fetch wallet balance" }, { status: 500 });
  }
} 