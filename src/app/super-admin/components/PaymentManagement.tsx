'use client';

import { useState, useEffect } from 'react';
import './payment-billing-management.css';

interface Transaction {
  id: string;
  type: 'payment' | 'payout';
  user?: {
    id: string;
    name: string;
    email: string;
    photo?: string;
  };
  tutor?: {
    id: string;
    name: string;
    email: string;
    photo?: string;
  };
  amount: number;
  status: string;
  createdAt: string;
  booking?: {
    id: string;
    scheduledAt: string;
    duration: number;
    tutor: {
      id: string;
      name: string;
      email: string;
    };
  };
  method?: string;
  reference?: string;
  processedAt?: string;
  notes?: string;
  bankAccount?: {
    id: string;
    bankName: string;
    accountNumber: string;
  };
}

interface PaymentStatistics {
  totalPayments: number;
  totalPaymentAmount: number;
  totalPayouts: number;
  totalPayoutAmount: number;
  netRevenue: number;
  todayPayments: number;
  todayPayouts: number;
  paymentStatusBreakdown: Array<{
    status: string;
    count: number;
    amount: number;
  }>;
  payoutStatusBreakdown: Array<{
    status: string;
    count: number;
    amount: number;
  }>;
}

interface PaymentManagementProps {
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

export default function PaymentManagement({ showNotification }: PaymentManagementProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [statistics, setStatistics] = useState<PaymentStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [newPayout, setNewPayout] = useState({
    tutorId: '',
    amount: '',
    method: 'bank',
    notes: ''
  });

  useEffect(() => {
    fetchTransactions();
  }, [currentPage, search, statusFilter, typeFilter, dateFrom, dateTo]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
        ...(typeFilter && { type: typeFilter }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo })
      });

      const response = await fetch(`/api/super-admin/payments?${params}`);
      const data = await response.json();

      if (data.success && data.data) {
        setTransactions(data.data.transactions || []);
        setStatistics(data.data.statistics);
        setTotalPages(data.data.pagination?.totalPages || 1);
      } else {
        showNotification('error', 'Failed to fetch transactions');
        setTransactions([]);
        setStatistics(null);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      showNotification('error', 'Network error while fetching transactions');
      setTransactions([]);
      setStatistics(null);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const handleTransactionAction = async (transactionId: string, type: string, action: string, updates?: any) => {
    try {
      const response = await fetch('/api/super-admin/payments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId, type, action, updates })
      });

      const data = await response.json();

      if (data.success) {
        showNotification('success', `Transaction ${action} successfully`);
        fetchTransactions(); // Refresh the list
      } else {
        showNotification('error', `Failed to ${action} transaction`);
      }
    } catch (error) {
      console.error(`Error ${action}ing transaction:`, error);
      showNotification('error', `Network error while ${action}ing transaction`);
    }
  };

  const handleCreatePayout = async () => {
    try {
      const response = await fetch('/api/super-admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'payout',
          data: newPayout
        })
      });

      const data = await response.json();

      if (data.success) {
        showNotification('success', 'Payout created successfully');
        setNewPayout({
          tutorId: '',
          amount: '',
          method: 'bank',
          notes: ''
        });
        setShowPayoutModal(false);
        fetchTransactions();
      } else {
        showNotification('error', 'Failed to create payout: ' + data.error);
      }
    } catch (error) {
      console.error('Error creating payout:', error);
      showNotification('error', 'Failed to create payout');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'paid':
        return 'success';
      case 'pending':
      case 'processing':
        return 'pending';
      case 'failed':
      case 'cancelled':
        return 'failed';
      case 'refunded':
        return 'refunded';
      default:
        return 'pending';
    }
  };

  const getTypeIcon = (type: string) => {
    return type === 'payment' ? '💰' : '💸';
  };

  const getTypeColor = (type: string) => {
    return type === 'payment' ? 'text-green-600' : 'text-red-600';
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="payment-billing-container">
      {/* Header */}
      <div className="payment-billing-header">
        <h1 className="premium-heading">💰 Payment & Billing Management</h1>
        <p className="premium-text">Manage all financial transactions, payments, and payouts</p>
      </div>

      {/* Controls */}
      <div className="payment-controls">
        <div className="control-left">
          <button 
            className="btn btn-primary"
            onClick={() => setShowPayoutModal(true)}
          >
            <span className="btn-icon">➕</span>
            Create Payout
          </button>
          
          <button 
            className="btn btn-secondary"
            onClick={() => {
              showNotification('info', 'Export functionality coming soon');
            }}
          >
            <span className="btn-icon">📤</span>
            Export Reports
          </button>
          
          <button 
            className="btn btn-secondary"
            onClick={() => {
              showNotification('info', 'Analytics dashboard coming soon');
            }}
          >
            <span className="btn-icon">📊</span>
            Financial Analytics
          </button>
        </div>

        <div className="control-center">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search transactions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
            <span className="search-icon">🔍</span>
          </div>
        </div>

        <div className="control-right">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">All Types</option>
            <option value="payment">Payments</option>
            <option value="payout">Payouts</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="date-input"
            placeholder="From Date"
          />

          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="date-input"
            placeholder="To Date"
          />
        </div>
      </div>

      {/* Stats Grid */}
      {statistics && (
        <div className="payment-stats-grid">
          <div className="stat-card premium-hover">
            <div className="stat-icon revenue">💰</div>
            <div className="stat-content">
              <div className="stat-value">{statistics.totalPayments}</div>
              <div className="stat-label">Total Payments</div>
              <div className="stat-amount">{formatCurrency(statistics.totalPaymentAmount)}</div>
            </div>
          </div>
          
          <div className="stat-card premium-hover">
            <div className="stat-icon pending">💸</div>
            <div className="stat-content">
              <div className="stat-value">{statistics.totalPayouts}</div>
              <div className="stat-label">Total Payouts</div>
              <div className="stat-amount">{formatCurrency(statistics.totalPayoutAmount)}</div>
            </div>
          </div>
          
          <div className="stat-card premium-hover">
            <div className="stat-icon transactions">📊</div>
            <div className="stat-content">
              <div className="stat-value">{formatCurrency(statistics.netRevenue)}</div>
              <div className="stat-label">Net Revenue</div>
              <div className={`stat-amount ${statistics.netRevenue >= 0 ? 'positive' : 'negative'}`}>
                {statistics.netRevenue >= 0 ? '📈' : '📉'}
              </div>
            </div>
          </div>
          
          <div className="stat-card premium-hover">
            <div className="stat-icon fees">📅</div>
            <div className="stat-content">
              <div className="stat-value">{statistics.todayPayments + statistics.todayPayouts}</div>
              <div className="stat-label">Today&apos;s Activity</div>
              <div className="stat-amount">
                {statistics.todayPayments} payments, {statistics.todayPayouts} payouts
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transactions List */}
      <div className="payment-content-grid">
        {loading ? (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <p>Loading transactions...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💳</div>
            <h3 className="empty-title">No Transactions Found</h3>
            <p className="empty-subtitle">No transactions match your current filters.</p>
          </div>
        ) : (
          transactions.map((transaction) => (
            <div key={transaction.id} className="payment-card premium-hover">
              <div className="payment-card-header">
                <div className="payment-card-title">
                  <span className="payment-type-icon">{getTypeIcon(transaction.type)}</span>
                  <span className="payment-type-label">
                    {transaction.type === 'payment' ? 'Payment' : 'Payout'}
                  </span>
                </div>
                <div className="payment-card-status">
                  <span className={`payment-status ${getStatusBadge(transaction.status)}`}>
                    {transaction.status}
                  </span>
                </div>
              </div>
              
              <div className="payment-card-body">
                <div className="payment-card-details">
                  <div className="payment-detail-item">
                    <span className="payment-detail-label">User:</span>
                    <span className="payment-detail-value">
                      {(transaction.user || transaction.tutor)?.name}
                    </span>
                  </div>
                  
                  <div className="payment-detail-item">
                    <span className="payment-detail-label">Email:</span>
                    <span className="payment-detail-value">
                      {(transaction.user || transaction.tutor)?.email}
                    </span>
                  </div>
                  
                  <div className="payment-detail-item">
                    <span className="payment-detail-label">Amount:</span>
                    <span className={`payment-detail-value ${getTypeColor(transaction.type)}`}>
                      {transaction.type === 'payment' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </span>
                  </div>
                  
                  <div className="payment-detail-item">
                    <span className="payment-detail-label">Date:</span>
                    <span className="payment-detail-value">
                      {formatDateTime(transaction.createdAt)}
                    </span>
                  </div>
                  
                  {transaction.booking && (
                    <div className="payment-detail-item">
                      <span className="payment-detail-label">Session:</span>
                      <span className="payment-detail-value">
                        {transaction.booking.tutor.name} - {transaction.booking.duration}min
                      </span>
                    </div>
                  )}
                  
                  {transaction.reference && (
                    <div className="payment-detail-item">
                      <span className="payment-detail-label">Reference:</span>
                      <span className="payment-detail-value">{transaction.reference}</span>
                    </div>
                  )}
                  
                  {transaction.method && (
                    <div className="payment-detail-item">
                      <span className="payment-detail-label">Method:</span>
                      <span className="payment-detail-value">{transaction.method}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="payment-card-footer">
                <div className="payment-card-date">
                  {formatDateTime(transaction.createdAt)}
                </div>
                
                <div className="payment-card-actions">
                  <button
                    onClick={() => setSelectedTransaction(transaction)}
                    className="payment-action-btn view"
                    title="View Details"
                  >
                    👁️
                  </button>
                  
                  {transaction.type === 'payment' && transaction.status === 'PAID' && (
                    <button
                      onClick={() => handleTransactionAction(transaction.id, 'payment', 'refund')}
                      className="payment-action-btn delete"
                      title="Refund Payment"
                    >
                      ↩️
                    </button>
                  )}
                  
                  {transaction.type === 'payout' && transaction.status === 'PENDING' && (
                    <button
                      onClick={() => handleTransactionAction(transaction.id, 'payout', 'approve')}
                      className="payment-action-btn edit"
                      title="Approve Payout"
                    >
                      ✅
                    </button>
                  )}
                  
                  {transaction.type === 'payout' && transaction.status === 'PROCESSING' && (
                    <button
                      onClick={() => handleTransactionAction(transaction.id, 'payout', 'complete')}
                      className="payment-action-btn edit"
                      title="Mark Complete"
                    >
                      ✅
                    </button>
                  )}
                  
                  {transaction.type === 'payout' && transaction.status === 'PENDING' && (
                    <button
                      onClick={() => handleTransactionAction(transaction.id, 'payout', 'reject')}
                      className="payment-action-btn delete"
                      title="Reject Payout"
                    >
                      ❌
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <div className="super-admin-modal-overlay">
          <div className="super-admin-modal">
            <div className="super-admin-modal-header">
              <h3>Transaction Details</h3>
              <button
                onClick={() => setSelectedTransaction(null)}
                className="super-admin-modal-close"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="super-admin-modal-body">
              <div className="super-admin-transaction-detail">
                <label>Transaction ID:</label>
                <span>{selectedTransaction.id}</span>
              </div>
              <div className="super-admin-transaction-detail">
                <label>Type:</label>
                <span className={`${getTypeColor(selectedTransaction.type)}`}>
                  {selectedTransaction.type === 'payment' ? 'Payment' : 'Payout'}
                </span>
              </div>
              <div className="super-admin-transaction-detail">
                <label>Amount:</label>
                <span className={`${getTypeColor(selectedTransaction.type)}`}>
                  {formatCurrency(selectedTransaction.amount)}
                </span>
              </div>
              <div className="super-admin-transaction-detail">
                <label>Status:</label>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(selectedTransaction.status)}`}>
                  {selectedTransaction.status}
                </span>
              </div>
              <div className="super-admin-transaction-detail">
                <label>Date:</label>
                <span>{formatDateTime(selectedTransaction.createdAt)}</span>
              </div>
              {selectedTransaction.user && (
                <div className="super-admin-transaction-detail">
                  <label>User:</label>
                  <span>{selectedTransaction.user.name} ({selectedTransaction.user.email})</span>
                </div>
              )}
              {selectedTransaction.tutor && (
                <div className="super-admin-transaction-detail">
                  <label>Tutor:</label>
                  <span>{selectedTransaction.tutor.name} ({selectedTransaction.tutor.email})</span>
                </div>
              )}
              {selectedTransaction.booking && (
                <div className="super-admin-transaction-detail">
                  <label>Session:</label>
                  <span>{selectedTransaction.booking.tutor.name} - {selectedTransaction.booking.duration}min</span>
                </div>
              )}
              {selectedTransaction.reference && (
                <div className="super-admin-transaction-detail">
                  <label>Reference:</label>
                  <span>{selectedTransaction.reference}</span>
                </div>
              )}
              {selectedTransaction.method && (
                <div className="super-admin-transaction-detail">
                  <label>Method:</label>
                  <span>{selectedTransaction.method}</span>
                </div>
              )}
              {selectedTransaction.processedAt && (
                <div className="super-admin-transaction-detail">
                  <label>Processed:</label>
                  <span>{formatDateTime(selectedTransaction.processedAt)}</span>
                </div>
              )}
              {selectedTransaction.notes && (
                <div className="super-admin-transaction-detail">
                  <label>Notes:</label>
                  <span>{selectedTransaction.notes}</span>
                </div>
              )}
            </div>
            <div className="super-admin-modal-footer">
              <button
                onClick={() => setSelectedTransaction(null)}
                className="super-admin-btn secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Payout Modal */}
      {showPayoutModal && (
        <div className="super-admin-modal-overlay">
          <div className="super-admin-modal">
            <div className="super-admin-modal-header">
              <h3>Create Payout</h3>
              <button
                onClick={() => setShowPayoutModal(false)}
                className="super-admin-modal-close"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="super-admin-modal-body">
              <div className="super-admin-form-group">
                <label>Tutor ID:</label>
                <input
                  type="text"
                  value={newPayout.tutorId}
                  onChange={(e) => setNewPayout({...newPayout, tutorId: e.target.value})}
                  className="super-admin-input"
                  placeholder="Enter tutor ID"
                />
              </div>
              <div className="super-admin-form-group">
                <label>Amount:</label>
                <input
                  type="number"
                  step="0.01"
                  value={newPayout.amount}
                  onChange={(e) => setNewPayout({...newPayout, amount: e.target.value})}
                  className="super-admin-input"
                  placeholder="Enter amount"
                />
              </div>
              <div className="super-admin-form-group">
                <label>Method:</label>
                <select
                  value={newPayout.method}
                  onChange={(e) => setNewPayout({...newPayout, method: e.target.value})}
                  className="super-admin-input"
                >
                  <option value="bank">Bank Transfer</option>
                  <option value="paypal">PayPal</option>
                  <option value="stripe">Stripe</option>
                </select>
              </div>
              <div className="super-admin-form-group">
                <label>Notes:</label>
                <textarea
                  value={newPayout.notes}
                  onChange={(e) => setNewPayout({...newPayout, notes: e.target.value})}
                  className="super-admin-input"
                  placeholder="Enter notes (optional)"
                  rows={3}
                />
              </div>
            </div>
            <div className="super-admin-modal-footer">
              <button
                onClick={() => setShowPayoutModal(false)}
                className="super-admin-btn secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePayout}
                className="super-admin-btn primary"
              >
                Create Payout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 