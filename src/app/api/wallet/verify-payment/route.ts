import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

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
    const { reference } = body;

    if (!reference) {
      return NextResponse.json(
        { error: "Payment reference is required" },
        { status: 400 }
      );
    }

    // Verify payment with Paystack
    const paystackResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    });

    if (!paystackResponse.ok) {
      return NextResponse.json(
        { error: "Failed to verify payment" },
        { status: 500 }
      );
    }

    const paystackData = await paystackResponse.json();
    
    if (paystackData.status && paystackData.data.status === "success") {
      const amount = paystackData.data.amount / 100; // Convert from kobo to Naira
      
      // Update wallet balance (in a real app, this would update a wallet table)
      // For now, we'll just return success
      
      // Create transaction record
      const transaction = {
        id: Date.now().toString(),
        amount: amount,
        currency: "NGN",
        status: "completed",
        type: "credit",
        description: "Added funds to wallet",
        createdAt: new Date().toISOString(),
        reference: reference
      };

      return NextResponse.json({
        success: true,
        amount: amount,
        transaction: transaction,
        message: "Payment verified successfully"
      });
    } else {
      return NextResponse.json(
        { error: "Payment verification failed" },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error("Error verifying payment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 