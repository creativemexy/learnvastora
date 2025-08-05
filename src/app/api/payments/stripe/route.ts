import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil' as any,
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { amount, currency, bookingId, studentEmail, studentName, tutorName, sessionDate } = await req.json();

    // Verify booking exists
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        tutor: true,
        student: true
      }
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: `Tutoring Session with ${tutorName}`,
              description: `Session scheduled for ${new Date(sessionDate).toLocaleDateString()} at ${new Date(sessionDate).toLocaleTimeString()}`,
            },
            unit_amount: amount, // Amount in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXTAUTH_URL}/bookings/${bookingId}?success=true`,
      cancel_url: `${process.env.NEXTAUTH_URL}/bookings/tutor/${booking.tutorId}?cancelled=true`,
      metadata: {
        bookingId: bookingId,
        studentEmail: studentEmail,
        studentName: studentName,
        tutorName: tutorName,
        sessionDate: sessionDate
      },
      customer_email: studentEmail,
    });

    // Update booking with Stripe session ID
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        paymentReference: session.id,
        paymentMethod: 'STRIPE'
      }
    });

    return NextResponse.json({
      success: true,
      paymentUrl: session.url,
      sessionId: session.id
    });

  } catch (error) {
    console.error("Stripe payment error:", error);
    return NextResponse.json(
      { error: "Failed to process Stripe payment" },
      { status: 500 }
    );
  }
} 