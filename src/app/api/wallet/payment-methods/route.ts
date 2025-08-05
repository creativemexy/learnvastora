import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if ((session.user as any)?.role !== "STUDENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // For now, return mock payment methods
    // In a real implementation, this would fetch from a payment_methods table
    const paymentMethods = [
      {
        id: "1",
        type: "card",
        brand: "Visa",
        last4: "4242",
        isDefault: true,
        expiryMonth: 12,
        expiryYear: 2025
      },
      {
        id: "2",
        type: "card",
        brand: "Mastercard",
        last4: "5555",
        isDefault: false,
        expiryMonth: 8,
        expiryYear: 2026
      }
    ];

    return NextResponse.json({ paymentMethods });
  } catch (error) {
    console.error("Error fetching payment methods:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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
    const { cardNumber, expiryMonth, expiryYear, cvv, cardholderName } = body;

    // Validate required fields
    if (!cardNumber || !expiryMonth || !expiryYear || !cvv || !cardholderName) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // In a real implementation, this would:
    // 1. Validate card details
    // 2. Process payment with Stripe/Paystack
    // 3. Store payment method securely
    // 4. Return success response

    // For now, return success
    return NextResponse.json({ 
      success: true,
      message: "Payment method added successfully"
    });
  } catch (error) {
    console.error("Error adding payment method:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 