// Payment Monitoring and Analytics System
export interface PaymentMetrics {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  totalAmount: number;
  averageAmount: number;
  successRate: number;
  averageResponseTime: number;
  errorsByType: Record<string, number>;
  errorsByGateway: Record<string, number>;
  transactionsByGateway: Record<string, number>;
  transactionsByCurrency: Record<string, number>;
  hourlyDistribution: Record<string, number>;
  dailyDistribution: Record<string, number>;
}

export interface ErrorLog {
  id: string;
  timestamp: Date;
  type: string;
  code: string;
  message: string;
  gateway: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  userId?: string;
  bookingId?: string;
  amount?: number;
  currency?: string;
  retryCount: number;
  resolved: boolean;
  resolutionTime?: Date;
  stackTrace?: string;
  context?: any;
}

export interface PerformanceMetrics {
  gateway: string;
  endpoint: string;
  responseTime: number;
  statusCode: number;
  timestamp: Date;
  success: boolean;
  errorType?: string;
}

export class PaymentMonitoring {
  private static errorLogs: ErrorLog[] = [];
  private static performanceMetrics: PerformanceMetrics[] = [];
  private static transactionLogs: any[] = [];

  // Error logging
  static logError(error: any, context?: any): void {
    const errorLog: ErrorLog = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: error.type || 'UNKNOWN',
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message || 'Unknown error occurred',
      gateway: error.gateway || 'UNKNOWN',
      severity: error.severity || 'MEDIUM',
      userId: context?.userId,
      bookingId: context?.bookingId,
      amount: context?.amount,
      currency: context?.currency,
      retryCount: context?.retryCount || 0,
      resolved: false,
      stackTrace: error.stack,
      context
    };

    this.errorLogs.push(errorLog);

    // Keep only last 1000 errors in memory
    if (this.errorLogs.length > 1000) {
      this.errorLogs = this.errorLogs.slice(-1000);
    }

    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalLoggingService(errorLog);
    }

    console.error('Payment Error Logged:', errorLog);
  }

  // Performance tracking
  static logPerformance(metrics: Omit<PerformanceMetrics, 'timestamp'>): void {
    const performanceMetric: PerformanceMetrics = {
      ...metrics,
      timestamp: new Date()
    };

    this.performanceMetrics.push(performanceMetric);

    // Keep only last 5000 performance metrics in memory
    if (this.performanceMetrics.length > 5000) {
      this.performanceMetrics = this.performanceMetrics.slice(-5000);
    }
  }

  // Transaction logging
  static logTransaction(transaction: any): void {
    const transactionLog = {
      ...transaction,
      timestamp: new Date(),
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    this.transactionLogs.push(transactionLog);

    // Keep only last 10000 transactions in memory
    if (this.transactionLogs.length > 10000) {
      this.transactionLogs = this.transactionLogs.slice(-10000);
    }
  }

  // Get error statistics
  static getErrorStatistics(timeRange: '1h' | '24h' | '7d' | '30d' = '24h'): any {
    const now = new Date();
    const timeRanges = {
      '1h': new Date(now.getTime() - 60 * 60 * 1000),
      '24h': new Date(now.getTime() - 24 * 60 * 60 * 1000),
      '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    };

    const filteredErrors = this.errorLogs.filter(
      error => error.timestamp >= timeRanges[timeRange]
    );

    const errorsByType = filteredErrors.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const errorsByGateway = filteredErrors.reduce((acc, error) => {
      acc[error.gateway] = (acc[error.gateway] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const errorsBySeverity = filteredErrors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalErrors: filteredErrors.length,
      errorsByType,
      errorsByGateway,
      errorsBySeverity,
      unresolvedErrors: filteredErrors.filter(e => !e.resolved).length,
      averageResolutionTime: this.calculateAverageResolutionTime(filteredErrors)
    };
  }

  // Get performance statistics
  static getPerformanceStatistics(timeRange: '1h' | '24h' | '7d' | '30d' = '24h'): any {
    const now = new Date();
    const timeRanges = {
      '1h': new Date(now.getTime() - 60 * 60 * 1000),
      '24h': new Date(now.getTime() - 24 * 60 * 60 * 1000),
      '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    };

    const filteredMetrics = this.performanceMetrics.filter(
      metric => metric.timestamp >= timeRanges[timeRange]
    );

    const performanceByGateway = filteredMetrics.reduce((acc, metric) => {
      if (!acc[metric.gateway]) {
        acc[metric.gateway] = {
          total: 0,
          successful: 0,
          failed: 0,
          totalResponseTime: 0,
          averageResponseTime: 0
        };
      }
      
      acc[metric.gateway].total++;
      if (metric.success) {
        acc[metric.gateway].successful++;
      } else {
        acc[metric.gateway].failed++;
      }
      acc[metric.gateway].totalResponseTime += metric.responseTime;
      
      return acc;
    }, {} as Record<string, any>);

    // Calculate averages
    Object.keys(performanceByGateway).forEach(gateway => {
      const gatewayMetrics = performanceByGateway[gateway];
      gatewayMetrics.averageResponseTime = gatewayMetrics.total > 0 
        ? gatewayMetrics.totalResponseTime / gatewayMetrics.total 
        : 0;
      gatewayMetrics.successRate = gatewayMetrics.total > 0 
        ? (gatewayMetrics.successful / gatewayMetrics.total) * 100 
        : 0;
    });

    return {
      totalRequests: filteredMetrics.length,
      performanceByGateway,
      overallAverageResponseTime: filteredMetrics.length > 0 
        ? filteredMetrics.reduce((sum, m) => sum + m.responseTime, 0) / filteredMetrics.length 
        : 0,
      overallSuccessRate: filteredMetrics.length > 0 
        ? (filteredMetrics.filter(m => m.success).length / filteredMetrics.length) * 100 
        : 0
    };
  }

  // Get transaction statistics
  static getTransactionStatistics(timeRange: '1h' | '24h' | '7d' | '30d' = '24h'): PaymentMetrics {
    const now = new Date();
    const timeRanges = {
      '1h': new Date(now.getTime() - 60 * 60 * 1000),
      '24h': new Date(now.getTime() - 24 * 60 * 60 * 1000),
      '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    };

    const filteredTransactions = this.transactionLogs.filter(
      transaction => transaction.timestamp >= timeRanges[timeRange]
    );

    const successfulTransactions = filteredTransactions.filter(t => t.status === 'success');
    const failedTransactions = filteredTransactions.filter(t => t.status === 'failed');

    const totalAmount = successfulTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const averageAmount = successfulTransactions.length > 0 
      ? totalAmount / successfulTransactions.length 
      : 0;

    const successRate = filteredTransactions.length > 0 
      ? (successfulTransactions.length / filteredTransactions.length) * 100 
      : 0;

    const transactionsByGateway = filteredTransactions.reduce((acc, t) => {
      acc[t.gateway] = (acc[t.gateway] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const transactionsByCurrency = filteredTransactions.reduce((acc, t) => {
      acc[t.currency] = (acc[t.currency] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const hourlyDistribution = this.getHourlyDistribution(filteredTransactions);
    const dailyDistribution = this.getDailyDistribution(filteredTransactions);

    return {
      totalTransactions: filteredTransactions.length,
      successfulTransactions: successfulTransactions.length,
      failedTransactions: failedTransactions.length,
      totalAmount,
      averageAmount,
      successRate,
      averageResponseTime: this.calculateAverageResponseTime(filteredTransactions),
      errorsByType: this.getErrorsByType(filteredTransactions),
      errorsByGateway: this.getErrorsByGateway(filteredTransactions),
      transactionsByGateway,
      transactionsByCurrency,
      hourlyDistribution,
      dailyDistribution
    };
  }

  // Get system health overview
  static getSystemHealth(): any {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recentErrors = this.errorLogs.filter(e => e.timestamp >= last24h);
    const recentTransactions = this.transactionLogs.filter(t => t.timestamp >= last24h);
    const recentPerformance = this.performanceMetrics.filter(p => p.timestamp >= last24h);

    const criticalErrors = recentErrors.filter(e => e.severity === 'CRITICAL');
    const unresolvedErrors = recentErrors.filter(e => !e.resolved);

    return {
      status: this.determineSystemStatus(criticalErrors, unresolvedErrors, recentTransactions),
      lastUpdated: now.toISOString(),
      errors: {
        total: recentErrors.length,
        critical: criticalErrors.length,
        unresolved: unresolvedErrors.length,
        bySeverity: this.groupErrorsBySeverity(recentErrors)
      },
      transactions: {
        total: recentTransactions.length,
        successRate: recentTransactions.length > 0 
          ? (recentTransactions.filter(t => t.status === 'success').length / recentTransactions.length) * 100 
          : 0
      },
      performance: {
        averageResponseTime: recentPerformance.length > 0 
          ? recentPerformance.reduce((sum, p) => sum + p.responseTime, 0) / recentPerformance.length 
          : 0,
        totalRequests: recentPerformance.length
      }
    };
  }

  // Private helper methods
  private static calculateAverageResolutionTime(errors: ErrorLog[]): number {
    const resolvedErrors = errors.filter(e => e.resolved && e.resolutionTime);
    if (resolvedErrors.length === 0) return 0;

    const totalResolutionTime = resolvedErrors.reduce((sum, error) => {
      return sum + (error.resolutionTime!.getTime() - error.timestamp.getTime());
    }, 0);

    return totalResolutionTime / resolvedErrors.length;
  }

  private static calculateAverageResponseTime(transactions: any[]): number {
    if (transactions.length === 0) return 0;
    
    const totalResponseTime = transactions.reduce((sum, t) => sum + (t.responseTime || 0), 0);
    return totalResponseTime / transactions.length;
  }

  private static getHourlyDistribution(transactions: any[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    for (let hour = 0; hour < 24; hour++) {
      const hourKey = hour.toString().padStart(2, '0');
      distribution[hourKey] = 0;
    }

    transactions.forEach(transaction => {
      const hour = transaction.timestamp.getHours().toString().padStart(2, '0');
      distribution[hour]++;
    });

    return distribution;
  }

  private static getDailyDistribution(transactions: any[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    transactions.forEach(transaction => {
      const date = transaction.timestamp.toISOString().split('T')[0];
      distribution[date] = (distribution[date] || 0) + 1;
    });

    return distribution;
  }

  private static getErrorsByType(transactions: any[]): Record<string, number> {
    return transactions
      .filter(t => t.status === 'failed')
      .reduce((acc, t) => {
        acc[t.errorType || 'unknown'] = (acc[t.errorType || 'unknown'] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
  }

  private static getErrorsByGateway(transactions: any[]): Record<string, number> {
    return transactions
      .filter(t => t.status === 'failed')
      .reduce((acc, t) => {
        acc[t.gateway || 'unknown'] = (acc[t.gateway || 'unknown'] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
  }

  private static groupErrorsBySeverity(errors: ErrorLog[]): Record<string, number> {
    return errors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private static determineSystemStatus(
    criticalErrors: ErrorLog[], 
    unresolvedErrors: ErrorLog[], 
    transactions: any[]
  ): 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'DOWN' {
    if (criticalErrors.length > 0) return 'CRITICAL';
    if (unresolvedErrors.length > 10) return 'WARNING';
    if (transactions.length === 0) return 'DOWN';
    return 'HEALTHY';
  }

  private static sendToExternalLoggingService(errorLog: ErrorLog): void {
    // Implementation for sending to external logging service
    // This could be Sentry, LogRocket, or a custom service
    try {
      if (process.env.LOGGING_SERVICE_URL) {
        fetch(process.env.LOGGING_SERVICE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'payment_error',
            data: errorLog
          })
        }).catch(() => {
          // Silently fail if external logging fails
        });
      }
    } catch (error) {
      // Silently fail if external logging fails
    }
  }

  // Cleanup old data
  static cleanup(): void {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    this.errorLogs = this.errorLogs.filter(error => error.timestamp >= thirtyDaysAgo);
    this.performanceMetrics = this.performanceMetrics.filter(metric => metric.timestamp >= thirtyDaysAgo);
    this.transactionLogs = this.transactionLogs.filter(transaction => transaction.timestamp >= thirtyDaysAgo);
  }

  // Export data for backup
  static exportData(): any {
    return {
      errorLogs: this.errorLogs,
      performanceMetrics: this.performanceMetrics,
      transactionLogs: this.transactionLogs,
      exportedAt: new Date().toISOString()
    };
  }

  // Import data from backup
  static importData(data: any): void {
    if (data.errorLogs) this.errorLogs = data.errorLogs;
    if (data.performanceMetrics) this.performanceMetrics = data.performanceMetrics;
    if (data.transactionLogs) this.transactionLogs = data.transactionLogs;
  }
}

// Auto-cleanup every 24 hours
if (typeof window === 'undefined') {
  setInterval(() => {
    PaymentMonitoring.cleanup();
  }, 24 * 60 * 60 * 1000);
} 