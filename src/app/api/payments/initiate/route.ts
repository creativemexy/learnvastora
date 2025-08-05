import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { paystackClient, flutterwaveClient } from "@/lib/payment-gateways";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { tutorId, scheduledAt, paymentMethod, amount, currency, studentEmail, studentName, tutorName } = await req.json();
    if (!tutorId || !scheduledAt || !paymentMethod) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    let paymentUrl = "";
    let reference = "";
    if (paymentMethod === "PAYSTACK" && paystackClient) {
      const transaction = await paystackClient.transaction.initialize({
        amount,
        email: studentEmail,
        reference: `pendingbooking_${tutorId}_${Date.now()}`,
        callback_url: `${process.env.NEXTAUTH_URL}/payment-success`,
        metadata: {
          tutorId,
          scheduledAt,
          studentId: (session.user as any).id,
          studentName,
          tutorName,
        },
      });
      if (!transaction.status) throw new Error(transaction.message || "Failed to initialize Paystack transaction");
      paymentUrl = transaction.data.authorization_url;
      reference = transaction.data.reference;
    } else if (paymentMethod === "FLUTTERWAVE" && flutterwaveClient) {
      const transaction = await flutterwaveClient.Transaction.charge({
        amount,
        currency,
        tx_ref: `pendingbooking_${tutorId}_${Date.now()}`,
        redirect_url: `${process.env.NEXTAUTH_URL}/payment-success`,
        customer: { email: studentEmail, name: studentName },
        meta: {
          tutorId,
          scheduledAt,
          studentId: (session.user as any).id,
          studentName,
          tutorName,
        },
      });
      if (transaction.status !== 'success') throw new Error(transaction.message || "Failed to initialize Flutterwave transaction");
      paymentUrl = transaction.data.link;
      reference = transaction.data.tx_ref;
    } else {
      return NextResponse.json({ error: "Unsupported payment method" }, { status: 400 });
    }
    return NextResponse.json({ success: true, paymentUrl, reference });
  } catch (error) {
    return NextResponse.json({ error: "Failed to initiate payment" }, { status: 500 });
  }
} 