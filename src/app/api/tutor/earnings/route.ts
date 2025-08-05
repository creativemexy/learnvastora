import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || (session.user as any).role !== "TUTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tutorId = (session.user as any).id;

  // Fetch completed and pending bookings for this tutor
  const bookings = await prisma.booking.findMany({
    where: { tutorId },
    include: {
      student: true,
    },
    orderBy: { scheduledAt: "desc" },
  });

  // Calculate earnings
  let totalEarnings = 0;
  let thisMonth = 0;
  let lastMonth = 0;
  let pendingPayments = 0;
  let completedSessions = 0;
  let sumPerSession = 0;
  const now = new Date();
  const thisMonthNum = now.getMonth();
  const thisYear = now.getFullYear();
  const lastMonthNum = thisMonthNum === 0 ? 11 : thisMonthNum - 1;
  const lastMonthYear = thisMonthNum === 0 ? thisYear - 1 : thisYear;

  const paymentHistory = bookings.map((b) => {
    // ₦4,000 for every 30-minute completed session
    const amount = 4000;
    let status: 'completed' | 'pending' | 'in_progress' = 'completed';
    if (b.status === 'PENDING') status = 'pending';
    if (b.status === 'IN_PROGRESS') status = 'in_progress';
    if (b.status === 'COMPLETED') {
      totalEarnings += amount;
      completedSessions++;
      sumPerSession += amount;
      const d = new Date(b.scheduledAt);
      if (d.getFullYear() === thisYear && d.getMonth() === thisMonthNum) {
        thisMonth += amount;
      }
      if (d.getFullYear() === lastMonthYear && d.getMonth() === lastMonthNum) {
        lastMonth += amount;
      }
    }
    if (b.status === 'PENDING') {
      pendingPayments += amount;
    }
    return {
      id: b.id,
      date: b.scheduledAt,
      amount,
      status,
      sessionDetails: `30-min session with ${b.student?.name || 'Student'}`,
    };
  });

  const averagePerSession = completedSessions > 0 ? sumPerSession / completedSessions : 0;

  return NextResponse.json({
    earnings: {
      totalEarnings,
      thisMonth,
      lastMonth,
      pendingPayments,
      completedSessions,
      averagePerSession,
    },
    paymentHistory,
  });
} 