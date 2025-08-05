"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import StudentNavbar from "@/components/StudentNavbar";
import { useTranslation } from "react-i18next";
import './wallet-premium.css';

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank';
  last4?: string;
  brand?: string;
  isDefault: boolean;
  expiryMonth?: number;
  expiryYear?: number;
}

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed';
  type: 'payment' | 'refund' | 'credit';
  description: string;
  tutorName?: string;
  createdAt: string;
}

export default function WalletPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showAddCard, setShowAddCard] = useState(false);
  const [isAddingFunds, setIsAddingFunds] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'transactions' | 'methods'>('overview');
  const [showQuickActions, setShowQuickActions] = useState(false);

  // Background refresh function that doesn't show loading state
  const backgroundRefresh = useCallback(async () => {
    try {
      setIsBackgroundRefreshing(true);
      
      // Fetch wallet balance silently
      const balanceRes = await fetch("/api/wallet/balance");
      if (balanceRes.ok) {
        const balanceData = await balanceRes.json();
        // Only update if balance has changed (silent update)
        setBalance(prevBalance => {
          if (prevBalance !== balanceData.balance) {
            return balanceData.balance || 0;
          }
          return prevBalance;
        });
      } else {
        console.error("Failed to fetch balance:", balanceRes.status);
      }

      // Fetch payment methods silently
      const methodsRes = await fetch("/api/wallet/payment-methods");
      if (methodsRes.ok) {
        const methodsData = await methodsRes.json();
        // Only update if payment methods have changed (silent update)
        setPaymentMethods(prevMethods => {
          if (JSON.stringify(prevMethods) !== JSON.stringify(methodsData.paymentMethods)) {
            return methodsData.paymentMethods || [];
          }
          return prevMethods;
        });
      } else {
        console.error("Failed to fetch payment methods:", methodsRes.status);
      }

      // Fetch transaction history silently
      const transactionsRes = await fetch("/api/wallet/transactions");
      if (transactionsRes.ok) {
        const transactionsData = await transactionsRes.json();
        // Only update if transactions have changed (silent update)
        setTransactions(prevTransactions => {
          if (JSON.stringify(prevTransactions) !== JSON.stringify(transactionsData.transactions)) {
            return transactionsData.transactions || [];
          }
          return prevTransactions;
        });
      } else {
        console.error("Failed to fetch transactions:", transactionsRes.status);
      }
    } catch (error) {
      console.error("Background refresh error:", error);
    } finally {
      setIsBackgroundRefreshing(false);
    }
  }, []);

  // Real-time updates
  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/auth/signin");
      return;
    }

    if ((session.user as any)?.role !== "STUDENT") {
      router.push("/");
      return;
    }

    // Initial data fetch (silent)
    fetchWalletData();

    // Background refresh every 15 seconds for real-time updates (silent)
    const interval = setInterval(() => {
      backgroundRefresh();
    }, 15000); // 15 seconds for more frequent silent updates

    return () => clearInterval(interval);
  }, [session, status, router, refreshKey, backgroundRefresh]);

  const fetchWalletData = useCallback(async () => {
    try {
      // Silent fetch - no loading state
      
      // Fetch all data in parallel for better performance
      const [balanceRes, methodsRes, transactionsRes] = await Promise.all([
        fetch("/api/wallet/balance"),
        fetch("/api/wallet/payment-methods"),
        fetch("/api/wallet/transactions")
      ]);

      // Handle balance response
      if (balanceRes.ok) {
        const balanceData = await balanceRes.json();
        setBalance(balanceData.balance || 0);
      } else {
        console.error("Failed to fetch balance:", balanceRes.status);
        // Silent error handling - no toast
      }

      // Handle payment methods response
      if (methodsRes.ok) {
        const methodsData = await methodsRes.json();
        setPaymentMethods(methodsData.paymentMethods || []);
      } else {
        console.error("Failed to fetch payment methods:", methodsRes.status);
        // Silent error handling - no toast
      }

      // Handle transactions response
      if (transactionsRes.ok) {
        const transactionsData = await transactionsRes.json();
        setTransactions(transactionsData.transactions || []);
      } else {
        console.error("Failed to fetch transactions:", transactionsRes.status);
        // Silent error handling - no toast
      }
    } catch (error) {
      console.error("Error fetching wallet data:", error);
      // Silent error handling - no toast
    } finally {
      setLoading(false);
    }
  }, []);

  const addFunds = async () => {
    if (isAddingFunds) return;
    
    setIsAddingFunds(true);
    try {
      // Create a payment session with Paystack for adding funds
      const paymentRes = await fetch("/api/wallet/add-funds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: 25000, // 25,000 NGN (approximately $50 USD)
          currency: "NGN",
          studentEmail: session?.user?.email || "",
          studentName: session?.user?.name || "",
          purpose: "Add funds to wallet"
        }),
      });

      if (!paymentRes.ok) {
        const errorData = await paymentRes.json();
        toast.error(errorData.error || t('wallet.failed_create_payment'));
        return;
      }

      const paymentData = await paymentRes.json();
      
      if (paymentData.authorization_url) {
        toast.success(t('wallet.redirecting_payment'));
        // Redirect to Paystack payment page
        window.location.href = paymentData.authorization_url;
      } else {
        toast.error(t('wallet.payment_processing_failed'));
      }
    } catch (error) {
      console.error("Add funds error:", error);
      toast.error(t('wallet.failed_adding_funds'));
    } finally {
      setIsAddingFunds(false);
    }
  };

  const withdrawFunds = async () => {
    if (balance <= 0) {
      toast.error(t('wallet.no_funds_to_withdraw'));
      return;
    }
    
    try {
      toast(t('wallet.withdrawal_feature_coming_soon'));
    } catch (error) {
      toast.error(t('wallet.failed_withdrawing_funds'));
    }
  };

  const addPaymentMethod = async (formData: FormData) => {
    try {
      setIsProcessingPayment(true);
      const response = await fetch("/api/wallet/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardNumber: formData.get("cardNumber"),
          expiryMonth: formData.get("expiryMonth"),
          expiryYear: formData.get("expiryYear"),
          cvv: formData.get("cvv"),
          cardholderName: formData.get("cardholderName")
        }),
      });

      if (response.ok) {
        toast.success(t('wallet.payment_method_added'));
        setShowAddCard(false);
        setRefreshKey(prev => prev + 1); // Trigger refresh
      } else {
        const error = await response.json();
        toast.error(error.message || t('wallet.failed_adding_payment_method'));
      }
    } catch (error) {
      toast.error(t('wallet.failed_adding_payment_method'));
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const removePaymentMethod = async (methodId: string) => {
    if (!confirm(t('wallet.confirm_remove_payment_method'))) return;

    try {
      const response = await fetch(`/api/wallet/payment-methods/${methodId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success(t('wallet.payment_method_removed'));
        setPaymentMethods(prev => prev.filter(method => method.id !== methodId));
        setRefreshKey(prev => prev + 1); // Trigger refresh
      } else {
        toast.error(t('wallet.failed_removing_payment_method'));
      }
    } catch (error) {
      toast.error(t('wallet.failed_removing_payment_method'));
    }
  };

  const setDefaultPaymentMethod = async (methodId: string) => {
    try {
      const response = await fetch(`/api/wallet/payment-methods/${methodId}/default`, {
        method: "PUT",
      });

      if (response.ok) {
        toast.success(t('wallet.default_payment_method_updated'));
        setPaymentMethods(prev => 
          prev.map(method => ({
            ...method,
            isDefault: method.id === methodId
          }))
        );
        setRefreshKey(prev => prev + 1); // Trigger refresh
      } else {
        toast.error(t('wallet.failed_updating_default_method'));
      }
    } catch (error) {
      toast.error(t('wallet.failed_updating_default_method'));
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { class: string; text: string; icon: string } } = {
      completed: { class: 'premium-success', text: t('wallet.completed'), icon: '✅' },
      pending: { class: 'premium-warning', text: t('wallet.pending'), icon: '⏳' },
      failed: { class: 'premium-danger', text: t('wallet.failed'), icon: '❌' }
    };
    const statusInfo = statusMap[status] || { class: 'premium-secondary', text: status, icon: '❓' };
    return { ...statusInfo };
  };

  // Real-time balance animation with visual feedback
  const [displayBalance, setDisplayBalance] = useState(0);
  const [isBalanceUpdating, setIsBalanceUpdating] = useState(false);
  
  useEffect(() => {
    if (balance !== displayBalance) {
      setIsBalanceUpdating(true);
      const timer = setTimeout(() => {
        setDisplayBalance(balance);
        setIsBalanceUpdating(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [balance, displayBalance]);

  // Calculate wallet statistics with real-time updates
  const walletStats = {
    totalTransactions: transactions.length,
    completedTransactions: transactions.filter(t => t.status === 'completed').length,
    pendingTransactions: transactions.filter(t => t.status === 'pending').length,
    totalSpent: transactions
      .filter(t => t.status === 'completed' && t.type === 'payment')
      .reduce((sum, t) => sum + t.amount, 0),
    totalRefunded: transactions
      .filter(t => t.status === 'completed' && t.type === 'refund')
      .reduce((sum, t) => sum + t.amount, 0)
  };

  // Real-time data validation
  const [dataErrors, setDataErrors] = useState<string[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('connected');
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  // Real-time data validation
  const validateData = useCallback(() => {
    const errors = [];
    if (balance < 0) errors.push("Invalid balance");
    if (transactions.some(t => t.amount < 0)) errors.push("Invalid transaction amounts");
    if (paymentMethods.some(p => !p.id)) errors.push("Invalid payment methods");
    setDataErrors(errors);
  }, [balance, transactions, paymentMethods]);

  useEffect(() => {
    validateData();
  }, [validateData]);

  // Connection status monitoring
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch("/api/health");
        setConnectionStatus(response.ok ? 'connected' : 'disconnected');
      } catch (error) {
        setConnectionStatus('disconnected');
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Update last sync time
  const updateSyncTime = useCallback(() => {
    setLastSyncTime(new Date());
  }, []);

  // Enhanced background refresh with sync time
  const enhancedBackgroundRefresh = useCallback(async () => {
    try {
      setIsBackgroundRefreshing(true);
      
      // Fetch wallet balance silently
      const balanceRes = await fetch("/api/wallet/balance");
      if (balanceRes.ok) {
        const balanceData = await balanceRes.json();
        setBalance(balanceData.balance || 0);
      } else {
        console.error("Failed to fetch balance:", balanceRes.status);
      }

      // Fetch payment methods silently
      const methodsRes = await fetch("/api/wallet/payment-methods");
      if (methodsRes.ok) {
        const methodsData = await methodsRes.json();
        setPaymentMethods(methodsData.paymentMethods || []);
      } else {
        console.error("Failed to fetch payment methods:", methodsRes.status);
      }

      // Fetch transaction history silently
      const transactionsRes = await fetch("/api/wallet/transactions");
      if (transactionsRes.ok) {
        const transactionsData = await transactionsRes.json();
        setTransactions(transactionsData.transactions || []);
      } else {
        console.error("Failed to fetch transactions:", transactionsRes.status);
      }

      updateSyncTime();
    } catch (error) {
      console.error("Background refresh error:", error);
      setConnectionStatus('disconnected');
    } finally {
      setIsBackgroundRefreshing(false);
    }
  }, [updateSyncTime]);

  if (status === "loading" || loading) {
    return (
      <div className="premium-loading-container">
        <div className="premium-loading-content">
          <div className="premium-spinner">
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
          </div>
          <h3>{t('wallet.loading_wallet')}</h3>
          <p>{t('wallet.preparing_your_wallet')}</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="premium-wallet-container">
      <StudentNavbar />
      
      {/* Connection Status Indicator */}
      <div className={`premium-connection-status ${connectionStatus}`}>
        <span className="status-icon">
          {connectionStatus === 'connected' ? '🟢' : '🔴'}
        </span>
        <span className="status-text">
          {connectionStatus === 'connected' ? t('wallet.live') : t('wallet.offline')}
        </span>
      </div>
      
      <div className="premium-wallet-layout">
        {/* Premium Header */}
        <div className="premium-header-section">
          <div className="premium-header-content">
            <div className="premium-header-main">
              <h1 className="premium-title">
                <span className="premium-icon">💰</span>
                {t('wallet.title')}
              </h1>
              <p className="premium-subtitle">{t('wallet.subtitle')}</p>
              <div className="premium-sync-info">
                <div className="premium-live-indicator">
                  <span className="live-dot"></span>
                  <span className="live-text">{t('wallet.live_updates')}</span>
                </div>
                <div className="premium-sync-indicator">
                  <span className="sync-icon">🔄</span>
                  <span className="sync-text">
                    {isBackgroundRefreshing ? t('wallet.syncing') : t('wallet.synced')}
                  </span>
                </div>
              </div>
            </div>
            <div className="premium-header-actions">
              <button
                className="premium-action-btn premium-refresh-btn"
                onClick={() => {
                  backgroundRefresh();
                  // Silent refresh - no success message
                }}
                disabled={isBackgroundRefreshing}
              >
                <span className="action-icon">
                  {isBackgroundRefreshing ? '🔄' : '🔄'}
                </span>
                <span className="action-text">{t('wallet.refresh')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Premium Balance Card */}
        <div className="premium-balance-section">
          <div className="premium-balance-card">
            <div className="premium-balance-header">
              <div className="premium-balance-icon">
                <span className="balance-icon">💳</span>
              </div>
              <div className="premium-balance-info">
                <h2 className="premium-balance-label">{t('wallet.available_balance')}</h2>
                <div className="premium-balance-amount">
                  {formatCurrency(balance)}
                </div>
                <div className="premium-balance-status">
                  <span className="status-indicator active"></span>
                  <span className="status-text">{t('wallet.active')}</span>
                </div>
              </div>
            </div>
            <div className="premium-balance-actions">
              <button
                className="premium-action-btn premium-add-funds-btn"
                onClick={addFunds}
                disabled={isAddingFunds}
              >
                {isAddingFunds ? (
                  <div className="premium-loading-spinner"></div>
                ) : (
                  <>
                    <span className="action-icon">➕</span>
                    <span className="action-text">{t('wallet.add_funds')}</span>
                  </>
                )}
              </button>
              <button
                className="premium-action-btn premium-withdraw-btn"
                onClick={withdrawFunds}
              >
                <span className="action-icon">📤</span>
                <span className="action-text">{t('wallet.withdraw')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Premium Stats Grid */}
        <div className="premium-stats-section">
          <div className="premium-stats-grid">
            <div className="premium-stat-card">
              <div className="premium-stat-icon premium-primary-bg">
                <span className="stat-icon">📊</span>
              </div>
              <div className="premium-stat-content">
                <h3 className="premium-stat-label">{t('wallet.total_transactions')}</h3>
                <p className="premium-stat-value">{transactions.length}</p>
              </div>
            </div>
            <div className="premium-stat-card">
              <div className="premium-stat-icon premium-success-bg">
                <span className="stat-icon">💳</span>
              </div>
              <div className="premium-stat-content">
                <h3 className="premium-stat-label">{t('wallet.payment_methods')}</h3>
                <p className="premium-stat-value">{paymentMethods.length}</p>
              </div>
            </div>
            <div className="premium-stat-card">
              <div className="premium-stat-icon premium-warning-bg">
                <span className="stat-icon">📈</span>
              </div>
              <div className="premium-stat-content">
                <h3 className="premium-stat-label">{t('wallet.recent_activity')}</h3>
                <p className="premium-stat-value">{transactions.filter(t => new Date(t.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Premium Tabs */}
        <div className="premium-tabs-section">
          <div className="premium-tabs-container">
            <button
              className={`premium-tab ${selectedTab === 'overview' ? 'premium-active' : ''}`}
              onClick={() => setSelectedTab('overview')}
            >
              <span className="tab-icon">📋</span>
              <span className="tab-text">{t('wallet.overview')}</span>
            </button>
            
            <button
              className={`premium-tab ${selectedTab === 'transactions' ? 'premium-active' : ''}`}
              onClick={() => setSelectedTab('transactions')}
            >
              <span className="tab-icon">📄</span>
              <span className="tab-text">{t('wallet.transactions')}</span>
              <span className="tab-badge">{transactions.length}</span>
            </button>
            
                    <button 
              className={`premium-tab ${selectedTab === 'methods' ? 'premium-active' : ''}`}
              onClick={() => setSelectedTab('methods')}
            >
              <span className="tab-icon">💳</span>
              <span className="tab-text">{t('wallet.payment_methods')}</span>
              <span className="tab-badge">{paymentMethods.length}</span>
            </button>
          </div>
        </div>

        {/* Premium Content Sections */}
        <div className="premium-content-section">
          {selectedTab === 'overview' && (
            <div className="premium-overview-content">
              <div className="premium-overview-grid">
                {/* Quick Actions */}
                <div className="premium-quick-actions-card">
                  <h3 className="premium-card-title">{t('wallet.quick_actions')}</h3>
                  <div className="premium-quick-actions">
                    <button className="premium-quick-action">
                      <span className="quick-action-icon">💳</span>
                      <span className="quick-action-text">{t('wallet.add_card')}</span>
                    </button>
                    <button className="premium-quick-action">
                      <span className="quick-action-icon">🏦</span>
                      <span className="quick-action-text">{t('wallet.add_bank')}</span>
                    </button>
                    <button className="premium-quick-action">
                      <span className="quick-action-icon">📊</span>
                      <span className="quick-action-text">{t('wallet.analytics')}</span>
                    </button>
                    <button className="premium-quick-action">
                      <span className="quick-action-icon">⚙️</span>
                      <span className="quick-action-text">{t('wallet.settings')}</span>
                    </button>
                  </div>
                  </div>
                  
                {/* Recent Transactions */}
                <div className="premium-recent-transactions-card">
                  <h3 className="premium-card-title">{t('wallet.recent_transactions')}</h3>
                  <div className="premium-recent-transactions">
                    {transactions.slice(0, 5).map((transaction) => {
                      const statusInfo = getStatusBadge(transaction.status);
                      return (
                        <div key={transaction.id} className="premium-recent-transaction">
                          <div className="premium-transaction-icon">
                            <span className="transaction-icon">
                              {transaction.type === 'payment' ? '💳' : 
                               transaction.type === 'refund' ? '↩️' : '➕'}
                            </span>
                      </div>
                          <div className="premium-transaction-info">
                            <h4 className="premium-transaction-title">{transaction.description}</h4>
                            <p className="premium-transaction-date">{formatDate(transaction.createdAt)}</p>
                          </div>
                          <div className="premium-transaction-amount">
                            <span className={`amount ${transaction.type === 'refund' ? 'positive' : 'negative'}`}>
                              {transaction.type === 'refund' ? '+' : '-'}{formatCurrency(transaction.amount, transaction.currency)}
                            </span>
                            <span className={`status-badge ${statusInfo.class}`}>
                              {statusInfo.icon} {statusInfo.text}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {transactions.length === 0 && (
                      <div className="premium-empty-state">
                        <span className="empty-icon">📄</span>
                        <p>{t('wallet.no_transactions_yet')}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedTab === 'transactions' && (
            <div className="premium-transactions-content">
              <div className="premium-transactions-card">
                <div className="premium-card-header">
                  <h3 className="premium-card-title">{t('wallet.transaction_history')}</h3>
                  <div className="premium-card-actions">
                    <button className="premium-action-btn premium-filter-btn">
                      <span className="action-icon">🔍</span>
                      <span className="action-text">{t('wallet.filter')}</span>
                    </button>
                    <button className="premium-action-btn premium-export-btn">
                      <span className="action-icon">📥</span>
                      <span className="action-text">{t('wallet.export')}</span>
                      </button>
                    </div>
                  </div>
                  
                <div className="premium-transactions-list">
                  {transactions.map((transaction) => {
                    const statusInfo = getStatusBadge(transaction.status);
                    return (
                      <div key={transaction.id} className="premium-transaction-item">
                        <div className="premium-transaction-icon">
                          <span className="transaction-icon">
                            {transaction.type === 'payment' ? '💳' : 
                             transaction.type === 'refund' ? '↩️' : '➕'}
                          </span>
                      </div>
                        <div className="premium-transaction-content">
                          <div className="premium-transaction-header">
                            <h4 className="premium-transaction-title">{transaction.description}</h4>
                            <span className="premium-transaction-time">{formatDate(transaction.createdAt)}</span>
                          </div>
                          {transaction.tutorName && (
                            <p className="premium-transaction-tutor">{t('wallet.with')} {transaction.tutorName}</p>
                          )}
                          <div className="premium-transaction-amount">
                            <span className={`amount ${transaction.type === 'refund' ? 'positive' : 'negative'}`}>
                              {transaction.type === 'refund' ? '+' : '-'}{formatCurrency(transaction.amount, transaction.currency)}
                            </span>
                            <span className={`status-badge ${statusInfo.class}`}>
                              {statusInfo.icon} {statusInfo.text}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {transactions.length === 0 && (
                    <div className="premium-empty-state">
                      <span className="empty-icon">📄</span>
                      <h3>{t('wallet.no_transactions_found')}</h3>
                      <p>{t('wallet.your_transaction_history_will_appear_here')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {selectedTab === 'methods' && (
            <div className="premium-methods-content">
              <div className="premium-methods-card">
                <div className="premium-card-header">
                  <h3 className="premium-card-title">{t('wallet.payment_methods')}</h3>
                  <button 
                    className="premium-action-btn premium-add-method-btn"
                    onClick={() => setShowAddCard(true)}
                  >
                    <span className="action-icon">➕</span>
                    <span className="action-text">{t('wallet.add_method')}</span>
                  </button>
                </div>
                
                <div className="premium-methods-list">
                  {paymentMethods.map((method) => (
                    <div key={method.id} className="premium-method-item">
                      <div className="premium-method-icon">
                        <span className="method-icon">
                          {method.brand?.toLowerCase() === 'visa' ? '💳' :
                           method.brand?.toLowerCase() === 'mastercard' ? '💳' :
                           method.type === 'bank' ? '🏦' : '💳'}
                        </span>
                      </div>
                      <div className="premium-method-content">
                        <div className="premium-method-header">
                          <h4 className="premium-method-title">
                            {method.brand} •••• {method.last4}
                          </h4>
                          {method.isDefault && (
                            <span className="premium-default-badge">{t('wallet.default')}</span>
                          )}
                        </div>
                        <p className="premium-method-details">
                          {t('wallet.expires')} {method.expiryMonth}/{method.expiryYear}
                        </p>
                      </div>
                      <div className="premium-method-actions">
                        {!method.isDefault && (
                          <button 
                            className="premium-action-btn premium-set-default-btn"
                            onClick={() => setDefaultPaymentMethod(method.id)}
                          >
                            <span className="action-icon">⭐</span>
                            <span className="action-text">{t('wallet.set_default')}</span>
                          </button>
                        )}
                        <button 
                          className="premium-action-btn premium-delete-btn"
                          onClick={() => removePaymentMethod(method.id)}
                        >
                          <span className="action-icon">🗑️</span>
                          <span className="action-text">{t('wallet.delete')}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {paymentMethods.length === 0 && (
                    <div className="premium-empty-state">
                      <span className="empty-icon">💳</span>
                      <h3>{t('wallet.no_payment_methods_found')}</h3>
                      <p>{t('wallet.add_a_payment_method_to_get_started')}</p>
                      <button 
                        className="premium-action-btn premium-add-method-btn"
                        onClick={() => setShowAddCard(true)}
                      >
                        <span className="action-icon">➕</span>
                        <span className="action-text">{t('wallet.add_payment_method')}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Premium Add Payment Method Modal */}
      {showAddCard && (
        <div className="premium-modal-overlay" onClick={() => setShowAddCard(false)}>
          <div className="premium-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="premium-modal-header">
              <h3 className="premium-modal-title">{t('wallet.add_payment_method')}</h3>
              <button 
                className="premium-modal-close"
                onClick={() => setShowAddCard(false)}
              >
                ✕
              </button>
            </div>
            
            <form action={addPaymentMethod} className="premium-modal-body">
              <div className="premium-form-group">
                <label className="premium-form-label">{t('wallet.card_number')}</label>
                <input 
                  type="text" 
                  name="cardNumber"
                  className="premium-form-input" 
                  placeholder="1234 5678 9012 3456"
                  required
                />
              </div>
              
              <div className="premium-form-row">
                <div className="premium-form-group">
                  <label className="premium-form-label">{t('wallet.expiry_month')}</label>
                  <select name="expiryMonth" className="premium-form-select" required>
                    {Array.from({length: 12}, (_, i) => (
                      <option key={i+1} value={i+1}>{String(i+1).padStart(2, '0')}</option>
                    ))}
                  </select>
                </div>
                <div className="premium-form-group">
                  <label className="premium-form-label">{t('wallet.expiry_year')}</label>
                  <select name="expiryYear" className="premium-form-select" required>
                    {Array.from({length: 10}, (_, i) => {
                      const year = new Date().getFullYear() + i;
                      return <option key={year} value={year}>{year}</option>;
                    })}
                  </select>
                </div>
              </div>
              
              <div className="premium-form-row">
                <div className="premium-form-group">
                  <label className="premium-form-label">{t('wallet.cvv')}</label>
                  <input 
                    type="text" 
                    name="cvv"
                    className="premium-form-input" 
                    placeholder="123"
                    maxLength={4}
                    required
                  />
                </div>
                <div className="premium-form-group">
                  <label className="premium-form-label">{t('wallet.cardholder_name')}</label>
                  <input 
                    type="text" 
                    name="cardholderName"
                    className="premium-form-input" 
                    placeholder={t('wallet.cardholder_name')}
                    required
                  />
                </div>
              </div>
              
              <div className="premium-modal-footer">
                <button 
                  type="button" 
                  className="premium-action-btn premium-cancel-btn"
                  onClick={() => setShowAddCard(false)}
                >
                  {t('wallet.cancel')}
                </button>
                <button 
                  type="submit" 
                  className={`premium-action-btn premium-submit-btn ${isProcessingPayment ? 'disabled' : ''}`}
                  disabled={isProcessingPayment}
                >
                  {isProcessingPayment ? (
                    <div className="premium-loading-spinner"></div>
                  ) : (
                    <>
                      <span className="action-icon">💳</span>
                      <span className="action-text">{t('wallet.add_card')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 