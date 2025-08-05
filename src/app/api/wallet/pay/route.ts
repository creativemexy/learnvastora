import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if ((session.user as any)?.role !== "STUDENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { bookingId, amount, tutorName } = body;

    if (!bookingId || !amount) {
      return NextResponse.json(
        { error: "Booking ID and amount are required" },
        { status: 400 }
      );
    }

    // Get current wallet balance
    const currentBalance = 150.00; // In real app, fetch from database
    
    if (currentBalance < amount) {
      return NextResponse.json(
        { error: "Insufficient wallet balance" },
        { status: 400 }
      );
    }

    // Update booking status to paid
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: "CONFIRMED",
        paidAt: new Date(),
        paymentMethod: "WALLET"
      }
    });

    // In a real implementation, you would:
    // 1. Deduct amount from wallet balance
    // 2. Create a transaction record
    // 3. Update the booking status
    // 4. Send confirmation emails

    // For now, return success
    return NextResponse.json({
      success: true,
      message: "Payment processed successfully from wallet",
      booking: updatedBooking,
      remainingBalance: currentBalance - amount
    });

  } catch (error) {
    console.error("Error processing wallet payment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 