import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

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
    const { amount, currency, studentEmail, studentName, purpose } = body;

    if (!amount || !currency || !studentEmail) {
      return NextResponse.json(
        { error: "Amount, currency, and email are required" },
        { status: 400 }
      );
    }

    // Create Paystack payment session
    const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amount * 100, // Convert to kobo (cents) - for NGN
        email: studentEmail,
        currency: "NGN", // Changed from USD to NGN
        callback_url: `${process.env.NEXTAUTH_URL}/wallet/payment-success`,
        metadata: {
          purpose: purpose,
          studentName: studentName,
          type: "wallet_funding"
        }
      }),
    });

    if (!paystackResponse.ok) {
      const errorData = await paystackResponse.json();
      console.error("Paystack error:", errorData);
      return NextResponse.json(
        { error: "Failed to create payment session" },
        { status: 500 }
      );
    }

    const paystackData = await paystackResponse.json();
    
    if (paystackData.status && paystackData.data) {
      return NextResponse.json({
        success: true,
        paymentUrl: paystackData.data.authorization_url,
        reference: paystackData.data.reference
      });
    } else {
      return NextResponse.json(
        { error: "Payment initialization failed" },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Error creating payment session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 