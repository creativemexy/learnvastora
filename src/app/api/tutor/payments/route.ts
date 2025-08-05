import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id }
    });

    if (!user || user.role !== "TUTOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get bookings where this user is the tutor and payment is completed
    const payments = await prisma.booking.findMany({
      where: {
        tutorId: user.id,
        status: "CONFIRMED",
        paidAt: { not: null }
      },
      include: {
        student: {
          select: { name: true, email: true }
        }
      },
      orderBy: { paidAt: "desc" },
      take: 20
    });

    // Transform to payment history format
    const paymentHistory = payments.map(booking => ({
      id: booking.id,
      amount: 10.00, // Fixed amount for demo
      status: "PAID",
      createdAt: booking.paidAt,
      studentName: booking.student.name,
      paymentMethod: booking.paymentMethod,
      paymentReference: booking.paymentReference
    }));

    return NextResponse.json(paymentHistory);

  } catch (error) {
    console.error("Error fetching payment history:", error);
    return NextResponse.json({ error: "Failed to fetch payment history" }, { status: 500 });
  }
} 