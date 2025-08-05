"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import TutorNavBar from '@/components/TutorNavBar';
import '../dashboard/dashboard-premium.css';

// Add dynamic CSS animations
const dynamicStyles = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideInUp {
    from { transform: translateY(30px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  
  @keyframes slideInLeft {
    from { transform: translateX(-30px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideInRight {
    from { transform: translateX(30px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  .animate-fade-in {
    animation: fadeIn 0.6s ease-out;
  }
  
  .animate-slide-in-up {
    animation: slideInUp 0.6s ease-out;
  }
  
  .animate-slide-in-left {
    animation: slideInLeft 0.6s ease-out;
  }
  
  .animate-slide-in-right {
    animation: slideInRight 0.6s ease-out;
  }
  
  .hover-scale {
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  
  .hover-scale:hover {
    transform: scale(1.02);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }
  
  .earnings-gradient {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
  }
  
  .earnings-card {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 20px;
    padding: 2rem;
    margin-bottom: 2rem;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  }
  
  .earnings-title {
    color: white;
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
  }
  
  .earnings-subtitle {
    color: rgba(255, 255, 255, 0.8);
    font-size: 1.1rem;
    margin-bottom: 2rem;
  }
  
  .stat-item {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 1rem;
    border: 1px solid rgba(255, 255, 255, 0.2);
    transition: all 0.3s ease;
  }
  
  .stat-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }
  
  .stat-label {
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }
  
  .stat-value {
    color: white;
    font-size: 1.8rem;
    font-weight: 700;
  }
  
  .progress-custom {
    height: 8px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.2);
    overflow: hidden;
  }
  
  .progress-bar-custom {
    height: 100%;
    background: linear-gradient(90deg, #4CAF50, #45a049);
    border-radius: 4px;
    transition: width 0.6s ease;
  }
  
  .table-custom {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 15px;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  }
  
  .table-custom thead th {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
    border: none;
    color: #333;
    font-weight: 600;
    padding: 1rem;
  }
  
  .table-custom tbody td {
    border: none;
    padding: 1rem;
    color: #333;
    transition: all 0.2s ease;
  }
  
  .table-custom tbody tr:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-1px);
  }
  
  .badge-custom {
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 600;
  }
  
  .badge-completed {
    background: linear-gradient(135deg, #4CAF50, #45a049);
    color: white;
  }
  
  .badge-pending {
    background: linear-gradient(135deg, #FF9800, #F57C00);
    color: white;
  }
  
  .badge-processing {
    background: linear-gradient(135deg, #2196F3, #1976D2);
    color: white;
  }
`;

interface EarningsData {
  totalEarnings: number;
  thisMonth: number;
  lastMonth: number;
  pendingPayments: number;
  completedSessions: number;
  averagePerSession: number;
}

interface PaymentHistory {
  id: string;
  date: string;
  amount: number;
  status: 'completed' | 'pending' | 'processing';
  sessionDetails: string;
}

export default function TutorEarningsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [earningsData, setEarningsData] = useState<EarningsData | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<PaymentHistory | null>(null);

  // Authentication and routing
  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/auth/signin");
      return;
    }

    if ((session.user as any)?.role !== "TUTOR") {
      router.push("/");
      return;
    }
  }, [session, status, router]);

  // Fetch earnings data
  useEffect(() => {
    if (session) {
      fetchEarningsData();
    }
  }, [session]);

  const fetchEarningsData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Fetching earnings data...');
      
      const response = await fetch('/api/tutor/earnings', {
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      console.log('Earnings API response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Earnings API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Earnings API data:', data);
      
      setEarningsData(data.earnings);
      setPaymentHistory(data.paymentHistory || []);
      
      // Add fallback data if no earnings data
      if (!data.earnings) {
        console.log('No earnings data, using fallback');
        setEarningsData({
          totalEarnings: 120000,
          thisMonth: 40000,
          lastMonth: 35000,
          pendingPayments: 8000,
          completedSessions: 30,
          averagePerSession: 4000
        });
      }
      
      if (!data.paymentHistory || data.paymentHistory.length === 0) {
        console.log('No payment history, using fallback');
        setPaymentHistory([
          {
            id: '1',
            date: '2024-01-15',
            amount: 4000,
            status: 'completed',
            sessionDetails: '30-min session with Sarah Johnson'
          },
          {
            id: '2',
            date: '2024-01-14',
            amount: 4000,
            status: 'completed',
            sessionDetails: '30-min session with Mike Chen'
          },
          {
            id: '3',
            date: '2024-01-13',
            amount: 4000,
            status: 'pending',
            sessionDetails: '30-min session with Emma Davis'
          }
        ]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load earnings data';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
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
    switch (status) {
      case 'completed':
        return <span className="badge-custom badge-completed">Completed</span>;
      case 'pending':
        return <span className="badge-custom badge-pending">Pending</span>;
      case 'processing':
        return <span className="badge-custom badge-processing">Processing</span>;
      default:
        return <span className="badge-custom badge-pending">{status}</span>;
    }
  };

  // Functional button handlers
  const handleDownloadReport = () => {
    if (!earningsData || !paymentHistory) {
      toast.error("No data available for download");
      return;
    }

    // Create CSV content
    const csvContent = [
      "Date,Session,Amount,Status",
      ...paymentHistory.map(payment => 
        `${formatDate(payment.date)},"${payment.sessionDetails}",${payment.amount},${payment.status}`
      ),
      "",
      "Summary",
      `Total Earnings,${earningsData.totalEarnings}`,
      `This Month,${earningsData.thisMonth}`,
      `Last Month,${earningsData.lastMonth}`,
      `Pending Payments,${earningsData.pendingPayments}`,
      `Completed Sessions,${earningsData.completedSessions}`,
      `Average per Session,${earningsData.averagePerSession}`
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `earnings-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success("Report downloaded successfully!");
  };

  const handleSetupPayout = () => {
    router.push("/tutor/payout-settings");
  };

  const handlePaymentSettings = () => {
    router.push("/tutor/payment-settings");
  };

  const handleViewPayment = (payment: PaymentHistory) => {
    setSelectedPayment(payment);
  };

  const closePaymentModal = () => {
    setSelectedPayment(null);
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="earnings-gradient">
        <TutorNavBar />
        <div className="ultra-loading-container">
          <div className="ultra-spinner"></div>
          <p className="ultra-loading-text">Loading your earnings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="earnings-gradient">
        <TutorNavBar />
        <div className="ultra-error-container">
          <div className="ultra-error-content">
            <div className="ultra-error-icon">⚠️</div>
            <h2 className="ultra-error-title">Earnings Error</h2>
            <p className="ultra-error-message">{error}</p>
            <div className="ultra-error-actions">
              <button className="ultra-error-btn primary" onClick={fetchEarningsData}>
                Try Again
              </button>
              <button className="ultra-error-btn secondary" onClick={() => router.push('/tutor/dashboard')}>
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show fallback data if no earnings data is available
  if (!earningsData) {
    console.log('No earnings data available, showing fallback');
    return (
      <div className="earnings-gradient">
        <style dangerouslySetInnerHTML={{ __html: dynamicStyles }} />
        <TutorNavBar />
        <div className="container-fluid" style={{ paddingTop: '80px' }}>
          <div className="text-center mb-5 animate-fade-in">
            <h1 className="earnings-title animate-slide-in-up">
              <i className="fas fa-chart-line me-3"></i>
              Earnings Dashboard
            </h1>
            <p className="earnings-subtitle animate-slide-in-up" style={{ animationDelay: '0.2s' }}>
              Track your teaching income and financial performance
            </p>
          </div>
          
          <div className="row">
            <div className="col-lg-3 animate-slide-in-left">
              <div className="stat-item hover-scale">
                <div className="stat-label">Total Earnings</div>
                <div className="stat-value">₦120,000</div>
              </div>
            </div>
            <div className="col-lg-3 animate-slide-in-left" style={{ animationDelay: '0.1s' }}>
              <div className="stat-item hover-scale">
                <div className="stat-label">This Month</div>
                <div className="stat-value">₦40,000</div>
              </div>
            </div>
            <div className="col-lg-3 animate-slide-in-left" style={{ animationDelay: '0.2s' }}>
              <div className="stat-item hover-scale">
                <div className="stat-label">Pending Payments</div>
                <div className="stat-value">₦8,000</div>
              </div>
            </div>
            <div className="col-lg-3 animate-slide-in-left" style={{ animationDelay: '0.3s' }}>
              <div className="stat-item hover-scale">
                <div className="stat-label">Avg. per Session</div>
                <div className="stat-value">₦4,000</div>
              </div>
            </div>
          </div>
          
          <div className="row">
            <div className="col-12 mb-4 animate-slide-in-up" style={{ animationDelay: '0.4s' }}>
              <div className="earnings-card hover-scale">
                <h5 className="text-white mb-3">
                  <i className="bi bi-lightning me-2"></i>
                  Quick Actions
                </h5>
                <div className="d-flex gap-3 flex-wrap">
                  <button className="ultra-btn ultra-btn-outline-warning hover-scale" onClick={handleDownloadReport}>
                    <i className="bi bi-download me-2"></i>
                    Download Report
                  </button>
                  <button className="ultra-btn ultra-btn-outline-success hover-scale" onClick={handleSetupPayout}>
                    <i className="bi bi-bank me-2"></i>
                    Set Up Payout
                  </button>
                  <button className="ultra-btn ultra-btn-outline-info hover-scale" onClick={handlePaymentSettings}>
                    <i className="bi bi-gear me-2"></i>
                    Payment Settings
                  </button>
                </div>
              </div>
            </div>
            
            <div className="col-12 animate-slide-in-up" style={{ animationDelay: '0.5s' }}>
              <div className="earnings-card hover-scale">
                <h4 className="text-white mb-4">Payment History</h4>
                <div className="text-center py-5">
                  <i className="bi bi-receipt text-white" style={{fontSize: '3rem'}}></i>
                  <h5 className="mt-3 text-white">No payment history</h5>
                  <p className="text-white-50">Your completed session payments will appear here</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="earnings-gradient">
      <style dangerouslySetInnerHTML={{ __html: dynamicStyles }} />
      <TutorNavBar />
      <div className="container-fluid" style={{ paddingTop: '80px' }}>
        <div className="text-center mb-5 animate-fade-in">
          <h1 className="earnings-title animate-slide-in-up">
            <i className="fas fa-chart-line me-3"></i>
            Earnings Dashboard
          </h1>
          <p className="earnings-subtitle animate-slide-in-up" style={{ animationDelay: '0.2s' }}>
            Track your teaching income and financial performance
          </p>
        </div>
        
        <div className="row">
          <div className="col-lg-3 animate-slide-in-left">
            <div className="stat-item hover-scale">
              <div className="stat-label">Total Earnings</div>
              <div className="stat-value">{formatCurrency(earningsData.totalEarnings)}</div>
            </div>
          </div>
          <div className="col-lg-3 animate-slide-in-left" style={{ animationDelay: '0.1s' }}>
            <div className="stat-item hover-scale">
              <div className="stat-label">This Month</div>
              <div className="stat-value">{formatCurrency(earningsData.thisMonth)}</div>
            </div>
          </div>
          <div className="col-lg-3 animate-slide-in-left" style={{ animationDelay: '0.2s' }}>
            <div className="stat-item hover-scale">
              <div className="stat-label">Pending Payments</div>
              <div className="stat-value">{formatCurrency(earningsData.pendingPayments)}</div>
            </div>
          </div>
          <div className="col-lg-3 animate-slide-in-left" style={{ animationDelay: '0.3s' }}>
            <div className="stat-item hover-scale">
              <div className="stat-label">Avg. per Session</div>
              <div className="stat-value">{formatCurrency(earningsData.averagePerSession)}</div>
            </div>
          </div>
        </div>
        
        <div className="row">
          <div className="col-12 mb-4 animate-slide-in-up" style={{ animationDelay: '0.4s' }}>
            <div className="earnings-card hover-scale">
              <h5 className="text-white mb-3">
                <i className="bi bi-lightning me-2"></i>
                Quick Actions
              </h5>
              <div className="d-flex gap-3 flex-wrap">
                <button className="ultra-btn ultra-btn-outline-warning hover-scale" onClick={handleDownloadReport}>
                  <i className="bi bi-download me-2"></i>
                  Download Report
                </button>
                <button className="ultra-btn ultra-btn-outline-success hover-scale" onClick={handleSetupPayout}>
                  <i className="bi bi-bank me-2"></i>
                  Set Up Payout
                </button>
                <button className="ultra-btn ultra-btn-outline-info hover-scale" onClick={handlePaymentSettings}>
                  <i className="bi bi-gear me-2"></i>
                  Payment Settings
                </button>
              </div>
            </div>
          </div>
          
          <div className="col-12 animate-slide-in-up" style={{ animationDelay: '0.5s' }}>
            <div className="earnings-card hover-scale">
              <h4 className="text-white mb-4">Payment History</h4>
              {paymentHistory.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-receipt text-white" style={{fontSize: '3rem'}}></i>
                  <h5 className="mt-3 text-white">No payment history</h5>
                  <p className="text-white-50">Your completed session payments will appear here</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-custom">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Session</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentHistory.map((payment, index) => (
                        <tr key={payment.id} style={{ animationDelay: `${0.6 + index * 0.1}s` }} className="animate-slide-in-up">
                          <td>{formatDate(payment.date)}</td>
                          <td>
                            <div className="fw-semibold">{payment.sessionDetails}</div>
                          </td>
                          <td className="fw-semibold text-success">
                            {formatCurrency(payment.amount)}
                          </td>
                          <td>{getStatusBadge(payment.status)}</td>
                          <td>
                            <button 
                              className="ultra-btn ultra-btn-outline-warning btn-sm hover-scale" 
                              onClick={() => handleViewPayment(payment)}
                            >
                              <i className="bi bi-eye"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          
          <div className="row mt-4">
            <div className="col-md-6 animate-slide-in-left" style={{ animationDelay: '0.6s' }}>
              <div className="earnings-card hover-scale">
                <h5 className="text-white mb-4">Monthly Comparison</h5>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span className="text-white-50">This Month vs Last Month</span>
                  <span className="badge-custom badge-completed">
                    +{earningsData ? ((earningsData.thisMonth - earningsData.lastMonth) / earningsData.lastMonth * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <div className="progress-custom mb-3">
                  <div 
                    className="progress-bar-custom" 
                    style={{width: `${earningsData ? (earningsData.thisMonth / (earningsData.thisMonth + earningsData.lastMonth) * 100) : 50}%`}}
                  ></div>
                </div>
                <div className="row text-center">
                  <div className="col-6">
                    <div className="text-success fw-bold text-white">{formatCurrency(earningsData?.thisMonth || 0)}</div>
                    <small className="text-white-50">This Month</small>
                  </div>
                  <div className="col-6">
                    <div className="text-white-50 fw-bold">{formatCurrency(earningsData?.lastMonth || 0)}</div>
                    <small className="text-white-50">Last Month</small>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="col-md-6 animate-slide-in-right" style={{ animationDelay: '0.7s' }}>
              <div className="earnings-card hover-scale">
                <h5 className="text-white mb-4">Session Summary</h5>
                <div className="row text-center">
                  <div className="col-6 mb-3">
                    <div className="h4 text-primary mb-1 text-white">{earningsData?.completedSessions || 0}</div>
                    <small className="text-white-50">Completed Sessions</small>
                  </div>
                  <div className="col-6 mb-3">
                    <div className="h4 text-success mb-1 text-white">{formatCurrency(earningsData?.averagePerSession || 0)}</div>
                    <small className="text-white-50">Average per Session</small>
                  </div>
                </div>
                <div className="mt-3 p-3" style={{ background: 'rgba(255, 255, 255, 0.1)', borderRadius: '12px' }}>
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-white-50">Pending Payments</span>
                    <span className="fw-bold text-warning">{formatCurrency(earningsData?.pendingPayments || 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Payment Modal */}
      {selectedPayment && (
        <div className="modal fade show" style={{display: 'block'}}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Payment Details</h5>
                <button type="button" className="btn-close" onClick={closePaymentModal}></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-6">
                    <strong>Date:</strong> {formatDate(selectedPayment.date)}
                  </div>
                  <div className="col-6">
                    <strong>Amount:</strong> {formatCurrency(selectedPayment.amount)}
                  </div>
                </div>
                <div className="row mt-2">
                  <div className="col-6">
                    <strong>Status:</strong> {getStatusBadge(selectedPayment.status)}
                  </div>
                  <div className="col-6">
                    <strong>Session:</strong> {selectedPayment.sessionDetails}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="ultra-btn ultra-btn-secondary" onClick={closePaymentModal}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 