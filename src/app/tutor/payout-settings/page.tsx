"use client";

export const dynamic = 'force-dynamic';

import TutorNavBar from '@/components/TutorNavBar';
import './premium-payout.css';
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useSession } from 'next-auth/react';
import Image from 'next/image';

interface PayoutHistory {
  id: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  method: string;
  createdAt: string;
  processedAt?: string;
  reference: string;
}

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  routingNumber: string;
  accountType: string;
  isDefault: boolean;
  isVerified: boolean;
  balance?: number;
}

interface FinancialStats {
  totalEarnings: number;
  availableBalance: number;
  pendingPayouts: number;
  totalPayouts: number;
  thisMonthEarnings: number;
  lastMonthEarnings: number;
}

export default function TutorPayoutSettings() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('overview');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [paymentSettings, setPaymentSettings] = useState<any>(null);
  const [payoutSettings, setPayoutSettings] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [payoutHistory, setPayoutHistory] = useState<PayoutHistory[]>([]);
  const [financialStats, setFinancialStats] = useState<FinancialStats>({
    totalEarnings: 0,
    availableBalance: 0,
    pendingPayouts: 0,
    totalPayouts: 0,
    thisMonthEarnings: 0,
    lastMonthEarnings: 0
  });
  const [showAddBank, setShowAddBank] = useState(false);
  const [newBank, setNewBank] = useState({
    bankName: '',
    accountNumber: '',
    routingNumber: '',
    accountType: 'checking'
  });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    fetchData();
    // Trigger animations after component mounts
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  const fetchData = async () => {
    try {
      const [paymentRes, payoutRes, banksRes, historyRes, statsRes] = await Promise.all([
        fetch('/api/tutor/payment-settings'),
        fetch('/api/tutor/payout-settings'),
        fetch('/api/tutor/banks'),
        fetch('/api/tutor/payout-history'),
        fetch('/api/tutor/financial-stats')
      ]);

      if (paymentRes.ok) setPaymentSettings(await paymentRes.json());
      if (payoutRes.ok) setPayoutSettings(await payoutRes.json());
      if (banksRes.ok) setBanks(await banksRes.json());
      if (historyRes.ok) setPayoutHistory(await historyRes.json());
      if (statsRes.ok) setFinancialStats(await statsRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handlePayoutChange = (field: string, value: any) => {
    setPayoutSettings((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleBankDetailsChange = (field: string, value: string) => {
    setPayoutSettings((prev: any) => ({
      ...prev,
      bankDetails: { ...prev?.bankDetails, [field]: value }
    }));
  };

  const handleSavePayout = async (e: any) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const response = await fetch('/api/tutor/payout-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payoutSettings)
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save payout settings');
      }
      toast.success('Payout settings saved successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save payout settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      toast.error('Please enter a valid withdrawal amount');
      return;
    }

    if (parseFloat(withdrawAmount) < (payoutSettings?.minPayoutAmount || 50)) {
      toast.error(`Minimum withdrawal amount is ₦${payoutSettings?.minPayoutAmount || 50}`);
      return;
    }

    if (parseFloat(withdrawAmount) > financialStats.availableBalance) {
      toast.error('Insufficient balance');
      return;
    }

    setIsWithdrawing(true);
    try {
      const response = await fetch('/api/tutor/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(withdrawAmount) })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Withdrawal failed');
      }

      toast.success('Withdrawal request submitted successfully!');
      setWithdrawAmount('');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Withdrawal failed');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleAddBank = async (e: any) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/tutor/banks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBank)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add bank');
      }

      toast.success('Bank account added successfully!');
      setShowAddBank(false);
      setNewBank({ bankName: '', accountNumber: '', routingNumber: '', accountType: 'checking' });
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add bank');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { class: 'status-pending', text: 'Pending', icon: '⏳' },
      completed: { class: 'status-completed', text: 'Completed', icon: '✅' },
      failed: { class: 'status-failed', text: 'Failed', icon: '❌' }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <span className={`status-badge ${config.class}`}>
        <span className="status-icon">{config.icon}</span>
        {config.text}
      </span>
    );
  };

  return (
    <div className="premium-payout-container">
      {/* Animated Background */}
      <div className="animated-background">
        <div className="floating-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
          <div className="shape shape-4"></div>
          <div className="shape shape-5"></div>
        </div>
        <div className="gradient-overlay"></div>
      </div>

      <TutorNavBar />
      
      {/* Premium Hero Section */}
      <div className={`premium-hero ${isVisible ? 'visible' : ''}`}>
        <div className="hero-content">
          <div className="hero-icon">💰</div>
          <h1 className="hero-title">Financial Management</h1>
          <p className="hero-subtitle">Professional payout system with real-time analytics</p>
          
          {/* Premium Stats Cards */}
          <div className="premium-stats-grid">
            <div className="stat-card primary">
              <div className="stat-icon">💎</div>
              <div className="stat-content">
                <div className="stat-value">{formatCurrency(financialStats.availableBalance)}</div>
                <div className="stat-label">Available Balance</div>
              </div>
              <div className="stat-sparkle"></div>
            </div>
            
            <div className="stat-card secondary">
              <div className="stat-icon">📈</div>
              <div className="stat-content">
                <div className="stat-value">{formatCurrency(financialStats.totalEarnings)}</div>
                <div className="stat-label">Total Earnings</div>
              </div>
              <div className="stat-sparkle"></div>
            </div>
            
            <div className="stat-card tertiary">
              <div className="stat-icon">⏳</div>
              <div className="stat-content">
                <div className="stat-value">{formatCurrency(financialStats.pendingPayouts)}</div>
                <div className="stat-label">Pending Payouts</div>
              </div>
              <div className="stat-sparkle"></div>
            </div>
            
            <div className="stat-card quaternary">
              <div className="stat-icon">🎯</div>
              <div className="stat-content">
                <div className="stat-value">{formatCurrency(financialStats.thisMonthEarnings)}</div>
                <div className="stat-label">This Month</div>
              </div>
              <div className="stat-sparkle"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="main-content">
        {/* Premium Navigation Tabs */}
        <div className={`premium-tabs ${isVisible ? 'visible' : ''}`}>
          <div className="tabs-container">
            <button 
              className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <span className="tab-icon">📊</span>
              <span className="tab-label">Overview</span>
              <div className="tab-indicator"></div>
            </button>
            
            <button 
              className={`tab-button ${activeTab === 'withdraw' ? 'active' : ''}`}
              onClick={() => setActiveTab('withdraw')}
            >
              <span className="tab-icon">💸</span>
              <span className="tab-label">Withdraw</span>
              <div className="tab-indicator"></div>
            </button>
            
            <button 
              className={`tab-button ${activeTab === 'banks' ? 'active' : ''}`}
              onClick={() => setActiveTab('banks')}
            >
              <span className="tab-icon">🏦</span>
              <span className="tab-label">Banks</span>
              <div className="tab-indicator"></div>
            </button>
            
            <button 
              className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <span className="tab-icon">📜</span>
              <span className="tab-label">History</span>
              <div className="tab-indicator"></div>
            </button>
            
            <button 
              className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <span className="tab-icon">⚙️</span>
              <span className="tab-label">Settings</span>
              <div className="tab-indicator"></div>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className={`content-section ${isVisible ? 'visible' : ''}`}>
              <div className="quick-actions-section">
                <h3 className="section-title">Quick Actions</h3>
                <div className="actions-grid">
                  <button 
                    className="action-card primary"
                    onClick={() => setActiveTab('withdraw')}
                  >
                    <div className="action-icon">💸</div>
                    <div className="action-content">
                      <h4>Withdraw Funds</h4>
                      <p>Request a withdrawal to your bank account</p>
                    </div>
                    <div className="action-arrow">→</div>
                  </button>
                  
                  <button 
                    className="action-card secondary"
                    onClick={() => setActiveTab('banks')}
                  >
                    <div className="action-icon">🏦</div>
                    <div className="action-content">
                      <h4>Manage Banks</h4>
                      <p>Add or update your bank accounts</p>
                    </div>
                    <div className="action-arrow">→</div>
                  </button>
                  
                  <button 
                    className="action-card tertiary"
                    onClick={() => setActiveTab('history')}
                  >
                    <div className="action-icon">📜</div>
                    <div className="action-content">
                      <h4>View History</h4>
                      <p>Check your transaction history</p>
                    </div>
                    <div className="action-arrow">→</div>
                  </button>
                </div>
              </div>

              <div className="recent-activity-section">
                <h3 className="section-title">Recent Activity</h3>
                <div className="activity-list">
                  {payoutHistory.slice(0, 5).map((payout, index) => (
                    <div key={payout.id} className={`activity-item ${isVisible ? 'visible' : ''}`} style={{ animationDelay: `${index * 0.1}s` }}>
                      <div className="activity-icon">
                        {payout.status === 'completed' ? '✅' : payout.status === 'pending' ? '⏳' : '❌'}
                      </div>
                      <div className="activity-content">
                        <div className="activity-title">
                          {formatCurrency(payout.amount)} - {payout.method}
                        </div>
                        <div className="activity-subtitle">
                          {formatDate(payout.createdAt)} • {payout.reference}
                        </div>
                      </div>
                      <div className="activity-status">
                        {getStatusBadge(payout.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Withdraw Tab */}
          {activeTab === 'withdraw' && (
            <div className={`content-section ${isVisible ? 'visible' : ''}`}>
              <div className="withdraw-section">
                <div className="withdraw-card">
                  <h3 className="section-title">Withdraw Funds</h3>
                  <div className="withdraw-form">
                    <div className="form-group">
                      <label className="form-label">Amount (USD)</label>
                      <div className="input-wrapper">
                        <span className="currency-symbol">$</span>
                        <input
                          type="number"
                          className="premium-input"
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          placeholder="0.00"
                          min={payoutSettings?.minPayoutAmount || 50}
                          max={financialStats.availableBalance}
                        />
                      </div>
                      <div className="input-hint">
                        Min: {formatCurrency(payoutSettings?.minPayoutAmount || 50)} | 
                        Max: {formatCurrency(financialStats.availableBalance)}
                      </div>
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">Bank Account</label>
                      <select className="premium-select">
                        {banks.filter(bank => bank.isVerified).map(bank => (
                          <option key={bank.id} value={bank.id}>
                            {bank.bankName} - ****{bank.accountNumber.slice(-4)}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <button
                      className="premium-button primary"
                      onClick={handleWithdraw}
                      disabled={isWithdrawing || !withdrawAmount}
                    >
                      {isWithdrawing ? (
                        <>
                          <div className="loading-spinner"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <span className="button-icon">💸</span>
                          Withdraw {withdrawAmount ? formatCurrency(parseFloat(withdrawAmount)) : ''}
                        </>
                      )}
                    </button>
                  </div>
                </div>
                
                <div className="withdraw-info-card">
                  <h4>Withdrawal Information</h4>
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="info-label">Available Balance:</span>
                      <span className="info-value">{formatCurrency(financialStats.availableBalance)}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Minimum Withdrawal:</span>
                      <span className="info-value">{formatCurrency(payoutSettings?.minPayoutAmount || 50)}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Processing Time:</span>
                      <span className="info-value">1-3 business days</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Fee:</span>
                      <span className="info-value">Free</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Banks Tab */}
          {activeTab === 'banks' && (
            <div className={`content-section ${isVisible ? 'visible' : ''}`}>
              <div className="banks-header">
                <h3 className="section-title">Bank Accounts</h3>
                <button
                  className="premium-button secondary"
                  onClick={() => setShowAddBank(true)}
                >
                  <span className="button-icon">➕</span>
                  Add Bank Account
                </button>
              </div>

              <div className="banks-grid">
                {banks.map((bank, index) => (
                  <div key={bank.id} className={`bank-card ${isVisible ? 'visible' : ''}`} style={{ animationDelay: `${index * 0.1}s` }}>
                    <div className="bank-header">
                      <div className="bank-icon">🏦</div>
                      <div className="bank-info">
                        <h4>{bank.bankName}</h4>
                        <p>****{bank.accountNumber.slice(-4)}</p>
                      </div>
                      <div className="bank-status">
                        {bank.isVerified ? (
                          <span className="status-badge status-completed">Verified</span>
                        ) : (
                          <span className="status-badge status-pending">Pending</span>
                        )}
                      </div>
                    </div>
                    <div className="bank-actions">
                      <button className="action-button edit">
                        <span className="action-icon">✏️</span>
                        Edit
                      </button>
                      <button className="action-button remove">
                        <span className="action-icon">🗑️</span>
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Bank Modal */}
              {showAddBank && (
                <div className="modal-overlay" onClick={() => setShowAddBank(false)}>
                  <div className="premium-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                      <h3>Add Bank Account</h3>
                      <button className="modal-close" onClick={() => setShowAddBank(false)}>×</button>
                    </div>
                    <form onSubmit={handleAddBank} className="modal-form">
                      <div className="form-group">
                        <label className="form-label">Bank Name</label>
                        <input
                          type="text"
                          className="premium-input"
                          value={newBank.bankName}
                          onChange={(e) => setNewBank({...newBank, bankName: e.target.value})}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Account Number</label>
                        <input
                          type="text"
                          className="premium-input"
                          value={newBank.accountNumber}
                          onChange={(e) => setNewBank({...newBank, accountNumber: e.target.value})}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Routing Number</label>
                        <input
                          type="text"
                          className="premium-input"
                          value={newBank.routingNumber}
                          onChange={(e) => setNewBank({...newBank, routingNumber: e.target.value})}
                          required
                        />
                      </div>
                      <div className="modal-actions">
                        <button type="button" className="premium-button secondary" onClick={() => setShowAddBank(false)}>
                          Cancel
                        </button>
                        <button type="submit" className="premium-button primary">
                          Add Bank Account
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className={`content-section ${isVisible ? 'visible' : ''}`}>
              <div className="history-section">
                <h3 className="section-title">Payout History</h3>
                <div className="history-table">
                  <div className="table-header">
                    <div className="header-cell">Date</div>
                    <div className="header-cell">Amount</div>
                    <div className="header-cell">Status</div>
                    <div className="header-cell">Method</div>
                    <div className="header-cell">Reference</div>
                    <div className="header-cell">Actions</div>
                  </div>
                  <div className="table-body">
                    {payoutHistory.map((payout, index) => (
                      <div key={payout.id} className={`table-row ${isVisible ? 'visible' : ''}`} style={{ animationDelay: `${index * 0.05}s` }}>
                        <div className="table-cell">{formatDate(payout.createdAt)}</div>
                        <div className="table-cell amount">{formatCurrency(payout.amount)}</div>
                        <div className="table-cell">{getStatusBadge(payout.status)}</div>
                        <div className="table-cell">{payout.method}</div>
                        <div className="table-cell reference">{payout.reference}</div>
                        <div className="table-cell">
                          <button className="action-button view">
                            <span className="action-icon">👁️</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className={`content-section ${isVisible ? 'visible' : ''}`}>
              <div className="settings-section">
                <div className="settings-card">
                  <h3 className="section-title">Payout Settings</h3>
                  <form onSubmit={handleSavePayout} className="settings-form">
                    <div className="form-group">
                      <label className="form-label">Payout Method</label>
                      <div className="method-options">
                        <label className="method-option">
                          <input 
                            type="radio" 
                            name="payoutMethod" 
                            value="bank" 
                            checked={payoutSettings?.payoutMethod === 'bank'} 
                            onChange={e => handlePayoutChange('payoutMethod', e.target.value)} 
                          />
                          <div className="option-content">
                            <span className="option-icon">🏦</span>
                            <span className="option-label">Bank Transfer</span>
                          </div>
                        </label>
                        <label className="method-option">
                          <input 
                            type="radio" 
                            name="payoutMethod" 
                            value="paypal" 
                            checked={payoutSettings?.payoutMethod === 'paypal'} 
                            onChange={e => handlePayoutChange('payoutMethod', e.target.value)} 
                          />
                          <div className="option-content">
                            <span className="option-icon">💳</span>
                            <span className="option-label">PayPal</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    {payoutSettings?.payoutMethod === 'bank' && (
                      <div className="form-group">
                        <label className="form-label">Bank Account Details</label>
                        <div className="form-grid">
                          <div className="form-field">
                            <label>Account Holder Name</label>
                            <input 
                              type="text" 
                              className="premium-input" 
                              value={payoutSettings?.bankDetails?.accountName || ''} 
                              onChange={e => handleBankDetailsChange('accountName', e.target.value)} 
                              required 
                            />
                          </div>
                          <div className="form-field">
                            <label>Account Number</label>
                            <input 
                              type="text" 
                              className="premium-input" 
                              value={payoutSettings?.bankDetails?.accountNumber || ''} 
                              onChange={e => handleBankDetailsChange('accountNumber', e.target.value)} 
                              required 
                            />
                          </div>
                          <div className="form-field">
                            <label>Routing Number</label>
                            <input 
                              type="text" 
                              className="premium-input" 
                              value={payoutSettings?.bankDetails?.routingNumber || ''} 
                              onChange={e => handleBankDetailsChange('routingNumber', e.target.value)} 
                            />
                          </div>
                          <div className="form-field">
                            <label>Bank Name</label>
                            <input 
                              type="text" 
                              className="premium-input" 
                              value={payoutSettings?.bankDetails?.bankName || ''} 
                              onChange={e => handleBankDetailsChange('bankName', e.target.value)} 
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {payoutSettings?.payoutMethod === 'paypal' && (
                      <div className="form-group">
                        <label className="form-label">PayPal Email</label>
                        <input 
                          type="email" 
                          className="premium-input" 
                          value={payoutSettings?.paypalEmail || ''} 
                          onChange={e => handlePayoutChange('paypalEmail', e.target.value)} 
                          required 
                        />
                      </div>
                    )}

                    <div className="form-group">
                      <label className="form-label">Payout Schedule</label>
                      <select 
                        className="premium-select" 
                        value={payoutSettings?.payoutSchedule || 'weekly'} 
                        onChange={e => handlePayoutChange('payoutSchedule', e.target.value)}
                      >
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Bi-weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="manual">Manual</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Minimum Payout Amount (USD)</label>
                      <input 
                        type="number" 
                        className="premium-input" 
                        value={payoutSettings?.minPayoutAmount || 50} 
                        onChange={e => handlePayoutChange('minPayoutAmount', e.target.value)} 
                        min={1} 
                      />
                    </div>

                    <button 
                      className="premium-button primary" 
                      type="submit" 
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <div className="loading-spinner"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <span className="button-icon">💾</span>
                          Save Settings
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 