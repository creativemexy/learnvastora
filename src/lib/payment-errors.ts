// Payment Error Handling System
export enum PaymentErrorType {
  // Authentication Errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  EXPIRED_TOKEN = 'EXPIRED_TOKEN',
  
  // Validation Errors
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  INVALID_CURRENCY = 'INVALID_CURRENCY',
  INVALID_EMAIL = 'INVALID_EMAIL',
  INVALID_REFERENCE = 'INVALID_REFERENCE',
  MISSING_REQUIRED_FIELDS = 'MISSING_REQUIRED_FIELDS',
  
  // Payment Gateway Errors
  GATEWAY_UNAVAILABLE = 'GATEWAY_UNAVAILABLE',
  GATEWAY_TIMEOUT = 'GATEWAY_TIMEOUT',
  GATEWAY_ERROR = 'GATEWAY_ERROR',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  CARD_DECLINED = 'CARD_DECLINED',
  EXPIRED_CARD = 'EXPIRED_CARD',
  INVALID_CARD = 'INVALID_CARD',
  CARD_LIMIT_EXCEEDED = 'CARD_LIMIT_EXCEEDED',
  
  // Bank Integration Errors
  BANK_CONNECTION_FAILED = 'BANK_CONNECTION_FAILED',
  BANK_ACCOUNT_INVALID = 'BANK_ACCOUNT_INVALID',
  BANK_ROUTING_INVALID = 'BANK_ROUTING_INVALID',
  BANK_ACCOUNT_NOT_FOUND = 'BANK_ACCOUNT_NOT_FOUND',
  BANK_TRANSACTION_FAILED = 'BANK_TRANSACTION_FAILED',
  BANK_MAINTENANCE = 'BANK_MAINTENANCE',
  
  // Webhook Errors
  WEBHOOK_SIGNATURE_INVALID = 'WEBHOOK_SIGNATURE_INVALID',
  WEBHOOK_PROCESSING_FAILED = 'WEBHOOK_PROCESSING_FAILED',
  WEBHOOK_TIMEOUT = 'WEBHOOK_TIMEOUT',
  
  // Database Errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  RECORD_NOT_FOUND = 'RECORD_NOT_FOUND',
  
  // Network Errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  CONNECTION_REFUSED = 'CONNECTION_REFUSED',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  
  // Security Errors
  FRAUD_DETECTED = 'FRAUD_DETECTED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  IP_BLOCKED = 'IP_BLOCKED',
  
  // Generic Errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
}

export interface PaymentError {
  type: PaymentErrorType;
  code: string;
  message: string;
  userMessage: string;
  details?: any;
  timestamp: Date;
  gateway?: string;
  retryable: boolean;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export class PaymentErrorHandler {
  private static errorMessages: Record<PaymentErrorType, { userMessage: string; retryable: boolean; severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' }> = {
    [PaymentErrorType.UNAUTHORIZED]: {
      userMessage: "Authentication failed. Please log in again.",
      retryable: false,
      severity: 'HIGH'
    },
    [PaymentErrorType.INVALID_CREDENTIALS]: {
      userMessage: "Invalid payment credentials. Please check your details.",
      retryable: false,
      severity: 'HIGH'
    },
    [PaymentErrorType.EXPIRED_TOKEN]: {
      userMessage: "Your session has expired. Please refresh and try again.",
      retryable: true,
      severity: 'MEDIUM'
    },
    [PaymentErrorType.INVALID_AMOUNT]: {
      userMessage: "Invalid payment amount. Please check the amount and try again.",
      retryable: true,
      severity: 'LOW'
    },
    [PaymentErrorType.INVALID_CURRENCY]: {
      userMessage: "Invalid currency. Please select a supported currency.",
      retryable: true,
      severity: 'LOW'
    },
    [PaymentErrorType.INVALID_EMAIL]: {
      userMessage: "Invalid email address. Please check your email and try again.",
      retryable: true,
      severity: 'LOW'
    },
    [PaymentErrorType.INVALID_REFERENCE]: {
      userMessage: "Invalid payment reference. Please try again.",
      retryable: true,
      severity: 'MEDIUM'
    },
    [PaymentErrorType.MISSING_REQUIRED_FIELDS]: {
      userMessage: "Missing required information. Please fill in all fields.",
      retryable: true,
      severity: 'LOW'
    },
    [PaymentErrorType.GATEWAY_UNAVAILABLE]: {
      userMessage: "Payment service is temporarily unavailable. Please try again later.",
      retryable: true,
      severity: 'MEDIUM'
    },
    [PaymentErrorType.GATEWAY_TIMEOUT]: {
      userMessage: "Payment request timed out. Please try again.",
      retryable: true,
      severity: 'MEDIUM'
    },
    [PaymentErrorType.GATEWAY_ERROR]: {
      userMessage: "Payment processing error. Please try again or contact support.",
      retryable: true,
      severity: 'HIGH'
    },
    [PaymentErrorType.INSUFFICIENT_FUNDS]: {
      userMessage: "Insufficient funds. Please check your balance or use a different payment method.",
      retryable: false,
      severity: 'MEDIUM'
    },
    [PaymentErrorType.CARD_DECLINED]: {
      userMessage: "Card was declined. Please check your card details or use a different card.",
      retryable: false,
      severity: 'MEDIUM'
    },
    [PaymentErrorType.EXPIRED_CARD]: {
      userMessage: "Card has expired. Please use a different card.",
      retryable: false,
      severity: 'MEDIUM'
    },
    [PaymentErrorType.INVALID_CARD]: {
      userMessage: "Invalid card details. Please check your card information.",
      retryable: false,
      severity: 'MEDIUM'
    },
    [PaymentErrorType.CARD_LIMIT_EXCEEDED]: {
      userMessage: "Card limit exceeded. Please use a different payment method.",
      retryable: false,
      severity: 'MEDIUM'
    },
    [PaymentErrorType.BANK_CONNECTION_FAILED]: {
      userMessage: "Unable to connect to bank. Please try again later.",
      retryable: true,
      severity: 'HIGH'
    },
    [PaymentErrorType.BANK_ACCOUNT_INVALID]: {
      userMessage: "Invalid bank account number. Please check your account details.",
      retryable: false,
      severity: 'HIGH'
    },
    [PaymentErrorType.BANK_ROUTING_INVALID]: {
      userMessage: "Invalid routing number. Please check your bank details.",
      retryable: false,
      severity: 'HIGH'
    },
    [PaymentErrorType.BANK_ACCOUNT_NOT_FOUND]: {
      userMessage: "Bank account not found. Please verify your account details.",
      retryable: false,
      severity: 'HIGH'
    },
    [PaymentErrorType.BANK_TRANSACTION_FAILED]: {
      userMessage: "Bank transaction failed. Please try again or contact your bank.",
      retryable: true,
      severity: 'HIGH'
    },
    [PaymentErrorType.BANK_MAINTENANCE]: {
      userMessage: "Bank is under maintenance. Please try again later.",
      retryable: true,
      severity: 'MEDIUM'
    },
    [PaymentErrorType.WEBHOOK_SIGNATURE_INVALID]: {
      userMessage: "Payment verification failed. Please contact support.",
      retryable: false,
      severity: 'CRITICAL'
    },
    [PaymentErrorType.WEBHOOK_PROCESSING_FAILED]: {
      userMessage: "Payment processing error. Please contact support.",
      retryable: false,
      severity: 'CRITICAL'
    },
    [PaymentErrorType.WEBHOOK_TIMEOUT]: {
      userMessage: "Payment verification timed out. Please try again.",
      retryable: true,
      severity: 'MEDIUM'
    },
    [PaymentErrorType.DATABASE_ERROR]: {
      userMessage: "System error. Please try again or contact support.",
      retryable: true,
      severity: 'HIGH'
    },
    [PaymentErrorType.TRANSACTION_FAILED]: {
      userMessage: "Transaction failed. Please try again.",
      retryable: true,
      severity: 'HIGH'
    },
    [PaymentErrorType.RECORD_NOT_FOUND]: {
      userMessage: "Record not found. Please refresh and try again.",
      retryable: true,
      severity: 'MEDIUM'
    },
    [PaymentErrorType.NETWORK_ERROR]: {
      userMessage: "Network error. Please check your connection and try again.",
      retryable: true,
      severity: 'MEDIUM'
    },
    [PaymentErrorType.TIMEOUT_ERROR]: {
      userMessage: "Request timed out. Please try again.",
      retryable: true,
      severity: 'MEDIUM'
    },
    [PaymentErrorType.CONNECTION_REFUSED]: {
      userMessage: "Connection refused. Please try again later.",
      retryable: true,
      severity: 'MEDIUM'
    },
    [PaymentErrorType.RATE_LIMIT_EXCEEDED]: {
      userMessage: "Too many requests. Please wait a moment and try again.",
      retryable: true,
      severity: 'MEDIUM'
    },
    [PaymentErrorType.TOO_MANY_REQUESTS]: {
      userMessage: "Too many requests. Please wait a moment and try again.",
      retryable: true,
      severity: 'MEDIUM'
    },
    [PaymentErrorType.FRAUD_DETECTED]: {
      userMessage: "Suspicious activity detected. Please contact support.",
      retryable: false,
      severity: 'CRITICAL'
    },
    [PaymentErrorType.SUSPICIOUS_ACTIVITY]: {
      userMessage: "Suspicious activity detected. Please contact support.",
      retryable: false,
      severity: 'CRITICAL'
    },
    [PaymentErrorType.IP_BLOCKED]: {
      userMessage: "Access denied. Please contact support.",
      retryable: false,
      severity: 'CRITICAL'
    },
    [PaymentErrorType.UNKNOWN_ERROR]: {
      userMessage: "An unexpected error occurred. Please try again or contact support.",
      retryable: true,
      severity: 'HIGH'
    },
    [PaymentErrorType.INTERNAL_SERVER_ERROR]: {
      userMessage: "Internal server error. Please try again later.",
      retryable: true,
      severity: 'HIGH'
    },
    [PaymentErrorType.SERVICE_UNAVAILABLE]: {
      userMessage: "Service temporarily unavailable. Please try again later.",
      retryable: true,
      severity: 'MEDIUM'
    }
  };

  static createError(
    type: PaymentErrorType,
    code: string,
    message: string,
    details?: any,
    gateway?: string
  ): PaymentError {
    const errorConfig = this.errorMessages[type];
    
    return {
      type,
      code,
      message,
      userMessage: errorConfig.userMessage,
      details,
      timestamp: new Date(),
      gateway,
      retryable: errorConfig.retryable,
      severity: errorConfig.severity
    };
  }

  static handleGatewayError(error: any, gateway: string): PaymentError {
    // Handle Paystack errors
    if (gateway === 'PAYSTACK') {
      return this.handlePaystackError(error);
    }
    
    // Handle Flutterwave errors
    if (gateway === 'FLUTTERWAVE') {
      return this.handleFlutterwaveError(error);
    }
    
    // Handle Stripe errors
    if (gateway === 'STRIPE') {
      return this.handleStripeError(error);
    }
    
    // Handle generic errors
    return this.handleGenericError(error, gateway);
  }

  private static handlePaystackError(error: any): PaymentError {
    const errorCode = error?.data?.gateway_response || error?.message || 'unknown';
    
    switch (errorCode.toLowerCase()) {
      case 'invalid key':
        return this.createError(
          PaymentErrorType.INVALID_CREDENTIALS,
          'PAYSTACK_INVALID_KEY',
          'Invalid Paystack secret key',
          error,
          'PAYSTACK'
        );
      case 'insufficient funds':
        return this.createError(
          PaymentErrorType.INSUFFICIENT_FUNDS,
          'PAYSTACK_INSUFFICIENT_FUNDS',
          'Insufficient funds in account',
          error,
          'PAYSTACK'
        );
      case 'invalid amount':
        return this.createError(
          PaymentErrorType.INVALID_AMOUNT,
          'PAYSTACK_INVALID_AMOUNT',
          'Invalid amount specified',
          error,
          'PAYSTACK'
        );
      case 'invalid email':
        return this.createError(
          PaymentErrorType.INVALID_EMAIL,
          'PAYSTACK_INVALID_EMAIL',
          'Invalid email address',
          error,
          'PAYSTACK'
        );
      case 'invalid reference':
        return this.createError(
          PaymentErrorType.INVALID_REFERENCE,
          'PAYSTACK_INVALID_REFERENCE',
          'Invalid transaction reference',
          error,
          'PAYSTACK'
        );
      default:
        return this.createError(
          PaymentErrorType.GATEWAY_ERROR,
          'PAYSTACK_ERROR',
          error?.message || 'Paystack payment error',
          error,
          'PAYSTACK'
        );
    }
  }

  private static handleFlutterwaveError(error: any): PaymentError {
    const errorCode = error?.status || error?.message || 'unknown';
    
    switch (errorCode.toLowerCase()) {
      case 'error':
        return this.createError(
          PaymentErrorType.GATEWAY_ERROR,
          'FLUTTERWAVE_ERROR',
          'Flutterwave payment error',
          error,
          'FLUTTERWAVE'
        );
      case 'insufficient funds':
        return this.createError(
          PaymentErrorType.INSUFFICIENT_FUNDS,
          'FLUTTERWAVE_INSUFFICIENT_FUNDS',
          'Insufficient funds',
          error,
          'FLUTTERWAVE'
        );
      default:
        return this.createError(
          PaymentErrorType.GATEWAY_ERROR,
          'FLUTTERWAVE_ERROR',
          error?.message || 'Flutterwave payment error',
          error,
          'FLUTTERWAVE'
        );
    }
  }

  private static handleStripeError(error: any): PaymentError {
    const errorType = error?.type || 'unknown';
    
    switch (errorType) {
      case 'card_error':
        return this.createError(
          PaymentErrorType.CARD_DECLINED,
          'STRIPE_CARD_DECLINED',
          'Card was declined',
          error,
          'STRIPE'
        );
      case 'validation_error':
        return this.createError(
          PaymentErrorType.MISSING_REQUIRED_FIELDS,
          'STRIPE_VALIDATION_ERROR',
          'Validation error',
          error,
          'STRIPE'
        );
      case 'api_error':
        return this.createError(
          PaymentErrorType.GATEWAY_ERROR,
          'STRIPE_API_ERROR',
          'Stripe API error',
          error,
          'STRIPE'
        );
      default:
        return this.createError(
          PaymentErrorType.GATEWAY_ERROR,
          'STRIPE_ERROR',
          error?.message || 'Stripe payment error',
          error,
          'STRIPE'
        );
    }
  }

  private static handleGenericError(error: any, gateway: string): PaymentError {
    if (error?.code === 'ECONNREFUSED') {
      return this.createError(
        PaymentErrorType.CONNECTION_REFUSED,
        'CONNECTION_REFUSED',
        'Connection refused',
        error,
        gateway
      );
    }
    
    if (error?.code === 'ETIMEDOUT') {
      return this.createError(
        PaymentErrorType.TIMEOUT_ERROR,
        'TIMEOUT_ERROR',
        'Request timed out',
        error,
        gateway
      );
    }
    
    if (error?.status === 429) {
      return this.createError(
        PaymentErrorType.RATE_LIMIT_EXCEEDED,
        'RATE_LIMIT_EXCEEDED',
        'Rate limit exceeded',
        error,
        gateway
      );
    }
    
    if (error?.status >= 500) {
      return this.createError(
        PaymentErrorType.INTERNAL_SERVER_ERROR,
        'INTERNAL_SERVER_ERROR',
        'Internal server error',
        error,
        gateway
      );
    }
    
    return this.createError(
      PaymentErrorType.UNKNOWN_ERROR,
      'UNKNOWN_ERROR',
      error?.message || 'Unknown error occurred',
      error,
      gateway
    );
  }

  static logError(error: PaymentError): void {
    const logEntry = {
      timestamp: error.timestamp.toISOString(),
      type: error.type,
      code: error.code,
      message: error.message,
      gateway: error.gateway,
      severity: error.severity,
      retryable: error.retryable,
      details: error.details
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Payment Error:', logEntry);
    }

    // In production, you would send this to a logging service
    // Example: Sentry, LogRocket, or custom logging service
    if (process.env.NODE_ENV === 'production') {
      // Send to logging service
      this.sendToLoggingService(logEntry);
    }
  }

  private static sendToLoggingService(logEntry: any): void {
    // Implementation for sending to logging service
    // This could be Sentry, LogRocket, or a custom service
    try {
      // Example: Send to external logging service
      fetch(process.env.LOGGING_SERVICE_URL || '', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logEntry)
      }).catch(() => {
        // Fallback to console if logging service fails
        console.error('Payment Error (Production):', logEntry);
      });
    } catch (error) {
      console.error('Failed to send error to logging service:', error);
    }
  }

  static shouldRetry(error: PaymentError): boolean {
    return error.retryable && error.severity !== 'CRITICAL';
  }

  static getRetryDelay(error: PaymentError, attempt: number): number {
    // Exponential backoff with jitter
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    const jitter = Math.random() * 0.1 * delay; // 10% jitter
    return delay + jitter;
  }
}

// Utility functions for common error scenarios
export const PaymentErrorUtils = {
  isNetworkError: (error: any): boolean => {
    return error?.code === 'ECONNREFUSED' || 
           error?.code === 'ETIMEDOUT' || 
           error?.code === 'ENOTFOUND';
  },

  isValidationError: (error: any): boolean => {
    return error?.status === 400 || 
           error?.type === 'validation_error';
  },

  isAuthenticationError: (error: any): boolean => {
    return error?.status === 401 || 
           error?.status === 403;
  },

  isRateLimitError: (error: any): boolean => {
    return error?.status === 429;
  },

  isServerError: (error: any): boolean => {
    return error?.status >= 500;
  }
}; 