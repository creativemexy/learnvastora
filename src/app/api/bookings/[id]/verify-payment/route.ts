import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const bookingId = params.id;

    // Get the booking with payment information
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        student: true,
        tutor: true,
        payment: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Check if user is a participant in this booking
    const userId = (session.user as any).id;
    if (booking.studentId !== userId && booking.tutorId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check payment status
    const paymentStatus = {
      isPaid: !!booking.paidAt,
      paymentMethod: booking.paymentMethod,
      paymentReference: booking.paymentReference,
      paidAt: booking.paidAt,
      amount: booking.payment?.amount || 0,
      status: booking.status,
    };

    return NextResponse.json(paymentStatus);
  } catch (error) {
    console.error("Error verifying payment:", error);
    return NextResponse.json(
      { error: "Failed to verify payment" },
      { status: 500 }
    );
  }
} 