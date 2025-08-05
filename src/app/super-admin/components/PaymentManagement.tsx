'use client';

import { useState, useEffect } from 'react';

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
        setShowPayoutModal(false);
        setNewPayout({
          tutorId: '',
          amount: '',
          method: 'bank',
          notes: ''
        });
        fetchTransactions(); // Refresh the list
      } else {
        showNotification('error', 'Failed to create payout');
      }
    } catch (error) {
      console.error('Error creating payout:', error);
      showNotification('error', 'Network error while creating payout');
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: { [key: string]: string } = {
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'PAID': 'bg-green-100 text-green-800',
      'FAILED': 'bg-red-100 text-red-800',
      'PROCESSING': 'bg-blue-100 text-blue-800',
      'COMPLETED': 'bg-green-100 text-green-800',
      'CANCELLED': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getTypeIcon = (type: string) => {
    return type === 'payment' ? 'fas fa-arrow-down' : 'fas fa-arrow-up';
  };

  const getTypeColor = (type: string) => {
    return type === 'payment' ? 'text-green-600' : 'text-red-600';
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
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
    <div className="super-admin-payment-management">
      <div className="super-admin-card">
        <div className="super-admin-card-header">
          <h3>Payment & Billing Management</h3>
          <div className="super-admin-card-actions">
            <button 
              className="super-admin-btn primary"
              onClick={() => setShowPayoutModal(true)}
            >
              <i className="fas fa-plus"></i>
              Create Payout
            </button>
            <button 
              className="super-admin-btn secondary"
              onClick={() => {
                showNotification('info', 'Export functionality coming soon');
              }}
            >
              <i className="fas fa-download"></i>
              Export Reports
            </button>
            <button 
              className="super-admin-btn secondary"
              onClick={() => {
                showNotification('info', 'Analytics dashboard coming soon');
              }}
            >
              <i className="fas fa-chart-line"></i>
              Financial Analytics
            </button>
          </div>
        </div>
        <div className="super-admin-card-body">
          {/* Statistics */}
          {statistics && (
            <div className="super-admin-payment-stats">
              <div className="super-admin-stat-card">
                <div className="super-admin-stat-icon">
                  <i className="fas fa-arrow-down text-green-600"></i>
                </div>
                <div className="super-admin-stat-content">
                  <h4>Total Payments</h4>
                  <p>{statistics.totalPayments}</p>
                  <span className="super-admin-stat-amount">{formatCurrency(statistics.totalPaymentAmount)}</span>
                </div>
              </div>
              <div className="super-admin-stat-card">
                <div className="super-admin-stat-icon">
                  <i className="fas fa-arrow-up text-red-600"></i>
                </div>
                <div className="super-admin-stat-content">
                  <h4>Total Payouts</h4>
                  <p>{statistics.totalPayouts}</p>
                  <span className="super-admin-stat-amount">{formatCurrency(statistics.totalPayoutAmount)}</span>
                </div>
              </div>
              <div className="super-admin-stat-card">
                <div className="super-admin-stat-icon">
                  <i className="fas fa-chart-line text-blue-600"></i>
                </div>
                <div className="super-admin-stat-content">
                  <h4>Net Revenue</h4>
                  <p className={statistics.netRevenue >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(statistics.netRevenue)}
                  </p>
                </div>
              </div>
              <div className="super-admin-stat-card">
                <div className="super-admin-stat-icon">
                  <i className="fas fa-calendar-day text-purple-600"></i>
                </div>
                <div className="super-admin-stat-content">
                  <h4>Today&apos;s Activity</h4>
                  <p>{statistics.todayPayments} payments</p>
                  <p>{statistics.todayPayouts} payouts</p>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="super-admin-payment-filters">
            <input
              type="text"
              placeholder="Search transactions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="super-admin-input"
            />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="super-admin-select"
            >
              <option value="">All Types</option>
              <option value="payment">Payments</option>
              <option value="payout">Payouts</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="super-admin-select"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
              <option value="FAILED">Failed</option>
              <option value="PROCESSING">Processing</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="super-admin-input"
              placeholder="From Date"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="super-admin-input"
              placeholder="To Date"
            />
          </div>

          {/* Transactions List */}
          <div className="super-admin-transactions-list">
            {loading ? (
              <div className="super-admin-loading">
                <div className="super-admin-spinner"></div>
                <p>Loading transactions...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="super-admin-empty-state">
                <div className="super-admin-empty-state-icon">💳</div>
                <h3>No Transactions Found</h3>
                <p>No transactions match your current filters.</p>
                <button 
                  className="super-admin-btn primary"
                  onClick={() => setShowPayoutModal(true)}
                >
                  <i className="fas fa-plus"></i>
                  Create Payout
                </button>
              </div>
            ) : (
              <div className="super-admin-transactions-grid">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="super-admin-transaction-card">
                    <div className="super-admin-transaction-header">
                      <div className="super-admin-transaction-type">
                        <i className={`${getTypeIcon(transaction.type)} ${getTypeColor(transaction.type)}`}></i>
                        <span className="super-admin-transaction-type-label">
                          {transaction.type === 'payment' ? 'Payment' : 'Payout'}
                        </span>
                      </div>
                      <div className="super-admin-transaction-status">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(transaction.status)}`}>
                          {transaction.status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="super-admin-transaction-details">
                      <div className="super-admin-transaction-user">
                        <div className="super-admin-transaction-avatar">
                          {(transaction.user || transaction.tutor)?.photo ? (
                            <img src={(transaction.user || transaction.tutor)?.photo} alt={(transaction.user || transaction.tutor)?.name} className="w-8 h-8 rounded-full" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold">
                              {(transaction.user || transaction.tutor)?.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="super-admin-transaction-user-info">
                          <span className="super-admin-transaction-user-name">
                            {(transaction.user || transaction.tutor)?.name}
                          </span>
                          <span className="super-admin-transaction-user-email">
                            {(transaction.user || transaction.tutor)?.email}
                          </span>
                        </div>
                      </div>
                      
                      <div className="super-admin-transaction-amount">
                        <span className={`super-admin-transaction-amount-value ${getTypeColor(transaction.type)}`}>
                          {transaction.type === 'payment' ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </span>
                        <span className="super-admin-transaction-date">
                          {formatDateTime(transaction.createdAt)}
                        </span>
                      </div>
                      
                      {transaction.booking && (
                        <div className="super-admin-transaction-booking">
                          <span className="super-admin-transaction-booking-label">Session:</span>
                          <span className="super-admin-transaction-booking-details">
                            {transaction.booking.tutor.name} - {transaction.booking.duration}min
                          </span>
                        </div>
                      )}
                      
                      {transaction.reference && (
                        <div className="super-admin-transaction-reference">
                          <span className="super-admin-transaction-reference-label">Ref:</span>
                          <span className="super-admin-transaction-reference-value">{transaction.reference}</span>
                        </div>
                      )}
                      
                      {transaction.method && (
                        <div className="super-admin-transaction-method">
                          <span className="super-admin-transaction-method-label">Method:</span>
                          <span className="super-admin-transaction-method-value">{transaction.method}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="super-admin-transaction-actions">
                      <button
                        onClick={() => setSelectedTransaction(transaction)}
                        className="super-admin-btn secondary"
                        title="View Details"
                      >
                        <i className="fas fa-eye"></i>
                      </button>
                      {transaction.type === 'payment' && transaction.status === 'PAID' && (
                        <button
                          onClick={() => handleTransactionAction(transaction.id, 'payment', 'refund')}
                          className="super-admin-btn danger"
                          title="Refund Payment"
                        >
                          <i className="fas fa-undo"></i>
                        </button>
                      )}
                      {transaction.type === 'payout' && transaction.status === 'PENDING' && (
                        <button
                          onClick={() => handleTransactionAction(transaction.id, 'payout', 'approve')}
                          className="super-admin-btn primary"
                          title="Approve Payout"
                        >
                          <i className="fas fa-check"></i>
                        </button>
                      )}
                      {transaction.type === 'payout' && transaction.status === 'PROCESSING' && (
                        <button
                          onClick={() => handleTransactionAction(transaction.id, 'payout', 'complete')}
                          className="super-admin-btn primary"
                          title="Mark Complete"
                        >
                          <i className="fas fa-check-double"></i>
                        </button>
                      )}
                      {transaction.type === 'payout' && transaction.status === 'PENDING' && (
                        <button
                          onClick={() => handleTransactionAction(transaction.id, 'payout', 'reject')}
                          className="super-admin-btn danger"
                          title="Reject Payout"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="super-admin-pagination">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="super-admin-btn secondary"
              >
                <i className="fas fa-chevron-left"></i>
                Previous
              </button>
              <span className="super-admin-pagination-info">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="super-admin-btn secondary"
              >
                Next
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          )}
        </div>
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