"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import StudentNavbar from "@/components/StudentNavbar";
import TutorNavBar from "@/components/TutorNavBar";
import './analytics.css';
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

interface AnalyticsData {
  overview?: any;
  sessions?: any;
  performance?: any;
  financial?: any;
  engagement?: any;
  trends?: any;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');
  const [period, setPeriod] = useState('30d');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tabs = [
    { id: 'overview', label: t('analytics.overview'), icon: '📊' },
    { id: 'sessions', label: t('analytics.sessions'), icon: '📅' },
    { id: 'performance', label: t('analytics.performance'), icon: '⭐' },
    { id: 'financial', label: t('analytics.financial'), icon: '💰' },
    { id: 'engagement', label: t('analytics.engagement'), icon: '📈' },
    { id: 'trends', label: t('analytics.trends'), icon: '📉' }
  ];

  const periods = [
    { value: '7d', label: t('analytics.last_7_days') },
    { value: '30d', label: t('analytics.last_30_days') },
    { value: '90d', label: t('analytics.last_90_days') },
    { value: '1y', label: t('analytics.last_year') }
  ];

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/auth/signin");
      return;
    }

    fetchAnalyticsData();
  }, [session, status, router, period, activeTab]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/analytics?period=${period}&type=${activeTab}`);
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
      console.error('Analytics fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderOverviewTab = () => {
    const data = analyticsData.overview;
    if (!data) return null;

    return (
      <div className="analytics-overview">
        <div className="row g-4">
          {/* Key Metrics */}
          <div className="col-md-3">
            <div className="analytics-card">
              <div className="analytics-card-header">
                <h5>{t('analytics.total_sessions')}</h5>
                <div className="analytics-icon">📊</div>
              </div>
              <div className="analytics-card-value">{data.totalSessions}</div>
              <div className="analytics-card-subtitle">{t('analytics.sessions_this_period')}</div>
            </div>
          </div>
          
          <div className="col-md-3">
            <div className="analytics-card">
              <div className="analytics-card-header">
                <h5>{t('analytics.completed_sessions')}</h5>
                <div className="analytics-icon">✅</div>
              </div>
              <div className="analytics-card-value">{data.completedSessions}</div>
              <div className="analytics-card-subtitle">{data.completionRate}% {t('analytics.completion_rate')}</div>
            </div>
          </div>
          
          <div className="col-md-3">
            <div className="analytics-card">
              <div className="analytics-card-header">
                <h5>{t('analytics.total_hours')}</h5>
                <div className="analytics-icon">⏰</div>
              </div>
              <div className="analytics-card-value">{data.totalHours}h</div>
              <div className="analytics-card-subtitle">{t('analytics.learning_time')}</div>
            </div>
          </div>
          
          <div className="col-md-3">
            <div className="analytics-card">
              <div className="analytics-card-header">
                <h5>{t('analytics.average_rating')}</h5>
                <div className="analytics-icon">⭐</div>
              </div>
              <div className="analytics-card-value">{data.averageRating}</div>
              <div className="analytics-card-subtitle">{t('analytics.out_of_5_stars')}</div>
            </div>
          </div>

          {/* Charts */}
          <div className="col-md-8">
            <div className="analytics-card">
              <h5>{t('analytics.session_status_distribution')}</h5>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: t('analytics.completed'), value: data.completedSessions, color: '#00C49F' },
                      { name: t('analytics.cancelled'), value: data.cancelledSessions, color: '#FF8042' },
                      { name: t('analytics.pending'), value: data.totalSessions - data.completedSessions - data.cancelledSessions, color: '#FFBB28' }
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
                      { name: t('analytics.completed'), value: data.completedSessions, color: '#00C49F' },
                      { name: t('analytics.cancelled'), value: data.cancelledSessions, color: '#FF8042' },
                      { name: t('analytics.pending'), value: data.totalSessions - data.completedSessions - data.cancelledSessions, color: '#FFBB28' }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="col-md-4">
            <div className="analytics-card">
              <h5>{t('analytics.financial_summary')}</h5>
              <div className="financial-summary">
                <div className="financial-item">
                  <span className="financial-label">{t('analytics.total_spent')}</span>
                  <span className="financial-value">${data.totalSpent}</span>
                </div>
                <div className="financial-item">
                  <span className="financial-label">{t('analytics.avg_per_session')}</span>
                  <span className="financial-value">
                    ${data.completedSessions > 0 ? (data.totalSpent / data.completedSessions).toFixed(2) : '0.00'}
                  </span>
                </div>
              </div>
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
      <div className="analytics-sessions">
        <div className="row g-4">
          <div className="col-md-8">
            <div className="analytics-card">
              <h5>{t('analytics.sessions_over_time')}</h5>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data.timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="sessions" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="col-md-4">
            <div className="analytics-card">
              <h5>{t('analytics.session_duration_distribution')}</h5>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.durationDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="duration" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="col-md-6">
            <div className="analytics-card">
              <h5>{t('analytics.session_metrics')}</h5>
              <div className="metrics-grid">
                <div className="metric-item">
                  <div className="metric-value">{data.totalSessions}</div>
                  <div className="metric-label">{t('analytics.total_sessions')}</div>
                </div>
                <div className="metric-item">
                  <div className="metric-value">{data.averageSessionDuration}min</div>
                  <div className="metric-label">{t('analytics.avg_duration')}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="analytics-card">
              <h5>{t('analytics.ratings_over_time')}</h5>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 5]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="averageRating" stroke="#ff7300" strokeWidth={2} />
                </LineChart>
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
      <div className="analytics-performance">
        <div className="row g-4">
          <div className="col-md-6">
            <div className="analytics-card">
              <h5>{t('analytics.rating_distribution')}</h5>
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
            <div className="analytics-card">
              <h5>{t('analytics.weekly_ratings')}</h5>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.weeklyRatings}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis domain={[0, 5]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="averageRating" stroke="#82ca9d" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="col-md-12">
            <div className="analytics-card">
              <h5>{t('analytics.performance_metrics')}</h5>
              <div className="metrics-grid">
                <div className="metric-item">
                  <div className="metric-value">{data.totalReviews}</div>
                  <div className="metric-label">{t('analytics.total_reviews')}</div>
                </div>
                <div className="metric-item">
                  <div className="metric-value">{data.averageRating}</div>
                  <div className="metric-label">{t('analytics.average_rating')}</div>
                </div>
                <div className="metric-item">
                  <div className="metric-value">{data.topRating}</div>
                  <div className="metric-label">{t('analytics.highest_rating')}</div>
                </div>
                <div className="metric-item">
                  <div className="metric-value">{data.lowestRating}</div>
                  <div className="metric-label">{t('analytics.lowest_rating')}</div>
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

    const isTutor = (session?.user as any)?.role === 'TUTOR';

    return (
      <div className="analytics-financial">
        <div className="row g-4">
          <div className="col-md-8">
            <div className="analytics-card">
              <h5>{isTutor ? t('analytics.monthly_earnings') : t('analytics.monthly_spending')}</h5>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={isTutor ? data.monthlyEarnings : data.monthlySpending}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey={isTutor ? "earnings" : "spending"} fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="col-md-4">
            <div className="analytics-card">
              <h5>{t('analytics.financial_summary')}</h5>
              <div className="financial-summary">
                <div className="financial-item">
                  <span className="financial-label">
                    {isTutor ? t('analytics.total_earnings') : t('analytics.total_spent')}
                  </span>
                  <span className="financial-value">
                    ${isTutor ? data.totalEarnings : data.totalSpent}
                  </span>
                </div>
                <div className="financial-item">
                  <span className="financial-label">
                    {isTutor ? t('analytics.avg_earning') : t('analytics.avg_spending')}
                  </span>
                  <span className="financial-value">
                    ${isTutor ? data.averageEarning : data.averageSpending}
                  </span>
                </div>
                <div className="financial-item">
                  <span className="financial-label">{t('analytics.total_transactions')}</span>
                  <span className="financial-value">{data.totalPayments}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderEngagementTab = () => {
    const data = analyticsData.engagement;
    if (!data) return null;

    return (
      <div className="analytics-engagement">
        <div className="row g-4">
          <div className="col-md-6">
            <div className="analytics-card">
              <h5>{t('analytics.daily_activity')}</h5>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.dailyActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="sessions" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="col-md-6">
            <div className="analytics-card">
              <h5>{t('analytics.engagement_metrics')}</h5>
              <div className="metrics-grid">
                <div className="metric-item">
                  <div className="metric-value">{data.totalSessions}</div>
                  <div className="metric-label">{t('analytics.total_sessions')}</div>
                </div>
                <div className="metric-item">
                  <div className="metric-value">{data.recordingRate}%</div>
                  <div className="metric-label">{t('analytics.recording_rate')}</div>
                </div>
                <div className="metric-item">
                  <div className="metric-value">{data.messagingRate}%</div>
                  <div className="metric-label">{t('analytics.messaging_rate')}</div>
                </div>
                <div className="metric-item">
                  <div className="metric-value">{data.averageSessionsPerWeek}</div>
                  <div className="metric-label">{t('analytics.avg_sessions_per_week')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTrendsTab = () => {
    const data = analyticsData.trends;
    if (!data) return null;

    return (
      <div className="analytics-trends">
        <div className="row g-4">
          <div className="col-md-12">
            <div className="analytics-card">
              <h5>{t('analytics.weekly_trends')}</h5>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={data.trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="sessions" stroke="#8884d8" strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="averageRating" stroke="#82ca9d" strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#ffc658" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="col-md-4">
            <div className="analytics-card">
              <h5>{t('analytics.growth_rates')}</h5>
              <div className="growth-metrics">
                <div className="growth-item">
                  <span className="growth-label">{t('analytics.sessions_growth')}</span>
                  <span className={`growth-value ${data.growthRate >= 0 ? 'positive' : 'negative'}`}>
                    {data.growthRate >= 0 ? '+' : ''}{data.growthRate}%
                  </span>
                </div>
                <div className="growth-item">
                  <span className="growth-label">{t('analytics.rating_growth')}</span>
                  <span className={`growth-value ${data.ratingTrend >= 0 ? 'positive' : 'negative'}`}>
                    {data.ratingTrend >= 0 ? '+' : ''}{data.ratingTrend}%
                  </span>
                </div>
                <div className="growth-item">
                  <span className="growth-label">{t('analytics.revenue_growth')}</span>
                  <span className={`growth-value ${data.revenueTrend >= 0 ? 'positive' : 'negative'}`}>
                    {data.revenueTrend >= 0 ? '+' : ''}{data.revenueTrend}%
                  </span>
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
      case 'sessions':
        return renderSessionsTab();
      case 'performance':
        return renderPerformanceTab();
      case 'financial':
        return renderFinancialTab();
      case 'engagement':
        return renderEngagementTab();
      case 'trends':
        return renderTrendsTab();
      default:
        return renderOverviewTab();
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="analytics-page">
        {(session?.user as any)?.role === 'TUTOR' ? <TutorNavBar /> : <StudentNavbar />}
        <div className="analytics-loading">
          <div className="spinner"></div>
          <p>{t('analytics.loading_analytics')}</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="analytics-page">
      {(session?.user as any)?.role === 'TUTOR' ? <TutorNavBar /> : <StudentNavbar />}
      
      <div className="analytics-container">
        <div className="analytics-header">
          <h1>{t('analytics.title')}</h1>
          <p>{t('analytics.subtitle')}</p>
        </div>

        <div className="analytics-controls">
          <div className="period-selector">
            <label>{t('analytics.time_period')}:</label>
            <select value={period} onChange={(e) => setPeriod(e.target.value)}>
              {periods.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="analytics-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`analytics-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>

        {error && (
          <div className="analytics-error">
            <p>{error}</p>
            <button onClick={fetchAnalyticsData}>{t('analytics.retry')}</button>
          </div>
        )}

        <div className="analytics-content">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
} 