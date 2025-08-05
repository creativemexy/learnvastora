import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { flutterwaveClient } from "@/lib/payment-gateways";

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const headers = req.headers;
    
    // Verify webhook signature (in production, implement proper verification)
    const event = JSON.parse(body);
    
    if (event.event === "charge.completed") {
      const txRef = event.data.tx_ref;
      
      // Verify transaction with Flutterwave
      const verification = await flutterwaveClient.Transaction.verify({ tx_ref: txRef });
      
      if (verification.status === "success" && verification.data.status === "successful") {
        // Find booking by Flutterwave reference
        const booking = await prisma.booking.findFirst({
          where: { paymentReference: txRef }
        });
        
        if (booking) {
          // Update booking status
          await prisma.booking.update({
            where: { id: booking.id },
            data: { 
              status: "CONFIRMED",
              paidAt: new Date()
            }
          });
          
          // Create payment record
          await prisma.payment.create({
            data: {
              userId: booking.studentId,
              bookingId: booking.id,
              amount: parseFloat(verification.data.amount),
              status: "PAID"
            }
          });
        }
      }
    }
    
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Flutterwave webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 400 });
  }
} 