import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { EnhancedPaymentGateway } from "@/lib/payment-gateways";
import { PaymentErrorHandler, PaymentErrorType } from "@/lib/payment-errors";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      const error = PaymentErrorHandler.createError(
        PaymentErrorType.UNAUTHORIZED,
        'UNAUTHORIZED',
        'User not authenticated',
        null,
        'MONITORING'
      );
      return NextResponse.json({ 
        success: false, 
        error: error.userMessage,
        errorDetails: error
      }, { status: 401 });
    }

    // Check if user is admin (you can modify this based on your role system)
    if ((session.user as any).role !== 'ADMIN') {
      const error = PaymentErrorHandler.createError(
        PaymentErrorType.UNAUTHORIZED,
        'INSUFFICIENT_PERMISSIONS',
        'Admin access required for monitoring',
        null,
        'MONITORING'
      );
      return NextResponse.json({ 
        success: false, 
        error: error.userMessage,
        errorDetails: error
      }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'all';

    let monitoringData: any = {};

    switch (type) {
      case 'gateways':
        monitoringData = await getGatewayHealth();
        break;
      case 'bank':
        monitoringData = await getBankHealth();
        break;
      case 'system':
        monitoringData = await getSystemHealth();
        break;
      case 'all':
      default:
        monitoringData = await getAllHealthChecks();
        break;
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      type,
      data: monitoringData
    });

  } catch (error: any) {
    console.error("Bank integration monitoring error:", error);
    const paymentError = PaymentErrorHandler.handleGatewayError(error, 'MONITORING');
    return NextResponse.json({ 
      success: false, 
      error: paymentError.userMessage,
      errorDetails: paymentError
    }, { status: 500 });
  }
}

async function getGatewayHealth() {
  try {
    const gatewayHealth = await EnhancedPaymentGateway.getAllGatewaysHealth();
    
    const summary = {
      total: Object.keys(gatewayHealth).length,
      healthy: Object.values(gatewayHealth).filter(h => h.healthy).length,
      unhealthy: Object.values(gatewayHealth).filter(h => !h.healthy).length,
      averageResponseTime: Object.values(gatewayHealth)
        .filter(h => h.healthy)
        .reduce((sum, h) => sum + h.responseTime, 0) / 
        Object.values(gatewayHealth).filter(h => h.healthy).length || 0
    };

    return {
      summary,
      details: gatewayHealth
    };
  } catch (error) {
    console.error("Gateway health check error:", error);
    return {
      summary: { total: 0, healthy: 0, unhealthy: 0, averageResponseTime: 0 },
      details: {},
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function getBankHealth() {
  try {
    // Simulate bank API health checks
    const healthChecks = await Promise.allSettled([
      checkBankConnectivity(),
      checkBankAPIVersion(),
      checkBankCredentials(),
      checkBankTransactionAPI(),
      checkBankAccountAPI()
    ]);

    const services = [
      'connectivity',
      'api_version',
      'credentials',
      'transaction_api',
      'account_api'
    ];

    const results = healthChecks.map((result, index) => {
      if (result.status === 'fulfilled') {
        return { 
          service: services[index], 
          status: 'healthy',
          responseTime: Math.random() * 1000 + 100 // Simulate response time
        };
      } else {
        return { 
          service: services[index], 
          status: 'unhealthy',
          error: result.reason?.message || 'Check failed',
          responseTime: 0
        };
      }
    });

    const summary = {
      total: results.length,
      healthy: results.filter(r => r.status === 'healthy').length,
      unhealthy: results.filter(r => r.status === 'unhealthy').length,
      averageResponseTime: results
        .filter(r => r.status === 'healthy')
        .reduce((sum, r) => sum + (r.responseTime || 0), 0) / 
        results.filter(r => r.status === 'healthy').length || 0
    };

    return {
      summary,
      details: results
    };
  } catch (error) {
    console.error("Bank health check error:", error);
    return {
      summary: { total: 0, healthy: 0, unhealthy: 0, averageResponseTime: 0 },
      details: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function getSystemHealth() {
  try {
    const systemChecks = await Promise.allSettled([
      checkDatabaseConnection(),
      checkRedisConnection(),
      checkEnvironmentVariables(),
      checkDiskSpace(),
      checkMemoryUsage()
    ]);

    const services = [
      'database',
      'redis',
      'environment',
      'disk_space',
      'memory'
    ];

    const results = systemChecks.map((result, index) => {
      if (result.status === 'fulfilled') {
        return { 
          service: services[index], 
          status: 'healthy',
          details: result.value
        };
      } else {
        return { 
          service: services[index], 
          status: 'unhealthy',
          error: result.reason?.message || 'Check failed'
        };
      }
    });

    const summary = {
      total: results.length,
      healthy: results.filter(r => r.status === 'healthy').length,
      unhealthy: results.filter(r => r.status === 'unhealthy').length
    };

    return {
      summary,
      details: results
    };
  } catch (error) {
    console.error("System health check error:", error);
    return {
      summary: { total: 0, healthy: 0, unhealthy: 0 },
      details: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function getAllHealthChecks() {
  try {
    const [gatewayHealth, bankHealth, systemHealth] = await Promise.all([
      getGatewayHealth(),
      getBankHealth(),
      getSystemHealth()
    ]);

    const overallSummary = {
      gateway: gatewayHealth.summary,
      bank: bankHealth.summary,
      system: systemHealth.summary,
      overall: {
        total: gatewayHealth.summary.total + bankHealth.summary.total + systemHealth.summary.total,
        healthy: gatewayHealth.summary.healthy + bankHealth.summary.healthy + systemHealth.summary.healthy,
        unhealthy: gatewayHealth.summary.unhealthy + bankHealth.summary.unhealthy + systemHealth.summary.unhealthy
      }
    };

    return {
      summary: overallSummary,
      gateway: gatewayHealth,
      bank: bankHealth,
      system: systemHealth
    };
  } catch (error) {
    console.error("All health checks error:", error);
    return {
      summary: { overall: { total: 0, healthy: 0, unhealthy: 0 } },
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Simulation functions for health checks
async function checkBankConnectivity(): Promise<boolean> {
  await new Promise(resolve => setTimeout(resolve, 100));
  return Math.random() > 0.1;
}

async function checkBankAPIVersion(): Promise<boolean> {
  await new Promise(resolve => setTimeout(resolve, 50));
  return true;
}

async function checkBankCredentials(): Promise<boolean> {
  await new Promise(resolve => setTimeout(resolve, 200));
  return Math.random() > 0.05;
}

async function checkBankTransactionAPI(): Promise<boolean> {
  await new Promise(resolve => setTimeout(resolve, 150));
  return Math.random() > 0.08;
}

async function checkBankAccountAPI(): Promise<boolean> {
  await new Promise(resolve => setTimeout(resolve, 120));
  return Math.random() > 0.07;
}

async function checkDatabaseConnection(): Promise<any> {
  await new Promise(resolve => setTimeout(resolve, 80));
  return {
    status: 'connected',
    responseTime: Math.random() * 50 + 10
  };
}

async function checkRedisConnection(): Promise<any> {
  await new Promise(resolve => setTimeout(resolve, 60));
  return {
    status: 'connected',
    responseTime: Math.random() * 30 + 5
  };
}

async function checkEnvironmentVariables(): Promise<any> {
  await new Promise(resolve => setTimeout(resolve, 20));
  const requiredVars = [
    'PAYSTACK_SECRET_KEY',
    'FLUTTERWAVE_SECRET_KEY',
    'STRIPE_SECRET_KEY',
    'DATABASE_URL',
    'NEXTAUTH_SECRET'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  return {
    status: missingVars.length === 0 ? 'healthy' : 'warning',
    missingVariables: missingVars,
    totalRequired: requiredVars.length,
    configured: requiredVars.length - missingVars.length
  };
}

async function checkDiskSpace(): Promise<any> {
  await new Promise(resolve => setTimeout(resolve, 40));
  const usedSpace = Math.random() * 100;
  const totalSpace = 100;
  const freeSpace = totalSpace - usedSpace;
  
  return {
    used: usedSpace.toFixed(2) + '%',
    free: freeSpace.toFixed(2) + '%',
    status: usedSpace < 80 ? 'healthy' : 'warning'
  };
}

async function checkMemoryUsage(): Promise<any> {
  await new Promise(resolve => setTimeout(resolve, 30));
  const usedMemory = Math.random() * 100;
  
  return {
    used: usedMemory.toFixed(2) + '%',
    status: usedMemory < 85 ? 'healthy' : 'warning'
  };
} 