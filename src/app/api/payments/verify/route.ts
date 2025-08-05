import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";
import { paystackClient } from "@/lib/payment-gateways";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const reference = searchParams.get('reference');

    if (!reference) {
      return NextResponse.json({ error: "Payment reference required" }, { status: 400 });
    }

    // Find booking by payment reference
    const booking = await prisma.booking.findFirst({
      where: { paymentReference: reference },
      include: {
        student: true,
        tutor: true,
        payment: true
      }
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Verify payment with Paystack
    if (paystackClient && booking.paymentMethod === 'PAYSTACK') {
      try {
        const transaction = await paystackClient.transaction.verify(reference);
        
        if (transaction.status && transaction.data.status === 'success') {
          // Update booking status
          await prisma.booking.update({
            where: { id: booking.id },
            data: { 
              status: "CONFIRMED",
              paidAt: new Date()
            }
          });

          // Create or update payment record
          await prisma.payment.upsert({
            where: { bookingId: booking.id },
            update: {
              status: "PAID",
              amount: transaction.data.amount / 100 // Convert from kobo to naira
            },
            create: {
              userId: booking.studentId,
              bookingId: booking.id,
              amount: transaction.data.amount / 100,
              status: "PAID"
            }
          });

          return NextResponse.json({
            success: true,
            message: "Payment verified successfully",
            booking: {
              id: booking.id,
              scheduledAt: booking.scheduledAt,
              status: "CONFIRMED",
              tutor: booking.tutor,
              student: booking.student
            }
          });
        } else {
          return NextResponse.json({
            success: false,
            error: "Payment verification failed"
          });
        }
      } catch (error) {
        console.error("Paystack verification error:", error);
        return NextResponse.json({
          success: false,
          error: "Payment verification failed"
        });
      }
    }

    // For other payment methods or if Paystack is not configured
    return NextResponse.json({
      success: true,
      message: "Payment reference found",
      booking: {
        id: booking.id,
        scheduledAt: booking.scheduledAt,
        status: booking.status,
        tutor: booking.tutor,
        student: booking.student
      }
    });

  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Failed to verify payment" 
    }, { status: 500 });
  }
} 