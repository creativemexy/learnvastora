import { NextResponse } from "next/server";
import { flutterwaveClient, PaymentRequest, PaymentResponse } from "@/lib/payment-gateways";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  // Return payment gateway status
  return NextResponse.json({
    status: "Flutterwave payment gateway",
    configured: !!flutterwaveClient,
    message: flutterwaveClient ? "Ready for payments" : "Not configured"
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if Flutterwave is configured
  if (!flutterwaveClient) {
    return NextResponse.json({ 
      success: false, 
      error: "Flutterwave payment gateway is not configured" 
    } as PaymentResponse, { status: 500 });
  }

  try {
    const { amount, currency, bookingId, studentEmail, studentName, tutorName, sessionDate }: PaymentRequest = await req.json();

    // Create Flutterwave transaction
    const transaction = await flutterwaveClient.Transaction.charge({
      amount: amount,
      currency: currency,
      tx_ref: `booking_${bookingId}_${Date.now()}`,
      redirect_url: `${process.env.NEXTAUTH_URL}/bookings?success=1`,
      customer: {
        email: studentEmail,
        name: studentName,
      },
      meta: {
        bookingId,
        studentName,
        tutorName,
        sessionDate,
      },
    });

    if (transaction.status !== 'success') {
      throw new Error(transaction.message || "Failed to initialize Flutterwave transaction");
    }

    // Update booking with Flutterwave reference
    await prisma.booking.update({
      where: { id: bookingId },
      data: { 
        paymentReference: transaction.data.tx_ref,
        paymentMethod: 'FLUTTERWAVE'
      },
    });

    return NextResponse.json({
      success: true,
      paymentUrl: transaction.data.link,
      reference: transaction.data.tx_ref,
    } as PaymentResponse);

  } catch (error) {
    console.error("Flutterwave payment error:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Failed to create Flutterwave payment" 
    } as PaymentResponse, { status: 500 });
  }
} 