import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { paystackClient } from "@/lib/payment-gateways";
import fs from "fs";
import path from "path";

function logToFile(message: string) {
  const logPath = path.join(process.cwd(), "webhook.log");
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`);
}

export async function POST(req: Request) {
  try {
    logToFile("[Paystack Webhook] Webhook received");
    console.log("[Paystack Webhook] Webhook received");
    const body = await req.text();
    const headers = req.headers;
    // Verify webhook signature (in production, implement proper verification)
    const event = JSON.parse(body);
    logToFile(`[Paystack Webhook] Event: ${JSON.stringify(event)}`);
    console.log("[Paystack Webhook] Event:", event);
    if (event.event === "charge.success") {
      const reference = event.data.reference;
      // Verify transaction with Paystack
      const verification = await paystackClient.transaction.verify(reference);
      logToFile(`[Paystack Webhook] Verification: ${JSON.stringify(verification)}`);
      console.log("[Paystack Webhook] Verification:", verification);
      if (verification.status && verification.data.status === "success") {
        // Find booking by Paystack reference
        let booking = await prisma.booking.findFirst({
          where: { paymentReference: reference }
        });
        if (!booking) {
          // Create booking from metadata if not found
          const meta = verification.data.metadata || {};
          logToFile(`[Paystack Webhook] No booking found, metadata: ${JSON.stringify(meta)}`);
          console.log("[Paystack Webhook] No booking found, metadata:", meta);
          if (meta.tutorId && meta.scheduledAt && meta.studentId) {
            booking = await prisma.booking.create({
              data: {
                studentId: meta.studentId,
                tutorId: meta.tutorId,
                scheduledAt: new Date(meta.scheduledAt),
                status: "CONFIRMED",
                paidAt: new Date(),
                paymentReference: reference,
                paymentMethod: 'PAYSTACK',
              },
            });
            logToFile(`[Paystack Webhook] Booking created: ${booking.id}`);
            console.log("[Paystack Webhook] Booking created:", booking.id);
          } else {
            logToFile("[Paystack Webhook] Missing metadata, cannot create booking");
            console.log("[Paystack Webhook] Missing metadata, cannot create booking");
          }
        }
        if (booking) {
          // Update booking status (if not already confirmed)
          await prisma.booking.update({
            where: { id: booking.id },
            data: { 
              status: "CONFIRMED",
              paidAt: new Date(),
              paymentReference: reference,
              paymentMethod: 'PAYSTACK',
            }
          });
          await prisma.payment.create({
            data: {
              userId: booking.studentId,
              bookingId: booking.id,
              amount: parseFloat(verification.data.amount) / 100, // Convert from kobo to naira
              status: "PAID"
            }
          });
          logToFile(`[Paystack Webhook] Booking confirmed and payment recorded for: ${booking.id}`);
          console.log("[Paystack Webhook] Booking confirmed and payment recorded for:", booking.id);
        } else {
          logToFile("[Paystack Webhook] No booking to confirm");
          console.log("[Paystack Webhook] No booking to confirm");
        }
      } else {
        logToFile("[Paystack Webhook] Payment not successful");
        console.log("[Paystack Webhook] Payment not successful");
      }
    } else {
      logToFile("[Paystack Webhook] Event is not charge.success");
      console.log("[Paystack Webhook] Event is not charge.success");
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    logToFile(`[Paystack Webhook] ERROR: ${error}`);
    console.error("Paystack webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 400 });
  }
} 