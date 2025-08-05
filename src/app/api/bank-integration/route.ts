import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";
import { EnhancedPaymentGateway, BankTransferRequest, BankAccount } from "@/lib/payment-gateways";
import { PaymentErrorHandler, PaymentErrorType } from "@/lib/payment-errors";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      const error = PaymentErrorHandler.createError(
        PaymentErrorType.UNAUTHORIZED,
        'UNAUTHORIZED',
        'User not authenticated',
        null,
        'BANK'
      );
      return NextResponse.json({ 
        success: false, 
        error: error.userMessage,
        errorDetails: error
      }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'health':
        return await getBankHealth();
      case 'accounts':
        return await getUserBankAccounts(userId);
      case 'balance':
        return await getAccountBalance(userId, searchParams.get('accountId'));
      case 'transactions':
        return await getTransactionHistory(userId, searchParams.get('accountId'));
      default:
        return NextResponse.json({
          success: true,
          message: "Bank integration API",
          endpoints: [
            "GET /api/bank-integration?action=health",
            "GET /api/bank-integration?action=accounts",
            "GET /api/bank-integration?action=balance&accountId=xxx",
            "GET /api/bank-integration?action=transactions&accountId=xxx"
          ]
        });
    }
  } catch (error: any) {
    console.error("Bank integration GET error:", error);
    const paymentError = PaymentErrorHandler.handleGatewayError(error, 'BANK');
    return NextResponse.json({ 
      success: false, 
      error: paymentError.userMessage,
      errorDetails: paymentError
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      const error = PaymentErrorHandler.createError(
        PaymentErrorType.UNAUTHORIZED,
        'UNAUTHORIZED',
        'User not authenticated',
        null,
        'BANK'
      );
      return NextResponse.json({ 
        success: false, 
        error: error.userMessage,
        errorDetails: error
      }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'transfer':
        return await processBankTransfer(req, userId);
      case 'add-account':
        return await addBankAccount(req, userId);
      case 'verify-account':
        return await verifyBankAccount(req, userId);
      case 'remove-account':
        return await removeBankAccount(req, userId);
      default:
        return NextResponse.json({
          success: false,
          error: "Invalid action specified",
          supportedActions: ['transfer', 'add-account', 'verify-account', 'remove-account']
        }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Bank integration POST error:", error);
    const paymentError = PaymentErrorHandler.handleGatewayError(error, 'BANK');
    return NextResponse.json({ 
      success: false, 
      error: paymentError.userMessage,
      errorDetails: paymentError
    }, { status: 500 });
  }
}

// Helper functions
async function getBankHealth() {
  try {
    // Simulate bank API health check
    const healthChecks = await Promise.allSettled([
      checkBankConnectivity(),
      checkBankAPIVersion(),
      checkBankCredentials()
    ]);

    const results = healthChecks.map((result, index) => {
      if (result.status === 'fulfilled') {
        return { service: ['connectivity', 'api', 'credentials'][index], status: 'healthy' };
      } else {
        return { 
          service: ['connectivity', 'api', 'credentials'][index], 
          status: 'unhealthy',
          error: result.reason?.message 
        };
      }
    });

    const allHealthy = results.every(r => r.status === 'healthy');

    return NextResponse.json({
      success: true,
      healthy: allHealthy,
      services: results,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    const paymentError = PaymentErrorHandler.createError(
      PaymentErrorType.BANK_CONNECTION_FAILED,
      'HEALTH_CHECK_FAILED',
      'Bank health check failed',
      error,
      'BANK'
    );
    return NextResponse.json({ 
      success: false, 
      error: paymentError.userMessage,
      errorDetails: paymentError
    }, { status: 503 });
  }
}

async function getUserBankAccounts(userId: string) {
  try {
    const accounts = await prisma.connectedBank.findMany({
      where: { tutorId: userId },
      select: {
        id: true,
        bankName: true,
        accountNumber: true,
        routingNumber: true,
        balance: true,
        connected: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return NextResponse.json({
      success: true,
      accounts: accounts.map(account => ({
        ...account,
        accountNumber: maskAccountNumber(account.accountNumber),
        routingNumber: account.routingNumber ? maskRoutingNumber(account.routingNumber) : null
      }))
    });
  } catch (error: any) {
    const paymentError = PaymentErrorHandler.createError(
      PaymentErrorType.DATABASE_ERROR,
      'FETCH_ACCOUNTS_FAILED',
      'Failed to fetch bank accounts',
      error,
      'BANK'
    );
    return NextResponse.json({ 
      success: false, 
      error: paymentError.userMessage,
      errorDetails: paymentError
    }, { status: 500 });
  }
}

async function getAccountBalance(userId: string, accountId: string | null) {
  try {
    if (!accountId) {
      const error = PaymentErrorHandler.createError(
        PaymentErrorType.MISSING_REQUIRED_FIELDS,
        'MISSING_ACCOUNT_ID',
        'Account ID is required',
        null,
        'BANK'
      );
      return NextResponse.json({ 
        success: false, 
        error: error.userMessage,
        errorDetails: error
      }, { status: 400 });
    }

    const account = await prisma.connectedBank.findFirst({
      where: { 
        id: accountId,
        tutorId: userId 
      }
    });

    if (!account) {
      const error = PaymentErrorHandler.createError(
        PaymentErrorType.BANK_ACCOUNT_NOT_FOUND,
        'ACCOUNT_NOT_FOUND',
        'Bank account not found',
        { accountId },
        'BANK'
      );
      return NextResponse.json({ 
        success: false, 
        error: error.userMessage,
        errorDetails: error
      }, { status: 404 });
    }

    // Simulate real-time balance check
    const realTimeBalance = await simulateBalanceCheck(account);

    return NextResponse.json({
      success: true,
      accountId: account.id,
      bankName: account.bankName,
      balance: realTimeBalance,
      lastUpdated: new Date().toISOString()
    });
  } catch (error: any) {
    const paymentError = PaymentErrorHandler.createError(
      PaymentErrorType.BANK_CONNECTION_FAILED,
      'BALANCE_CHECK_FAILED',
      'Failed to check account balance',
      error,
      'BANK'
    );
    return NextResponse.json({ 
      success: false, 
      error: paymentError.userMessage,
      errorDetails: paymentError
    }, { status: 500 });
  }
}

async function getTransactionHistory(userId: string, accountId: string | null) {
  try {
    if (!accountId) {
      const error = PaymentErrorHandler.createError(
        PaymentErrorType.MISSING_REQUIRED_FIELDS,
        'MISSING_ACCOUNT_ID',
        'Account ID is required',
        null,
        'BANK'
      );
      return NextResponse.json({ 
        success: false, 
        error: error.userMessage,
        errorDetails: error
      }, { status: 400 });
    }

    // Verify account ownership
    const account = await prisma.connectedBank.findFirst({
      where: { 
        id: accountId,
        tutorId: userId 
      }
    });

    if (!account) {
      const error = PaymentErrorHandler.createError(
        PaymentErrorType.BANK_ACCOUNT_NOT_FOUND,
        'ACCOUNT_NOT_FOUND',
        'Bank account not found',
        { accountId },
        'BANK'
      );
      return NextResponse.json({ 
        success: false, 
        error: error.userMessage,
        errorDetails: error
      }, { status: 404 });
    }

    // Simulate transaction history
    const transactions = await simulateTransactionHistory(accountId);

    return NextResponse.json({
      success: true,
      accountId: account.id,
      bankName: account.bankName,
      transactions,
      totalCount: transactions.length
    });
  } catch (error: any) {
    const paymentError = PaymentErrorHandler.createError(
      PaymentErrorType.BANK_CONNECTION_FAILED,
      'TRANSACTION_HISTORY_FAILED',
      'Failed to fetch transaction history',
      error,
      'BANK'
    );
    return NextResponse.json({ 
      success: false, 
      error: paymentError.userMessage,
      errorDetails: paymentError
    }, { status: 500 });
  }
}

async function processBankTransfer(req: NextRequest, userId: string) {
  try {
    const transferData = await req.json();
    
    // Validate transfer request
    const validationError = validateTransferRequest(transferData);
    if (validationError) {
      return NextResponse.json({ 
        success: false, 
        error: validationError.userMessage,
        errorDetails: validationError
      }, { status: 400 });
    }

    // Verify source account ownership
    const sourceAccount = await prisma.connectedBank.findFirst({
      where: { 
        id: transferData.sourceAccountId,
        tutorId: userId 
      }
    });

    if (!sourceAccount) {
      const error = PaymentErrorHandler.createError(
        PaymentErrorType.BANK_ACCOUNT_NOT_FOUND,
        'SOURCE_ACCOUNT_NOT_FOUND',
        'Source account not found',
        { sourceAccountId: transferData.sourceAccountId },
        'BANK'
      );
      return NextResponse.json({ 
        success: false, 
        error: error.userMessage,
        errorDetails: error
      }, { status: 404 });
    }

    // Create bank transfer request
    const bankTransferRequest: BankTransferRequest = {
      amount: transferData.amount,
      currency: transferData.currency,
      sourceAccount: {
        id: sourceAccount.id,
        accountNumber: sourceAccount.accountNumber,
        routingNumber: sourceAccount.routingNumber || '',
        bankName: sourceAccount.bankName,
        accountType: 'checking',
        isVerified: sourceAccount.connected
      },
      destinationAccount: transferData.destinationAccount,
      description: transferData.description,
      reference: `transfer_${Date.now()}`
    };

    // Process transfer using enhanced gateway
    const transferResult = await EnhancedPaymentGateway.processBankTransfer(bankTransferRequest);

    return NextResponse.json(transferResult);
  } catch (error: any) {
    console.error("Bank transfer error:", error);
    const paymentError = PaymentErrorHandler.handleGatewayError(error, 'BANK');
    return NextResponse.json({ 
      success: false, 
      error: paymentError.userMessage,
      errorDetails: paymentError
    }, { status: 500 });
  }
}

async function addBankAccount(req: NextRequest, userId: string) {
  try {
    const accountData = await req.json();
    
    // Validate account data
    if (!accountData.bankName || !accountData.accountNumber || !accountData.routingNumber) {
      const error = PaymentErrorHandler.createError(
        PaymentErrorType.MISSING_REQUIRED_FIELDS,
        'MISSING_ACCOUNT_FIELDS',
        'Bank name, account number, and routing number are required',
        accountData,
        'BANK'
      );
      return NextResponse.json({ 
        success: false, 
        error: error.userMessage,
        errorDetails: error
      }, { status: 400 });
    }

    // Validate account number format
    if (!isValidAccountNumber(accountData.accountNumber)) {
      const error = PaymentErrorHandler.createError(
        PaymentErrorType.BANK_ACCOUNT_INVALID,
        'INVALID_ACCOUNT_NUMBER',
        'Invalid account number format',
        { accountNumber: accountData.accountNumber },
        'BANK'
      );
      return NextResponse.json({ 
        success: false, 
        error: error.userMessage,
        errorDetails: error
      }, { status: 400 });
    }

    // Validate routing number format
    if (!isValidRoutingNumber(accountData.routingNumber)) {
      const error = PaymentErrorHandler.createError(
        PaymentErrorType.BANK_ROUTING_INVALID,
        'INVALID_ROUTING_NUMBER',
        'Invalid routing number format',
        { routingNumber: accountData.routingNumber },
        'BANK'
      );
      return NextResponse.json({ 
        success: false, 
        error: error.userMessage,
        errorDetails: error
      }, { status: 400 });
    }

    // Check for duplicate account
    const existingAccount = await prisma.connectedBank.findFirst({
      where: {
        tutorId: userId,
        accountNumber: accountData.accountNumber,
        bankName: accountData.bankName
      }
    });

    if (existingAccount) {
      const error = PaymentErrorHandler.createError(
        PaymentErrorType.BANK_ACCOUNT_INVALID,
        'DUPLICATE_ACCOUNT',
        'Bank account already exists',
        { accountNumber: accountData.accountNumber },
        'BANK'
      );
      return NextResponse.json({ 
        success: false, 
        error: error.userMessage,
        errorDetails: error
      }, { status: 400 });
    }

    // Create bank account
    const bankAccount = await prisma.connectedBank.create({
      data: {
        tutorId: userId,
        bankName: accountData.bankName,
        accountNumber: accountData.accountNumber,
        routingNumber: accountData.routingNumber,
        connected: false, // Will be verified separately
        balance: 0
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Bank account added successfully',
      account: {
        id: bankAccount.id,
        bankName: bankAccount.bankName,
        accountNumber: maskAccountNumber(bankAccount.accountNumber),
        routingNumber: maskRoutingNumber(bankAccount.routingNumber || ''),
        connected: bankAccount.connected,
        balance: bankAccount.balance
      }
    });
  } catch (error: any) {
    console.error("Add bank account error:", error);
    const paymentError = PaymentErrorHandler.handleGatewayError(error, 'BANK');
    return NextResponse.json({ 
      success: false, 
      error: paymentError.userMessage,
      errorDetails: paymentError
    }, { status: 500 });
  }
}

async function verifyBankAccount(req: NextRequest, userId: string) {
  try {
    const { accountId } = await req.json();
    
    if (!accountId) {
      const error = PaymentErrorHandler.createError(
        PaymentErrorType.MISSING_REQUIRED_FIELDS,
        'MISSING_ACCOUNT_ID',
        'Account ID is required',
        null,
        'BANK'
      );
      return NextResponse.json({ 
        success: false, 
        error: error.userMessage,
        errorDetails: error
      }, { status: 400 });
    }

    // Find account
    const account = await prisma.connectedBank.findFirst({
      where: { 
        id: accountId,
        tutorId: userId 
      }
    });

    if (!account) {
      const error = PaymentErrorHandler.createError(
        PaymentErrorType.BANK_ACCOUNT_NOT_FOUND,
        'ACCOUNT_NOT_FOUND',
        'Bank account not found',
        { accountId },
        'BANK'
      );
      return NextResponse.json({ 
        success: false, 
        error: error.userMessage,
        errorDetails: error
      }, { status: 404 });
    }

    // Simulate account verification
    const verificationResult = await simulateAccountVerification(account);

    if (verificationResult.verified) {
      await prisma.connectedBank.update({
        where: { id: accountId },
        data: { 
          connected: true,
          balance: verificationResult.balance || 0
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Bank account verified successfully',
        account: {
          id: account.id,
          bankName: account.bankName,
          accountNumber: maskAccountNumber(account.accountNumber),
          connected: true,
          balance: verificationResult.balance || 0
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Account verification failed',
        details: verificationResult.error
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Verify bank account error:", error);
    const paymentError = PaymentErrorHandler.handleGatewayError(error, 'BANK');
    return NextResponse.json({ 
      success: false, 
      error: paymentError.userMessage,
      errorDetails: paymentError
    }, { status: 500 });
  }
}

async function removeBankAccount(req: NextRequest, userId: string) {
  try {
    const { accountId } = await req.json();
    
    if (!accountId) {
      const error = PaymentErrorHandler.createError(
        PaymentErrorType.MISSING_REQUIRED_FIELDS,
        'MISSING_ACCOUNT_ID',
        'Account ID is required',
        null,
        'BANK'
      );
      return NextResponse.json({ 
        success: false, 
        error: error.userMessage,
        errorDetails: error
      }, { status: 400 });
    }

    // Verify account ownership
    const account = await prisma.connectedBank.findFirst({
      where: { 
        id: accountId,
        tutorId: userId 
      }
    });

    if (!account) {
      const error = PaymentErrorHandler.createError(
        PaymentErrorType.BANK_ACCOUNT_NOT_FOUND,
        'ACCOUNT_NOT_FOUND',
        'Bank account not found',
        { accountId },
        'BANK'
      );
      return NextResponse.json({ 
        success: false, 
        error: error.userMessage,
        errorDetails: error
      }, { status: 404 });
    }

    // Delete account
    await prisma.connectedBank.delete({
      where: { id: accountId }
    });

    return NextResponse.json({
      success: true,
      message: 'Bank account removed successfully'
    });
  } catch (error: any) {
    console.error("Remove bank account error:", error);
    const paymentError = PaymentErrorHandler.handleGatewayError(error, 'BANK');
    return NextResponse.json({ 
      success: false, 
      error: paymentError.userMessage,
      errorDetails: paymentError
    }, { status: 500 });
  }
}

// Validation and utility functions
function validateTransferRequest(data: any): any {
  if (!data.amount || data.amount <= 0) {
    return PaymentErrorHandler.createError(
      PaymentErrorType.INVALID_AMOUNT,
      'INVALID_AMOUNT',
      'Transfer amount must be greater than 0',
      data
    );
  }

  if (!data.sourceAccountId) {
    return PaymentErrorHandler.createError(
      PaymentErrorType.MISSING_REQUIRED_FIELDS,
      'MISSING_SOURCE_ACCOUNT',
      'Source account ID is required',
      data
    );
  }

  if (!data.destinationAccount || !data.destinationAccount.accountNumber) {
    return PaymentErrorHandler.createError(
      PaymentErrorType.MISSING_REQUIRED_FIELDS,
      'MISSING_DESTINATION_ACCOUNT',
      'Destination account details are required',
      data
    );
  }

  return null;
}

function isValidAccountNumber(accountNumber: string): boolean {
  return /^\d{8,17}$/.test(accountNumber);
}

function isValidRoutingNumber(routingNumber: string): boolean {
  return /^\d{9}$/.test(routingNumber);
}

function maskAccountNumber(accountNumber: string): string {
  if (accountNumber.length <= 4) return accountNumber;
  return `****${accountNumber.slice(-4)}`;
}

function maskRoutingNumber(routingNumber: string): string {
  if (routingNumber.length <= 4) return routingNumber;
  return `****${routingNumber.slice(-4)}`;
}

// Simulation functions (replace with real bank API calls)
async function checkBankConnectivity(): Promise<boolean> {
  await new Promise(resolve => setTimeout(resolve, 100));
  return Math.random() > 0.1; // 90% success rate
}

async function checkBankAPIVersion(): Promise<boolean> {
  await new Promise(resolve => setTimeout(resolve, 50));
  return true;
}

async function checkBankCredentials(): Promise<boolean> {
  await new Promise(resolve => setTimeout(resolve, 200));
  return Math.random() > 0.05; // 95% success rate
}

async function simulateBalanceCheck(account: any): Promise<number> {
  await new Promise(resolve => setTimeout(resolve, 300));
  // Simulate balance variation
  const variation = (Math.random() - 0.5) * 100;
  return Math.max(0, account.balance + variation);
}

async function simulateTransactionHistory(accountId: string): Promise<any[]> {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const transactions = [];
  const types = ['DEPOSIT', 'WITHDRAWAL', 'TRANSFER'];
  const descriptions = ['Salary', 'Payment', 'Transfer', 'Withdrawal', 'Deposit'];
  
  for (let i = 0; i < 10; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    transactions.push({
      id: `tx_${accountId}_${i}`,
      type: types[Math.floor(Math.random() * types.length)],
      amount: Math.random() * 1000,
      description: descriptions[Math.floor(Math.random() * descriptions.length)],
      date: date.toISOString(),
      status: 'COMPLETED'
    });
  }
  
  return transactions;
}

async function simulateAccountVerification(account: any): Promise<{ verified: boolean; balance?: number; error?: string }> {
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simulate verification failure (10% chance)
  if (Math.random() < 0.1) {
    return {
      verified: false,
      error: 'Account verification failed - please check your details'
    };
  }
  
  return {
    verified: true,
    balance: Math.random() * 10000 // Random initial balance
  };
} 