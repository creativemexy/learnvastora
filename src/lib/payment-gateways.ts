import Paystack from 'paystack';
import Flutterwave from 'flutterwave-node';
import { PaymentErrorHandler, PaymentError, PaymentErrorType, PaymentErrorUtils } from './payment-errors';

// Enhanced Payment Gateway Configuration
export const paystackClient = process.env.PAYSTACK_SECRET_KEY 
  ? Paystack(process.env.PAYSTACK_SECRET_KEY)
  : null;

export const flutterwaveClient = process.env.FLUTTERWAVE_PUBLIC_KEY && process.env.FLUTTERWAVE_SECRET_KEY
  ? new Flutterwave(
      process.env.FLUTTERWAVE_PUBLIC_KEY,
      process.env.FLUTTERWAVE_SECRET_KEY
    )
  : null;

// Development fallback payment client
export const devPaymentClient = {
  createTransaction: async (data: any) => ({
    status: true,
    data: {
      authorization_url: `${process.env.NEXTAUTH_URL}/bookings?success=1&dev=true`,
      reference: `dev_${Date.now()}`,
    }
  })
};

export interface PaymentRequest {
  amount: number;
  currency: string;
  bookingId: string;
  studentEmail: string;
  studentName: string;
  tutorName: string;
  sessionDate: string;
}

export interface PaymentResponse {
  success: boolean;
  paymentUrl?: string;
  reference?: string;
  message?: string;
  error?: string;
  errorDetails?: PaymentError;
}

export interface BankAccount {
  id: string;
  accountNumber: string;
  routingNumber: string;
  bankName: string;
  accountType: 'checking' | 'savings';
  isVerified: boolean;
}

export interface BankTransferRequest {
  amount: number;
  currency: string;
  sourceAccount: BankAccount;
  destinationAccount: BankAccount;
  description: string;
  reference: string;
}

// Enhanced Payment Gateway Class
export class EnhancedPaymentGateway {
  private static maxRetries = 3;
  private static timeout = 30000; // 30 seconds

  static async createPayment(
    gateway: 'PAYSTACK' | 'FLUTTERWAVE' | 'STRIPE',
    request: PaymentRequest,
    retryCount = 0
  ): Promise<PaymentResponse> {
    try {
      // Validate request
      const validationError = this.validatePaymentRequest(request);
      if (validationError) {
        return {
          success: false,
          error: validationError.userMessage,
          errorDetails: validationError
        };
      }

      // Check gateway availability
      if (!this.isGatewayAvailable(gateway)) {
        const error = PaymentErrorHandler.createError(
          PaymentErrorType.GATEWAY_UNAVAILABLE,
          `${gateway}_UNAVAILABLE`,
          `${gateway} gateway is not configured`,
          null,
          gateway
        );
        return {
          success: false,
          error: error.userMessage,
          errorDetails: error
        };
      }

      let result: any;

      switch (gateway) {
        case 'PAYSTACK':
          result = await this.processPaystackPayment(request);
          break;
        case 'FLUTTERWAVE':
          result = await this.processFlutterwavePayment(request);
          break;
        case 'STRIPE':
          result = await this.processStripePayment(request);
          break;
        default:
          throw new Error(`Unsupported gateway: ${gateway}`);
      }

      return {
        success: true,
        paymentUrl: result.paymentUrl,
        reference: result.reference,
        message: 'Payment initiated successfully'
      };

    } catch (error: any) {
      const paymentError = PaymentErrorHandler.handleGatewayError(error, gateway);
      PaymentErrorHandler.logError(paymentError);

      // Retry logic for retryable errors
      if (PaymentErrorHandler.shouldRetry(paymentError) && retryCount < this.maxRetries) {
        const delay = PaymentErrorHandler.getRetryDelay(paymentError, retryCount);
        await this.sleep(delay);
        return this.createPayment(gateway, request, retryCount + 1);
      }

      return {
        success: false,
        error: paymentError.userMessage,
        errorDetails: paymentError
      };
    }
  }

  static async verifyPayment(
    gateway: 'PAYSTACK' | 'FLUTTERWAVE' | 'STRIPE',
    reference: string,
    retryCount = 0
  ): Promise<PaymentResponse> {
    try {
      if (!reference) {
        const error = PaymentErrorHandler.createError(
          PaymentErrorType.INVALID_REFERENCE,
          'MISSING_REFERENCE',
          'Payment reference is required',
          null,
          gateway
        );
        return {
          success: false,
          error: error.userMessage,
          errorDetails: error
        };
      }

      let result: any;

      switch (gateway) {
        case 'PAYSTACK':
          result = await this.verifyPaystackPayment(reference);
          break;
        case 'FLUTTERWAVE':
          result = await this.verifyFlutterwavePayment(reference);
          break;
        case 'STRIPE':
          result = await this.verifyStripePayment(reference);
          break;
        default:
          throw new Error(`Unsupported gateway: ${gateway}`);
      }

      return {
        success: true,
        message: 'Payment verified successfully',
        reference: reference
      };

    } catch (error: any) {
      const paymentError = PaymentErrorHandler.handleGatewayError(error, gateway);
      PaymentErrorHandler.logError(paymentError);

      if (PaymentErrorHandler.shouldRetry(paymentError) && retryCount < this.maxRetries) {
        const delay = PaymentErrorHandler.getRetryDelay(paymentError, retryCount);
        await this.sleep(delay);
        return this.verifyPayment(gateway, reference, retryCount + 1);
      }

      return {
        success: false,
        error: paymentError.userMessage,
        errorDetails: paymentError
      };
    }
  }

  static async processBankTransfer(
    request: BankTransferRequest,
    retryCount = 0
  ): Promise<PaymentResponse> {
    try {
      // Validate bank transfer request
      const validationError = this.validateBankTransferRequest(request);
      if (validationError) {
        return {
          success: false,
          error: validationError.userMessage,
          errorDetails: validationError
        };
      }

      // Simulate bank transfer (in real implementation, integrate with actual bank APIs)
      const transferResult = await this.simulateBankTransfer(request);

      return {
        success: true,
        message: 'Bank transfer initiated successfully',
        reference: transferResult.reference
      };

    } catch (error: any) {
      const paymentError = PaymentErrorHandler.createError(
        PaymentErrorType.BANK_TRANSACTION_FAILED,
        'BANK_TRANSFER_FAILED',
        'Bank transfer failed',
        error,
        'BANK'
      );
      PaymentErrorHandler.logError(paymentError);

      if (PaymentErrorHandler.shouldRetry(paymentError) && retryCount < this.maxRetries) {
        const delay = PaymentErrorHandler.getRetryDelay(paymentError, retryCount);
        await this.sleep(delay);
        return this.processBankTransfer(request, retryCount + 1);
      }

      return {
        success: false,
        error: paymentError.userMessage,
        errorDetails: paymentError
      };
    }
  }

  // Private helper methods
  private static validatePaymentRequest(request: PaymentRequest): PaymentError | null {
    if (!request.amount || request.amount <= 0) {
      return PaymentErrorHandler.createError(
        PaymentErrorType.INVALID_AMOUNT,
        'INVALID_AMOUNT',
        'Invalid payment amount',
        request
      );
    }

    if (!request.currency) {
      return PaymentErrorHandler.createError(
        PaymentErrorType.INVALID_CURRENCY,
        'INVALID_CURRENCY',
        'Invalid currency',
        request
      );
    }

    if (!request.studentEmail || !this.isValidEmail(request.studentEmail)) {
      return PaymentErrorHandler.createError(
        PaymentErrorType.INVALID_EMAIL,
        'INVALID_EMAIL',
        'Invalid email address',
        request
      );
    }

    if (!request.bookingId) {
      return PaymentErrorHandler.createError(
        PaymentErrorType.MISSING_REQUIRED_FIELDS,
        'MISSING_BOOKING_ID',
        'Booking ID is required',
        request
      );
    }

    return null;
  }

  private static validateBankTransferRequest(request: BankTransferRequest): PaymentError | null {
    if (!request.amount || request.amount <= 0) {
      return PaymentErrorHandler.createError(
        PaymentErrorType.INVALID_AMOUNT,
        'INVALID_AMOUNT',
        'Invalid transfer amount',
        request
      );
    }

    if (!request.sourceAccount.accountNumber || !this.isValidAccountNumber(request.sourceAccount.accountNumber)) {
      return PaymentErrorHandler.createError(
        PaymentErrorType.BANK_ACCOUNT_INVALID,
        'INVALID_SOURCE_ACCOUNT',
        'Invalid source account number',
        request
      );
    }

    if (!request.destinationAccount.accountNumber || !this.isValidAccountNumber(request.destinationAccount.accountNumber)) {
      return PaymentErrorHandler.createError(
        PaymentErrorType.BANK_ACCOUNT_INVALID,
        'INVALID_DESTINATION_ACCOUNT',
        'Invalid destination account number',
        request
      );
    }

    return null;
  }

  private static isGatewayAvailable(gateway: string): boolean {
    switch (gateway) {
      case 'PAYSTACK':
        return !!paystackClient;
      case 'FLUTTERWAVE':
        return !!flutterwaveClient;
      case 'STRIPE':
        return !!process.env.STRIPE_SECRET_KEY;
      default:
        return false;
    }
  }

  private static async processPaystackPayment(request: PaymentRequest): Promise<any> {
    if (!paystackClient) {
      throw new Error('Paystack client not configured');
    }

    const transaction = await paystackClient.transaction.initialize({
      amount: request.amount,
      email: request.studentEmail,
      reference: `booking_${request.bookingId}_${Date.now()}`,
      callback_url: `${process.env.NEXTAUTH_URL}/bookings?success=1`,
      metadata: {
        bookingId: request.bookingId,
        studentName: request.studentName,
        tutorName: request.tutorName,
        sessionDate: request.sessionDate,
      },
    });

    if (!transaction.status) {
      throw new Error(transaction.message || 'Failed to initialize Paystack transaction');
    }

    return {
      paymentUrl: transaction.data.authorization_url,
      reference: transaction.data.reference,
    };
  }

  private static async processFlutterwavePayment(request: PaymentRequest): Promise<any> {
    if (!flutterwaveClient) {
      throw new Error('Flutterwave client not configured');
    }

    const transaction = await flutterwaveClient.Transaction.charge({
      amount: request.amount,
      currency: request.currency,
      tx_ref: `booking_${request.bookingId}_${Date.now()}`,
      redirect_url: `${process.env.NEXTAUTH_URL}/bookings?success=1`,
      customer: {
        email: request.studentEmail,
        name: request.studentName,
      },
      meta: {
        bookingId: request.bookingId,
        studentName: request.studentName,
        tutorName: request.tutorName,
        sessionDate: request.sessionDate,
      },
    });

    if (transaction.status !== 'success') {
      throw new Error(transaction.message || 'Failed to initialize Flutterwave transaction');
    }

    return {
      paymentUrl: transaction.data.link,
      reference: transaction.data.tx_ref,
    };
  }

  private static async processStripePayment(request: PaymentRequest): Promise<any> {
    // Stripe implementation would go here
    // This is a placeholder for Stripe integration
    throw new Error('Stripe integration not implemented');
  }

  private static async verifyPaystackPayment(reference: string): Promise<any> {
    if (!paystackClient) {
      throw new Error('Paystack client not configured');
    }

    const transaction = await paystackClient.transaction.verify(reference);
    
    if (!transaction.status || transaction.data.status !== 'success') {
      throw new Error('Payment verification failed');
    }

    return transaction.data;
  }

  private static async verifyFlutterwavePayment(reference: string): Promise<any> {
    if (!flutterwaveClient) {
      throw new Error('Flutterwave client not configured');
    }

    const verification = await flutterwaveClient.Transaction.verify({ tx_ref: reference });
    
    if (verification.status !== 'success' || verification.data.status !== 'successful') {
      throw new Error('Payment verification failed');
    }

    return verification.data;
  }

  private static async verifyStripePayment(reference: string): Promise<any> {
    // Stripe verification implementation
    throw new Error('Stripe verification not implemented');
  }

  private static async simulateBankTransfer(request: BankTransferRequest): Promise<any> {
    // Simulate bank transfer processing
    await this.sleep(2000); // Simulate processing time

    // Simulate random failure (5% chance)
    if (Math.random() < 0.05) {
      throw new Error('Bank transfer failed due to insufficient funds');
    }

    return {
      reference: `transfer_${Date.now()}`,
      status: 'completed',
      amount: request.amount,
      currency: request.currency
    };
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private static isValidAccountNumber(accountNumber: string): boolean {
    // Basic validation - account numbers should be numeric and reasonable length
    return /^\d{8,17}$/.test(accountNumber);
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Utility methods for monitoring and health checks
  static async getGatewayHealth(gateway: string): Promise<{ healthy: boolean; responseTime: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      switch (gateway) {
        case 'PAYSTACK':
          if (!paystackClient) {
            return { healthy: false, responseTime: 0, error: 'Paystack not configured' };
          }
          // Test with a simple API call
          await paystackClient.transaction.list({ perPage: 1 });
          break;
        case 'FLUTTERWAVE':
          if (!flutterwaveClient) {
            return { healthy: false, responseTime: 0, error: 'Flutterwave not configured' };
          }
          // Test with a simple API call
          await flutterwaveClient.Transaction.list({ page: 1, limit: 1 });
          break;
        default:
          return { healthy: false, responseTime: 0, error: 'Unknown gateway' };
      }

      const responseTime = Date.now() - startTime;
      return { healthy: true, responseTime };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      return { 
        healthy: false, 
        responseTime, 
        error: error.message || 'Health check failed' 
      };
    }
  }

  static async getAllGatewaysHealth(): Promise<Record<string, { healthy: boolean; responseTime: number; error?: string }>> {
    const gateways = ['PAYSTACK', 'FLUTTERWAVE', 'STRIPE'];
    const healthChecks = await Promise.allSettled(
      gateways.map(gateway => this.getGatewayHealth(gateway))
    );

    const results: Record<string, { healthy: boolean; responseTime: number; error?: string }> = {};
    
    gateways.forEach((gateway, index) => {
      const result = healthChecks[index];
      if (result.status === 'fulfilled') {
        results[gateway] = result.value;
      } else {
        results[gateway] = { 
          healthy: false, 
          responseTime: 0, 
          error: result.reason?.message || 'Health check failed' 
        };
      }
    });

    return results;
  }
} 