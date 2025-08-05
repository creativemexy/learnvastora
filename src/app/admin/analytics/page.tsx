"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import './admin-analytics.css';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

interface AdminAnalyticsData {
  overview?: any;
  users?: any;
  sessions?: any;
  financial?: any;
  performance?: any;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function AdminAnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');
  const [period, setPeriod] = useState('30d');
  const [analyticsData, setAnalyticsData] = useState<AdminAnalyticsData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tabs = [
    { id: 'overview', label: 'Platform Overview', icon: '📊' },
    { id: 'users', label: 'User Analytics', icon: '👥' },
    { id: 'sessions', label: 'Session Analytics', icon: '📅' },
    { id: 'financial', label: 'Financial Analytics', icon: '💰' },
    { id: 'performance', label: 'Performance Analytics', icon: '⭐' }
  ];

  const periods = [
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: '1y', label: 'Last Year' }
  ];

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/auth/signin");
      return;
    }

    // Check if user is admin
    if ((session.user as any)?.role !== 'ADMIN') {
      router.push("/");
      return;
    }

    fetchAnalyticsData();
  }, [session, status, router, period, activeTab]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/analytics?period=${period}&type=${activeTab}`);
      const data = await response.json();

      if (data.success) {
        setAnalyticsData(prev => ({
          ...prev,
          [activeTab]: data.data
        }));
      } else {
        setError(data.error || 'Failed to fetch analytics data');
      }
    } catch (err) {
      setError('Failed to fetch analytics data');
      console.error('Admin Analytics fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderOverviewTab = () => {
    const data = analyticsData.overview;
    if (!data) return null;

    return (
      <div className="admin-analytics-overview">
        <div className="row g-4">
          {/* Key Metrics */}
          <div className="col-md-3">
            <div className="admin-analytics-card">
              <div className="admin-card-header">
                <h5>Total Users</h5>
                <div className="admin-card-icon">👥</div>
              </div>
              <div className="admin-card-value">{data.totalUsers}</div>
              <div className="admin-card-subtitle">
                {data.totalTutors} tutors, {data.totalStudents} students
              </div>
            </div>
          </div>
          
          <div className="col-md-3">
            <div className="admin-analytics-card">
              <div className="admin-card-header">
                <h5>Total Sessions</h5>
                <div className="admin-card-icon">📅</div>
              </div>
              <div className="admin-card-value">{data.totalSessions}</div>
              <div className="admin-card-subtitle">
                {data.completionRate}% completion rate
              </div>
            </div>
          </div>
          
          <div className="col-md-3">
            <div className="admin-analytics-card">
              <div className="admin-card-header">
                <h5>Total Revenue</h5>
                <div className="admin-card-icon">💰</div>
              </div>
              <div className="admin-card-value">${data.totalRevenue.toLocaleString()}</div>
              <div className="admin-card-subtitle">
                ${data.averageRevenuePerSession} avg per session
              </div>
            </div>
          </div>
          
          <div className="col-md-3">
            <div className="admin-analytics-card">
              <div className="admin-card-header">
                <h5>Active Users</h5>
                <div className="admin-card-icon">🟢</div>
              </div>
              <div className="admin-card-value">{data.activeUsers}</div>
              <div className="admin-card-subtitle">
                {data.newUsers} new this period
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="col-md-8">
            <div className="admin-analytics-card">
              <h5>User Growth</h5>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={[
                  { period: 'Tutors', count: data.totalTutors },
                  { period: 'Students', count: data.totalStudents }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="count" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="col-md-4">
            <div className="admin-analytics-card">
              <h5>Session Status</h5>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Completed', value: data.completedSessions, color: '#00C49F' },
                      { name: 'Pending', value: data.totalSessions - data.completedSessions, color: '#FFBB28' }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {[
                      { name: 'Completed', value: data.completedSessions, color: '#00C49F' },
                      { name: 'Pending', value: data.totalSessions - data.completedSessions, color: '#FFBB28' }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderUsersTab = () => {
    const data = analyticsData.users;
    if (!data) return null;

    return (
      <div className="admin-analytics-users">
        <div className="row g-4">
          <div className="col-md-6">
            <div className="admin-analytics-card">
              <h5>User Growth by Role</h5>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="role" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="col-md-6">
            <div className="admin-analytics-card">
              <h5>Active Users by Role</h5>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.userActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="role" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSessionsTab = () => {
    const data = analyticsData.sessions;
    if (!data) return null;

    return (
      <div className="admin-analytics-sessions">
        <div className="row g-4">
          <div className="col-md-8">
            <div className="admin-analytics-card">
              <h5>Session Statistics</h5>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.sessionStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="col-md-4">
            <div className="admin-analytics-card">
              <h5>Session Metrics</h5>
              <div className="admin-metrics-grid">
                <div className="admin-metric-item">
                  <div className="admin-metric-value">{data.averageDuration}min</div>
                  <div className="admin-metric-label">Average Duration</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFinancialTab = () => {
    const data = analyticsData.financial;
    if (!data) return null;

    return (
      <div className="admin-analytics-financial">
        <div className="row g-4">
          <div className="col-md-8">
            <div className="admin-analytics-card">
              <h5>Revenue by Status</h5>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.revenueStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="amount" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="col-md-4">
            <div className="admin-analytics-card">
              <h5>Revenue by Gateway</h5>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.revenueByGateway}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ gateway, percent }) => `${gateway} ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {data.revenueByGateway.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPerformanceTab = () => {
    const data = analyticsData.performance;
    if (!data) return null;

    return (
      <div className="admin-analytics-performance">
        <div className="row g-4">
          <div className="col-md-6">
            <div className="admin-analytics-card">
              <h5>Rating Distribution</h5>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.ratingDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="rating" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="col-md-6">
            <div className="admin-analytics-card">
              <h5>Top Performing Tutors</h5>
              <div className="admin-top-tutors">
                {data.topTutors.slice(0, 5).map((tutor: any, index: number) => (
                  <div key={tutor.tutorId} className="admin-tutor-item">
                    <div className="admin-tutor-rank">#{index + 1}</div>
                    <div className="admin-tutor-info">
                      <div className="admin-tutor-name">{tutor.name}</div>
                      <div className="admin-tutor-stats">
                        {tutor.averageRating} ⭐ ({tutor.reviewCount} reviews)
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="col-md-12">
            <div className="admin-analytics-card">
              <h5>Performance Metrics</h5>
              <div className="admin-metrics-grid">
                <div className="admin-metric-item">
                  <div className="admin-metric-value">{data.averageRating}</div>
                  <div className="admin-metric-label">Average Rating</div>
                </div>
                <div className="admin-metric-item">
                  <div className="admin-metric-value">{data.totalReviews}</div>
                  <div className="admin-metric-label">Total Reviews</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'users':
        return renderUsersTab();
      case 'sessions':
        return renderSessionsTab();
      case 'financial':
        return renderFinancialTab();
      case 'performance':
        return renderPerformanceTab();
      default:
        return renderOverviewTab();
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="admin-analytics-page">
        <div className="admin-analytics-loading">
          <div className="spinner"></div>
          <p>Loading admin analytics...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="admin-analytics-page">
      <div className="admin-analytics-container">
        <div className="admin-analytics-header">
          <h1>Admin Analytics Dashboard</h1>
          <p>Platform-wide analytics and insights</p>
        </div>

        <div className="admin-analytics-controls">
          <div className="period-selector">
            <label>Time Period:</label>
            <select value={period} onChange={(e) => setPeriod(e.target.value)}>
              {periods.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="admin-analytics-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`admin-analytics-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>

        {error && (
          <div className="admin-analytics-error">
            <p>{error}</p>
            <button onClick={fetchAnalyticsData}>Retry</button>
          </div>
        )}

        <div className="admin-analytics-content">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
} 