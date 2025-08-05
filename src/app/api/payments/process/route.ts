import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { paymentMethod, bookingId } = await req.json();

    // Validate required fields
    if (!bookingId) {
      return NextResponse.json({ 
        error: "Booking ID is required" 
      }, { status: 400 });
    }

    if (!paymentMethod) {
      return NextResponse.json({ 
        error: "Payment method is required" 
      }, { status: 400 });
    }

    // Get booking details
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        tutor: true,
        student: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ 
        error: "Booking not found" 
      }, { status: 404 });
    }

    // Verify user is authorized for this booking
    const userId = (session.user as any).id;
    if (booking.studentId !== userId && booking.tutorId !== userId) {
      return NextResponse.json({ 
        error: "Not authorized for this booking" 
      }, { status: 403 });
    }

    // Redirect to appropriate payment gateway
    let paymentUrl = "";
    
    switch (paymentMethod) {
      case "PAYSTACK":
        paymentUrl = `/api/payments/paystack`;
        break;
      case "FLUTTERWAVE":
        paymentUrl = `/api/payments/flutterwave`;
        break;
      default:
        return NextResponse.json({ 
          error: "Invalid payment method" 
        }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      paymentUrl,
      bookingId,
      message: `Redirecting to ${paymentMethod} payment gateway` 
    });

  } catch (error) {
    console.error("Payment processing error:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Failed to process payment" 
    }, { status: 500 });
  }
} 