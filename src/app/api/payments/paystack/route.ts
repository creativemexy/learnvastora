import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";
import { EnhancedPaymentGateway, PaymentRequest, PaymentResponse } from "@/lib/payment-gateways";
import { PaymentErrorHandler, PaymentErrorType } from "@/lib/payment-errors";
import { PaymentErrorUtils } from "@/lib/payment-errors";

export async function GET(req: Request) {
  try {
  // Handle Paystack webhook verification
  const { searchParams } = new URL(req.url);
  const challenge = searchParams.get('challenge');
  
  if (challenge) {
    // Paystack webhook challenge
    return NextResponse.json({ challenge });
  }

    // Return payment gateway status with health check
    const health = await EnhancedPaymentGateway.getGatewayHealth('PAYSTACK');
    
  return NextResponse.json({
    status: "Paystack payment gateway",
      configured: health.healthy,
      responseTime: health.responseTime,
      message: health.healthy ? "Ready for payments" : health.error || "Not configured"
  });
  } catch (error) {
    console.error("Paystack status check error:", error);
    return NextResponse.json({
      status: "Paystack payment gateway",
      configured: false,
      message: "Error checking gateway status"
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
      const error = PaymentErrorHandler.createError(
        PaymentErrorType.UNAUTHORIZED,
        'UNAUTHORIZED',
        'User not authenticated',
        null,
        'PAYSTACK'
      );
      return NextResponse.json({ 
        success: false, 
        error: error.userMessage,
        errorDetails: error
      } as PaymentResponse, { status: 401 });
  }

    // Validate request body
    let requestData: PaymentRequest;
    try {
      requestData = await req.json();
    } catch (parseError) {
      const error = PaymentErrorHandler.createError(
        PaymentErrorType.MISSING_REQUIRED_FIELDS,
        'INVALID_REQUEST_BODY',
        'Invalid request body',
        parseError,
        'PAYSTACK'
      );
    return NextResponse.json({ 
      success: false, 
        error: error.userMessage,
        errorDetails: error
      } as PaymentResponse, { status: 400 });
  }

    // Validate required fields
    const requiredFields = ['amount', 'currency', 'bookingId', 'studentEmail', 'studentName', 'tutorName', 'sessionDate'];
    const missingFields = requiredFields.filter(field => !requestData[field as keyof PaymentRequest]);
    
    if (missingFields.length > 0) {
      const error = PaymentErrorHandler.createError(
        PaymentErrorType.MISSING_REQUIRED_FIELDS,
        'MISSING_FIELDS',
        `Missing required fields: ${missingFields.join(', ')}`,
        { missingFields },
        'PAYSTACK'
      );
      return NextResponse.json({ 
        success: false, 
        error: error.userMessage,
        errorDetails: error
      } as PaymentResponse, { status: 400 });
    }

    // Validate booking exists and user has access
    const booking = await prisma.booking.findUnique({
      where: { id: requestData.bookingId },
      include: {
        tutor: true,
        student: true,
      },
    });

    if (!booking) {
      const error = PaymentErrorHandler.createError(
        PaymentErrorType.RECORD_NOT_FOUND,
        'BOOKING_NOT_FOUND',
        'Booking not found',
        { bookingId: requestData.bookingId },
        'PAYSTACK'
      );
      return NextResponse.json({ 
        success: false, 
        error: error.userMessage,
        errorDetails: error
      } as PaymentResponse, { status: 404 });
    }

    // Verify user is authorized for this booking
    const userId = (session.user as any).id;
    if (booking.studentId !== userId && booking.tutorId !== userId) {
      const error = PaymentErrorHandler.createError(
        PaymentErrorType.UNAUTHORIZED,
        'NOT_AUTHORIZED',
        'Not authorized for this booking',
        { bookingId: requestData.bookingId, userId },
        'PAYSTACK'
      );
      return NextResponse.json({ 
        success: false, 
        error: error.userMessage,
        errorDetails: error
      } as PaymentResponse, { status: 403 });
    }

    // Check if booking is already paid
    if (booking.status === 'CONFIRMED' || booking.status === 'COMPLETED') {
      const error = PaymentErrorHandler.createError(
        PaymentErrorType.TRANSACTION_FAILED,
        'BOOKING_ALREADY_PAID',
        'Booking is already paid',
        { bookingId: requestData.bookingId, status: booking.status },
        'PAYSTACK'
      );
      return NextResponse.json({ 
        success: false, 
        error: error.userMessage,
        errorDetails: error
      } as PaymentResponse, { status: 400 });
    }

    // Validate amount
    if (requestData.amount <= 0) {
      const error = PaymentErrorHandler.createError(
        PaymentErrorType.INVALID_AMOUNT,
        'INVALID_AMOUNT',
        'Amount must be greater than 0',
        { amount: requestData.amount },
        'PAYSTACK'
      );
      return NextResponse.json({ 
        success: false, 
        error: error.userMessage,
        errorDetails: error
      } as PaymentResponse, { status: 400 });
    }

    // Validate currency
    const supportedCurrencies = ['NGN', 'USD', 'EUR', 'GBP'];
    if (!supportedCurrencies.includes(requestData.currency.toUpperCase())) {
      const error = PaymentErrorHandler.createError(
        PaymentErrorType.INVALID_CURRENCY,
        'UNSUPPORTED_CURRENCY',
        'Unsupported currency',
        { currency: requestData.currency, supportedCurrencies },
        'PAYSTACK'
      );
      return NextResponse.json({ 
        success: false, 
        error: error.userMessage,
        errorDetails: error
      } as PaymentResponse, { status: 400 });
    }

    // Create payment using enhanced gateway
    const paymentResult = await EnhancedPaymentGateway.createPayment('PAYSTACK', requestData);

    if (!paymentResult.success) {
      return NextResponse.json(paymentResult, { status: 400 });
    }

    // Update booking with payment reference
    try {
    await prisma.booking.update({
        where: { id: requestData.bookingId },
      data: { 
          paymentReference: paymentResult.reference,
          paymentMethod: 'PAYSTACK',
          status: 'PENDING'
      },
    });
    } catch (dbError) {
      console.error("Database error updating booking:", dbError);
      const error = PaymentErrorHandler.createError(
        PaymentErrorType.DATABASE_ERROR,
        'DATABASE_UPDATE_FAILED',
        'Failed to update booking with payment reference',
        dbError,
        'PAYSTACK'
      );
    return NextResponse.json({
        success: false, 
        error: error.userMessage,
        errorDetails: error
      } as PaymentResponse, { status: 500 });
    }

    // Create payment record
    try {
      await prisma.payment.create({
        data: {
          userId: booking.studentId,
          bookingId: requestData.bookingId,
          amount: requestData.amount,
          status: 'PENDING',
        },
      });
    } catch (dbError) {
      console.error("Database error creating payment record:", dbError);
      // Don't fail the entire request if payment record creation fails
      // The webhook will handle payment status updates
    }

    return NextResponse.json(paymentResult);

  } catch (error: any) {
    console.error("Paystack payment error:", error);
    
    // Handle specific error types
    if (PaymentErrorUtils.isNetworkError(error)) {
      const paymentError = PaymentErrorHandler.createError(
        PaymentErrorType.NETWORK_ERROR,
        'NETWORK_ERROR',
        'Network error occurred',
        error,
        'PAYSTACK'
      );
      return NextResponse.json({ 
        success: false, 
        error: paymentError.userMessage,
        errorDetails: paymentError
      } as PaymentResponse, { status: 503 });
    }

    if (PaymentErrorUtils.isAuthenticationError(error)) {
      const paymentError = PaymentErrorHandler.createError(
        PaymentErrorType.INVALID_CREDENTIALS,
        'INVALID_CREDENTIALS',
        'Invalid Paystack credentials',
        error,
        'PAYSTACK'
      );
      return NextResponse.json({ 
        success: false, 
        error: paymentError.userMessage,
        errorDetails: paymentError
      } as PaymentResponse, { status: 401 });
    }

    // Generic error handling
    const paymentError = PaymentErrorHandler.handleGatewayError(error, 'PAYSTACK');
    return NextResponse.json({ 
      success: false, 
      error: paymentError.userMessage,
      errorDetails: paymentError
    } as PaymentResponse, { status: 500 });
  }
} 