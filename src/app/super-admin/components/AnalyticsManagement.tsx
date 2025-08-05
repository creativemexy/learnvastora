'use client';

import { useState, useEffect } from 'react';

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
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'CONFIRMED': 'bg-blue-100 text-blue-800',
      'IN_PROGRESS': 'bg-purple-100 text-purple-800',
      'COMPLETED': 'bg-green-100 text-green-800',
      'CANCELLED': 'bg-red-100 text-red-800',
      'PAID': 'bg-green-100 text-green-800',
      'FAILED': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getHealthColor = (value: number, threshold: number) => {
    return value >= threshold ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="super-admin-analytics-management">
      <div className="super-admin-card">
        <div className="super-admin-card-header">
          <h3>Analytics & Reports</h3>
          <div className="super-admin-card-actions">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="super-admin-select"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
            </select>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="super-admin-select"
            >
              <option value="overview">Overview</option>
              <option value="users">User Analytics</option>
              <option value="sessions">Session Analytics</option>
              <option value="revenue">Revenue Analytics</option>
              <option value="tutors">Tutor Analytics</option>
            </select>
            <button 
              className="super-admin-btn secondary"
              onClick={() => {
                showNotification('info', 'Export functionality coming soon');
              }}
            >
              <i className="fas fa-download"></i>
              Export Report
            </button>
            <button 
              className="super-admin-btn primary"
              onClick={fetchAnalytics}
            >
              <i className="fas fa-sync-alt"></i>
              Refresh
            </button>
          </div>
        </div>
        <div className="super-admin-card-body">
          {loading ? (
            <div className="super-admin-loading">
              <div className="super-admin-spinner"></div>
              <p>Loading analytics...</p>
            </div>
          ) : (
            <>
              {/* Platform Health */}
              {platformHealth && (
                <div className="super-admin-platform-health">
                  <h4>Platform Health</h4>
                  <div className="super-admin-health-metrics">
                    <div className="super-admin-health-metric">
                      <span className="super-admin-health-label">Uptime:</span>
                      <span className={`super-admin-health-value ${getHealthColor(platformHealth.uptime, 99)}`}>
                        {platformHealth.uptime}%
                      </span>
                    </div>
                    <div className="super-admin-health-metric">
                      <span className="super-admin-health-label">Response Time:</span>
                      <span className={`super-admin-health-value ${getHealthColor(platformHealth.responseTime, 200)}`}>
                        {platformHealth.responseTime}ms
                      </span>
                    </div>
                    <div className="super-admin-health-metric">
                      <span className="super-admin-health-label">Error Rate:</span>
                      <span className={`super-admin-health-value ${getHealthColor(platformHealth.errorRate, 1)}`}>
                        {platformHealth.errorRate}%
                      </span>
                    </div>
                    <div className="super-admin-health-metric">
                      <span className="super-admin-health-label">Active Sessions:</span>
                      <span className="super-admin-health-value">
                        {platformHealth.activeSessions}
                      </span>
                    </div>
                    <div className="super-admin-health-metric">
                      <span className="super-admin-health-label">Pending Approvals:</span>
                      <span className="super-admin-health-value">
                        {platformHealth.pendingApprovals}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Overview Analytics */}
              {type === 'overview' && analyticsData?.overview && (
                <div className="super-admin-analytics-overview">
                  <div className="super-admin-overview-stats">
                    <div className="super-admin-stat-card">
                      <div className="super-admin-stat-icon">
                        <i className="fas fa-users"></i>
                      </div>
                      <div className="super-admin-stat-content">
                        <h4>Total Users</h4>
                        <p>{formatNumber(analyticsData.overview.totalUsers)}</p>
                        <span className="super-admin-stat-breakdown">
                          {analyticsData.overview.totalStudents} Students • {analyticsData.overview.totalTutors} Tutors
                        </span>
                      </div>
                    </div>
                    <div className="super-admin-stat-card">
                      <div className="super-admin-stat-icon">
                        <i className="fas fa-calendar-check"></i>
                      </div>
                      <div className="super-admin-stat-content">
                        <h4>Total Sessions</h4>
                        <p>{formatNumber(analyticsData.overview.totalSessions)}</p>
                        <span className="super-admin-stat-breakdown">
                          {analyticsData.overview.activeUsers} Active Users
                        </span>
                      </div>
                    </div>
                    <div className="super-admin-stat-card">
                      <div className="super-admin-stat-icon">
                        <i className="fas fa-dollar-sign"></i>
                      </div>
                      <div className="super-admin-stat-content">
                        <h4>Total Revenue</h4>
                        <p>{formatCurrency(analyticsData.overview.totalRevenue)}</p>
                        <span className="super-admin-stat-breakdown">
                          Net: {formatCurrency(analyticsData.overview.netRevenue)}
                        </span>
                      </div>
                    </div>
                    <div className="super-admin-stat-card">
                      <div className="super-admin-stat-icon">
                        <i className="fas fa-chart-line"></i>
                      </div>
                      <div className="super-admin-stat-content">
                        <h4>Platform Activity</h4>
                        <p>{formatNumber(analyticsData.overview.activeUsers)}</p>
                        <span className="super-admin-stat-breakdown">
                          {analyticsData.overview.pendingApprovals} Pending Approvals
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="super-admin-recent-activity">
                    <div className="super-admin-recent-section">
                      <h4>Recent Sessions</h4>
                      <div className="super-admin-recent-list">
                        {analyticsData.overview.recentBookings.map(booking => (
                          <div key={booking.id} className="super-admin-recent-item">
                            <div className="super-admin-recent-info">
                              <span className="super-admin-recent-title">
                                {booking.student.name} → {booking.tutor.name}
                              </span>
                              <span className="super-admin-recent-date">
                                {formatDateTime(booking.scheduledAt)}
                              </span>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(booking.status)}`}>
                              {booking.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="super-admin-recent-section">
                      <h4>Recent Payments</h4>
                      <div className="super-admin-recent-list">
                        {analyticsData.overview.recentPayments.map(payment => (
                          <div key={payment.id} className="super-admin-recent-item">
                            <div className="super-admin-recent-info">
                              <span className="super-admin-recent-title">
                                {payment.user.name}
                              </span>
                              <span className="super-admin-recent-date">
                                {formatDateTime(payment.createdAt)}
                              </span>
                            </div>
                            <div className="super-admin-recent-amount">
                              <span className="super-admin-amount-value">
                                {formatCurrency(payment.amount)}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(payment.status)}`}>
                                {payment.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* User Analytics */}
              {type === 'users' && analyticsData?.users && (
                <div className="super-admin-user-analytics">
                  <div className="super-admin-analytics-section">
                    <h4>User Growth</h4>
                    <div className="super-admin-user-growth">
                      {analyticsData.users.userGrowth.map(growth => (
                        <div key={growth.role} className="super-admin-growth-item">
                          <span className="super-admin-growth-role">{growth.role}</span>
                          <span className="super-admin-growth-count">{growth._count.id}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="super-admin-analytics-section">
                    <h4>Top Active Users</h4>
                    <div className="super-admin-top-users">
                      {analyticsData.users.topActiveUsers.map(user => (
                        <div key={user.id} className="super-admin-user-item">
                          <div className="super-admin-user-info">
                            <span className="super-admin-user-name">{user.name}</span>
                            <span className="super-admin-user-email">{user.email}</span>
                            <span className="super-admin-user-role">{user.role}</span>
                          </div>
                          <div className="super-admin-user-stats">
                            <span className="super-admin-user-sessions">
                              {user.totalSessions} sessions
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Session Analytics */}
              {type === 'sessions' && analyticsData?.sessions && (
                <div className="super-admin-session-analytics">
                  <div className="super-admin-analytics-section">
                    <h4>Session Statistics</h4>
                    <div className="super-admin-session-stats">
                      <div className="super-admin-stat-item">
                        <span className="super-admin-stat-label">Total Sessions:</span>
                        <span className="super-admin-stat-value">{formatNumber(analyticsData.sessions.totalSessions)}</span>
                      </div>
                      <div className="super-admin-stat-item">
                        <span className="super-admin-stat-label">Total Revenue:</span>
                        <span className="super-admin-stat-value">{formatCurrency(analyticsData.sessions.totalRevenue)}</span>
                      </div>
                      <div className="super-admin-stat-item">
                        <span className="super-admin-stat-label">Total Hours:</span>
                        <span className="super-admin-stat-value">{formatNumber(analyticsData.sessions.totalHours)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="super-admin-analytics-section">
                    <h4>Top Performing Tutors</h4>
                    <div className="super-admin-top-tutors">
                      {analyticsData.sessions.topTutors.map(tutor => (
                        <div key={tutor.id} className="super-admin-tutor-item">
                          <div className="super-admin-tutor-info">
                            <span className="super-admin-tutor-name">{tutor.name}</span>
                            <span className="super-admin-tutor-email">{tutor.email}</span>
                          </div>
                          <div className="super-admin-tutor-stats">
                            <span className="super-admin-tutor-sessions">
                              {tutor.totalSessions} sessions
                            </span>
                            <span className="super-admin-tutor-revenue">
                              {formatCurrency(tutor.totalRevenue)}
                            </span>
                            <span className="super-admin-tutor-rating">
                              ⭐ {tutor.averageRating.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Revenue Analytics */}
              {type === 'revenue' && analyticsData?.revenue && (
                <div className="super-admin-revenue-analytics">
                  <div className="super-admin-analytics-section">
                    <h4>Revenue Overview</h4>
                    <div className="super-admin-revenue-stats">
                      <div className="super-admin-stat-item">
                        <span className="super-admin-stat-label">Total Revenue:</span>
                        <span className="super-admin-stat-value">{formatCurrency(analyticsData.revenue.totalRevenue)}</span>
                      </div>
                      <div className="super-admin-stat-item">
                        <span className="super-admin-stat-label">Total Payouts:</span>
                        <span className="super-admin-stat-value">{formatCurrency(analyticsData.revenue.totalPayouts)}</span>
                      </div>
                      <div className="super-admin-stat-item">
                        <span className="super-admin-stat-label">Net Revenue:</span>
                        <span className={`super-admin-stat-value ${analyticsData.revenue.netRevenue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(analyticsData.revenue.netRevenue)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="super-admin-analytics-section">
                    <h4>Payment Method Breakdown</h4>
                    <div className="super-admin-payment-breakdown">
                      {analyticsData.revenue.paymentMethodBreakdown.map(method => (
                        <div key={method.status} className="super-admin-payment-method">
                          <span className="super-admin-method-status">{method.status}</span>
                          <span className="super-admin-method-count">{method._count.id} payments</span>
                          <span className="super-admin-method-amount">{formatCurrency(method._sum.amount || 0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tutor Analytics */}
              {type === 'tutors' && analyticsData?.tutors && (
                <div className="super-admin-tutor-analytics">
                  <div className="super-admin-analytics-section">
                    <h4>Tutor Performance</h4>
                    <div className="super-admin-tutor-performance">
                      {analyticsData.tutors.topPerformingTutors.map(tutor => (
                        <div key={tutor.id} className="super-admin-tutor-performance-item">
                          <div className="super-admin-tutor-basic">
                            <span className="super-admin-tutor-name">{tutor.name}</span>
                            <span className="super-admin-tutor-email">{tutor.email}</span>
                            <span className="super-admin-tutor-rate">${tutor.hourlyRate}/hr</span>
                          </div>
                          <div className="super-admin-tutor-metrics">
                            <div className="super-admin-metric">
                              <span className="super-admin-metric-label">Sessions:</span>
                              <span className="super-admin-metric-value">{tutor.totalSessions}</span>
                            </div>
                            <div className="super-admin-metric">
                              <span className="super-admin-metric-label">Revenue:</span>
                              <span className="super-admin-metric-value">{formatCurrency(tutor.totalRevenue)}</span>
                            </div>
                            <div className="super-admin-metric">
                              <span className="super-admin-metric-label">Rating:</span>
                              <span className="super-admin-metric-value">⭐ {tutor.averageRating.toFixed(1)}</span>
                            </div>
                            <div className="super-admin-metric">
                              <span className="super-admin-metric-label">Completion:</span>
                              <span className="super-admin-metric-value">{tutor.completionRate.toFixed(1)}%</span>
                            </div>
                          </div>
                          <div className="super-admin-tutor-skills">
                            {tutor.skills.slice(0, 3).map(skill => (
                              <span key={skill} className="super-admin-skill-tag">{skill}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="super-admin-analytics-section">
                    <h4>Skills Distribution</h4>
                    <div className="super-admin-skills-breakdown">
                      {analyticsData.tutors.skillsBreakdown.slice(0, 10).map(skill => (
                        <div key={skill.skill} className="super-admin-skill-item">
                          <span className="super-admin-skill-name">{skill.skill}</span>
                          <span className="super-admin-skill-count">{skill.count} tutors</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
} 