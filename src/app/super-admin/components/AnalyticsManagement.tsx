'use client';

import { useState, useEffect } from 'react';
import './analytics-reports.css';

interface OverviewData {
  totalUsers: number;
  totalTutors: number;
  totalStudents: number;
  totalSessions: number;
  totalRevenue: number;
  activeUsers: number;
  pendingApprovals: number;
  totalPayments: number;
  totalPayouts: number;
  netRevenue: number;
  recentBookings: Array<{
    id: string;
    student: { name: string };
    tutor: { name: string };
    scheduledAt: string;
    status: string;
  }>;
  recentPayments: Array<{
    id: string;
    user: { name: string };
    amount: number;
    status: string;
    createdAt: string;
  }>;
}

interface UserAnalytics {
  userGrowth: Array<{
    role: string;
    _count: { id: number };
  }>;
  userActivity: Array<{
    active: boolean;
    _count: { id: number };
  }>;
  topActiveUsers: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    sessionsAsStudent: number;
    sessionsAsTutor: number;
    totalSessions: number;
  }>;
}

interface SessionAnalytics {
  totalSessions: number;
  totalRevenue: number;
  totalHours: number;
  statusBreakdown: Array<{
    status: string;
    _count: { id: number };
  }>;
  sessionTrends: Array<{
    scheduledAt: string;
    _count: { id: number };
  }>;
  topTutors: Array<{
    id: string;
    name: string;
    email: string;
    totalSessions: number;
    totalRevenue: number;
    averageRating: number;
  }>;
}

interface RevenueAnalytics {
  totalRevenue: number;
  totalPayments: number;
  totalPayouts: number;
  totalPayoutCount: number;
  netRevenue: number;
  revenueTrends: Array<{
    createdAt: string;
    _sum: { amount: number };
  }>;
  paymentMethodBreakdown: Array<{
    status: string;
    _count: { id: number };
    _sum: { amount: number };
  }>;
  payoutMethodBreakdown: Array<{
    method: string;
    _count: { id: number };
    _sum: { amount: number };
  }>;
}

interface TutorAnalytics {
  totalTutors: number;
  activeTutors: number;
  tutorPerformance: Array<{
    id: string;
    name: string;
    email: string;
    hourlyRate: number;
    skills: string[];
    languages: string[];
    totalSessions: number;
    completedSessions: number;
    totalRevenue: number;
    averageRating: number;
    completionRate: number;
  }>;
  topPerformingTutors: Array<{
    id: string;
    name: string;
    email: string;
    hourlyRate: number;
    skills: string[];
    languages: string[];
    totalSessions: number;
    completedSessions: number;
    totalRevenue: number;
    averageRating: number;
    completionRate: number;
  }>;
  skillsBreakdown: Array<{
    skill: string;
    count: number;
  }>;
}

interface PlatformHealth {
  uptime: number;
  responseTime: number;
  errorRate: number;
  activeSessions: number;
  pendingApprovals: number;
  systemAlerts: number;
}

interface AnalyticsData {
  overview?: OverviewData;
  users?: UserAnalytics;
  sessions?: SessionAnalytics;
  revenue?: RevenueAnalytics;
  tutors?: TutorAnalytics;
}

interface AnalyticsManagementProps {
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

export default function AnalyticsManagement({ showNotification }: AnalyticsManagementProps) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [platformHealth, setPlatformHealth] = useState<PlatformHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [type, setType] = useState('overview');
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [period, type]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        period,
        type
      });

      const response = await fetch(`/api/super-admin/analytics?${params}`);
      const data = await response.json();

      if (data.success && data.data) {
        setAnalyticsData(data.data.analytics);
        setPlatformHealth(data.data.platformHealth);
      } else {
        showNotification('error', 'Failed to fetch analytics');
        setAnalyticsData(null);
        setPlatformHealth(null);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      showNotification('error', 'Network error while fetching analytics');
      setAnalyticsData(null);
      setPlatformHealth(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const colors: { [key: string]: string } = {
      'PENDING': 'pending',
      'CONFIRMED': 'success',
      'IN_PROGRESS': 'pending',
      'COMPLETED': 'success',
      'CANCELLED': 'failed',
      'PAID': 'success',
      'FAILED': 'failed'
    };
    return colors[status] || 'pending';
  };

  const getHealthColor = (value: number, threshold: number) => {
    return value >= threshold ? 'positive' : 'negative';
  };

  return (
    <div className="analytics-container">
      {/* Header */}
      <div className="analytics-header">
        <h1 className="premium-heading">📊 Analytics & Reports</h1>
        <p className="premium-text">Comprehensive insights and data analysis for platform performance</p>
      </div>

      {/* Controls */}
      <div className="analytics-controls">
        <div className="control-left">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="filter-select"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </select>
          
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="filter-select"
          >
            <option value="overview">Overview</option>
            <option value="users">User Analytics</option>
            <option value="sessions">Session Analytics</option>
            <option value="revenue">Revenue Analytics</option>
            <option value="tutors">Tutor Analytics</option>
          </select>
        </div>

        <div className="control-right">
          <button 
            className="btn btn-secondary"
            onClick={() => {
              showNotification('info', 'Export functionality coming soon');
            }}
          >
            <span className="btn-icon">📤</span>
            Export Report
          </button>
          
          <button 
            className="btn btn-primary"
            onClick={fetchAnalytics}
          >
            <span className="btn-icon">🔄</span>
            Refresh
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Loading analytics...</p>
        </div>
      ) : (
        <>
          {/* Platform Health */}
          {platformHealth && (
            <div className="health-section">
              <h3 className="section-title">🏥 Platform Health</h3>
              <div className="metric-grid">
                <div className="metric-card premium-hover">
                  <div className="metric-icon">⚡</div>
                  <div className="metric-content">
                    <div className="metric-value">{platformHealth.uptime}%</div>
                    <div className="metric-label">Uptime</div>
                    <div className={`metric-trend ${getHealthColor(platformHealth.uptime, 99)}`}>
                      {platformHealth.uptime >= 99 ? '✅' : '⚠️'}
                    </div>
                  </div>
                </div>
                
                <div className="metric-card premium-hover">
                  <div className="metric-icon">⏱️</div>
                  <div className="metric-content">
                    <div className="metric-value">{platformHealth.responseTime}ms</div>
                    <div className="metric-label">Response Time</div>
                    <div className={`metric-trend ${getHealthColor(platformHealth.responseTime, 200)}`}>
                      {platformHealth.responseTime <= 200 ? '✅' : '⚠️'}
                    </div>
                  </div>
                </div>
                
                <div className="metric-card premium-hover">
                  <div className="metric-icon">❌</div>
                  <div className="metric-content">
                    <div className="metric-value">{platformHealth.errorRate}%</div>
                    <div className="metric-label">Error Rate</div>
                    <div className={`metric-trend ${getHealthColor(platformHealth.errorRate, 1)}`}>
                      {platformHealth.errorRate <= 1 ? '✅' : '⚠️'}
                    </div>
                  </div>
                </div>
                
                <div className="metric-card premium-hover">
                  <div className="metric-icon">👥</div>
                  <div className="metric-content">
                    <div className="metric-value">{platformHealth.activeSessions}</div>
                    <div className="metric-label">Active Sessions</div>
                  </div>
                </div>
                
                <div className="metric-card premium-hover">
                  <div className="metric-icon">⏳</div>
                  <div className="metric-content">
                    <div className="metric-value">{platformHealth.pendingApprovals}</div>
                    <div className="metric-label">Pending Approvals</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Overview Analytics */}
          {type === 'overview' && analyticsData?.overview && (
            <div className="overview-section">
              <h3 className="section-title">📈 Overview Analytics</h3>
              <div className="overview-grid">
                <div className="overview-card premium-hover">
                  <div className="overview-card-header">
                    <div className="overview-card-icon">👥</div>
                    <div className="overview-card-trend positive">+12%</div>
                  </div>
                  <div className="overview-card-value">{formatNumber(analyticsData.overview.totalUsers)}</div>
                  <div className="overview-card-label">Total Users</div>
                </div>
                
                <div className="overview-card premium-hover">
                  <div className="overview-card-header">
                    <div className="overview-card-icon">🎓</div>
                    <div className="overview-card-trend positive">+8%</div>
                  </div>
                  <div className="overview-card-value">{formatNumber(analyticsData.overview.totalTutors)}</div>
                  <div className="overview-card-label">Total Tutors</div>
                </div>
                
                <div className="overview-card premium-hover">
                  <div className="overview-card-header">
                    <div className="overview-card-icon">📚</div>
                    <div className="overview-card-trend positive">+15%</div>
                  </div>
                  <div className="overview-card-value">{formatNumber(analyticsData.overview.totalStudents)}</div>
                  <div className="overview-card-label">Total Students</div>
                </div>
                
                <div className="overview-card premium-hover">
                  <div className="overview-card-header">
                    <div className="overview-card-icon">🎯</div>
                    <div className="overview-card-trend positive">+20%</div>
                  </div>
                  <div className="overview-card-value">{formatNumber(analyticsData.overview.totalSessions)}</div>
                  <div className="overview-card-label">Total Sessions</div>
                </div>
                
                <div className="overview-card premium-hover">
                  <div className="overview-card-header">
                    <div className="overview-card-icon">💰</div>
                    <div className="overview-card-trend positive">+25%</div>
                  </div>
                  <div className="overview-card-value">{formatCurrency(analyticsData.overview.totalRevenue)}</div>
                  <div className="overview-card-label">Total Revenue</div>
                </div>
                
                <div className="overview-card premium-hover">
                  <div className="overview-card-header">
                    <div className="overview-card-icon">📊</div>
                    <div className="overview-card-trend positive">+18%</div>
                  </div>
                  <div className="overview-card-value">{formatNumber(analyticsData.overview.activeUsers)}</div>
                  <div className="overview-card-label">Active Users</div>
                </div>
                
                <div className="overview-card premium-hover">
                  <div className="overview-card-header">
                    <div className="overview-card-icon">⏳</div>
                    <div className="overview-card-trend neutral">0%</div>
                  </div>
                  <div className="overview-card-value">{formatNumber(analyticsData.overview.pendingApprovals)}</div>
                  <div className="overview-card-label">Pending Approvals</div>
                </div>
                
                <div className="overview-card premium-hover">
                  <div className="overview-card-header">
                    <div className="overview-card-icon">💳</div>
                    <div className="overview-card-trend positive">+30%</div>
                  </div>
                  <div className="overview-card-value">{formatCurrency(analyticsData.overview.totalPayments)}</div>
                  <div className="overview-card-label">Total Payments</div>
                </div>
                
                <div className="overview-card premium-hover">
                  <div className="overview-card-header">
                    <div className="overview-card-icon">💸</div>
                    <div className="overview-card-trend positive">+22%</div>
                  </div>
                  <div className="overview-card-value">{formatCurrency(analyticsData.overview.totalPayouts)}</div>
                  <div className="overview-card-label">Total Payouts</div>
                </div>
                
                <div className="overview-card premium-hover">
                  <div className="overview-card-header">
                    <div className="overview-card-icon">📈</div>
                    <div className="overview-card-trend positive">+28%</div>
                  </div>
                  <div className="overview-card-value">{formatCurrency(analyticsData.overview.netRevenue)}</div>
                  <div className="overview-card-label">Net Revenue</div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="recent-activity-section">
                <h3 className="section-title">📅 Recent Activity</h3>
                <div className="activity-grid">
                  <div className="activity-card premium-hover">
                    <h4 className="activity-title">Recent Sessions</h4>
                    <div className="activity-list">
                      {analyticsData.overview.recentBookings.map(booking => (
                        <div key={booking.id} className="activity-item">
                          <div className="activity-info">
                            <span className="activity-title">
                              {booking.student.name} → {booking.tutor.name}
                            </span>
                            <span className="activity-date">
                              {formatDateTime(booking.scheduledAt)}
                            </span>
                          </div>
                          <span className={`activity-status ${getStatusBadge(booking.status)}`}>
                            {booking.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="activity-card premium-hover">
                    <h4 className="activity-title">Recent Payments</h4>
                    <div className="activity-list">
                      {analyticsData.overview.recentPayments.map(payment => (
                        <div key={payment.id} className="activity-item">
                          <div className="activity-info">
                            <span className="activity-title">
                              {payment.user.name}
                            </span>
                            <span className="activity-date">
                              {formatDateTime(payment.createdAt)}
                            </span>
                          </div>
                          <div className="activity-amount">
                            <span className="amount-value">
                              {formatCurrency(payment.amount)}
                            </span>
                            <span className={`activity-status ${getStatusBadge(payment.status)}`}>
                              {payment.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Other Analytics Types */}
          {type !== 'overview' && (
            <div className="analytics-placeholder">
              <h3 className="section-title">📊 {type.charAt(0).toUpperCase() + type.slice(1)} Analytics</h3>
              <p>Detailed analytics for {type} will be implemented here.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
} 