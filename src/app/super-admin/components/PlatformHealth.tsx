'use client';

import { useState, useEffect } from 'react';
import './platform-health-monitor.css';

interface SystemHealth {
  uptime: number;
  responseTime: number;
  errorRate: number;
  status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
}

interface DatabaseHealth {
  status: 'HEALTHY' | 'ERROR';
  responseTime: number;
  connections: number;
  queriesPerSecond: number;
  lastBackup: string;
  backupSize: string;
}

interface SystemLoad {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
}

interface ActivityMetrics {
  totalUsers: number;
  activeUsers: number;
  totalSessions: number;
  activeSessions: number;
  totalPayments: number;
  totalPayouts: number;
  pendingApprovals: number;
  userActivityRate: number;
  sessionActivityRate: number;
}

interface RecentActivity {
  hourly: { users: number; sessions: number; payments: number };
  daily: { users: number; sessions: number; payments: number };
  weekly: { users: number; sessions: number; payments: number };
}

interface SecurityMetrics {
  failedLogins: number;
  suspiciousActivities: number;
  blockedIPs: number;
  sslCertificate: {
    status: string;
    expiresAt: string;
    issuer: string;
  };
  firewallStatus: string;
  lastSecurityScan: string;
  vulnerabilities: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

interface PerformanceTrends {
  responseTime: { current: number; average: number; trend: string };
  errorRate: { current: number; average: number; trend: string };
  uptime: { current: number; average: number; trend: string };
  userGrowth: { current: number; previous: number; trend: string };
}

interface SystemAlert {
  id: string;
  type: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  title: string;
  message: string;
  timestamp: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface PlatformHealthProps {
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

export default function PlatformHealth({ showNotification }: PlatformHealthProps) {
  const [healthData, setHealthData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [detailed, setDetailed] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  useEffect(() => {
    fetchHealthData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchHealthData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchHealthData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/super-admin/health');
      const data = await response.json();

      if (data.success && data.data) {
        setHealthData(data.data);
      } else {
        showNotification('error', 'Failed to fetch health data');
        setHealthData(null);
      }
    } catch (error) {
      console.error('Error fetching health data:', error);
      showNotification('error', 'Network error while fetching health data');
      setHealthData(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'HEALTHY': 'text-green-600',
      'DEGRADED': 'text-yellow-600',
      'CRITICAL': 'text-red-600',
      'ERROR': 'text-red-600'
    };
    return colors[status] || 'text-gray-600';
  };

  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: string } = {
      'HEALTHY': 'bg-green-100 text-green-800',
      'DEGRADED': 'bg-yellow-100 text-yellow-800',
      'CRITICAL': 'bg-red-100 text-red-800',
      'ERROR': 'bg-red-100 text-red-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getAlertColor = (type: string) => {
    const colors: { [key: string]: string } = {
      'INFO': 'text-blue-600',
      'WARNING': 'text-yellow-600',
      'ERROR': 'text-red-600',
      'CRITICAL': 'text-red-800'
    };
    return colors[type] || 'text-gray-600';
  };

  const getTrendIcon = (trend: string) => {
    const icons: { [key: string]: string } = {
      'up': '↗️',
      'down': '↘️',
      'stable': '→',
      'fluctuating': '↔️'
    };
    return icons[trend] || '→';
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatPercentage = (num: number) => {
    return `${num.toFixed(1)}%`;
  };

  return (
    <div className="platform-health-container">
      {/* Header */}
      <div className="platform-health-header">
        <h1 className="premium-heading">🏥 Platform Health Monitor</h1>
        <p className="premium-text">Real-time monitoring and diagnostics for system performance</p>
      </div>

      {/* Controls */}
      <div className="health-controls">
        <div className="control-left">
          <button 
            className={`control-btn ${autoRefresh ? 'active' : ''}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <span className="btn-icon">{autoRefresh ? '⏸️' : '▶️'}</span>
            {autoRefresh ? 'Auto Refresh On' : 'Auto Refresh Off'}
          </button>
          
          <button 
            className="control-btn"
            onClick={fetchHealthData}
          >
            <span className="btn-icon">🔄</span>
            Refresh Now
          </button>
          
          <button 
            className={`control-btn ${detailed ? 'active' : ''}`}
            onClick={() => setDetailed(!detailed)}
          >
            <span className="btn-icon">📊</span>
            {detailed ? 'Basic View' : 'Detailed View'}
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Checking platform health...</p>
        </div>
      ) : healthData ? (
        <>
          {/* System Status Overview */}
          <div className="health-status-grid">
            <div className={`health-status-card premium-hover ${healthData.system.status.toLowerCase()}`}>
              <div className="health-status-header">
                <div className="health-status-icon">
                  {healthData.system.status === 'HEALTHY' ? '✅' : 
                   healthData.system.status === 'DEGRADED' ? '⚠️' : '❌'}
                </div>
                <span className={`health-status-badge ${healthData.system.status.toLowerCase()}`}>
                  {healthData.system.status}
                </span>
              </div>
              <div className="health-status-title">System Status</div>
              <div className="health-status-value">{healthData.system.uptime}%</div>
              <div className="health-status-label">Uptime</div>
            </div>

            <div className="health-status-card premium-hover">
              <div className="health-status-header">
                <div className="health-status-icon">⏱️</div>
                <span className="health-status-badge">Performance</span>
              </div>
              <div className="health-status-title">Response Time</div>
              <div className="health-status-value">{healthData.system.responseTime}ms</div>
              <div className="health-status-label">Average</div>
            </div>

            <div className="health-status-card premium-hover">
              <div className="health-status-header">
                <div className="health-status-icon">❌</div>
                <span className="health-status-badge">Errors</span>
              </div>
              <div className="health-status-title">Error Rate</div>
              <div className="health-status-value">{healthData.system.errorRate.toFixed(2)}%</div>
              <div className="health-status-label">Current</div>
            </div>

            <div className="health-status-card premium-hover">
              <div className="health-status-header">
                <div className="health-status-icon">🕒</div>
                <span className="health-status-badge">Last Check</span>
              </div>
              <div className="health-status-title">Last Checked</div>
              <div className="health-status-value">{formatDateTime(healthData.lastChecked)}</div>
              <div className="health-status-label">Timestamp</div>
            </div>
          </div>

          {/* Database Health */}
          <div className="metrics-section">
            <h3 className="section-title">🗄️ Database Health</h3>
            <div className="metrics-grid">
              <div className="metric-card premium-hover">
                <div className="metric-icon">💾</div>
                <div className="metric-content">
                  <div className="metric-value">{healthData.database.responseTime}ms</div>
                  <div className="metric-label">Response Time</div>
                </div>
              </div>

              <div className="metric-card premium-hover">
                <div className="metric-icon">🔗</div>
                <div className="metric-content">
                  <div className="metric-value">{healthData.database.connections}</div>
                  <div className="metric-label">Active Connections</div>
                </div>
              </div>

              <div className="metric-card premium-hover">
                <div className="metric-icon">⚡</div>
                <div className="metric-content">
                  <div className="metric-value">{healthData.database.queriesPerSecond}</div>
                  <div className="metric-label">Queries/sec</div>
                </div>
              </div>

              <div className="metric-card premium-hover">
                <div className="metric-icon">💿</div>
                <div className="metric-content">
                  <div className="metric-value">{formatDateTime(healthData.database.lastBackup)}</div>
                  <div className="metric-label">Last Backup</div>
                </div>
              </div>

              <div className="metric-card premium-hover">
                <div className="metric-icon">📊</div>
                <div className="metric-content">
                  <div className="metric-value">{healthData.database.backupSize}</div>
                  <div className="metric-label">Backup Size</div>
                </div>
              </div>

              <div className="metric-card premium-hover">
                <div className="metric-icon">✅</div>
                <div className="metric-content">
                  <div className="metric-value">{healthData.database.status}</div>
                  <div className="metric-label">Status</div>
                </div>
              </div>
            </div>
          </div>

          {/* System Load */}
          <div className="metrics-section">
            <h3 className="section-title">⚡ System Load</h3>
            <div className="metrics-grid">
              <div className="metric-card premium-hover">
                <div className="metric-icon">🖥️</div>
                <div className="metric-content">
                  <div className="metric-value">{formatPercentage(healthData.load?.cpu || 0)}</div>
                  <div className="metric-label">CPU Usage</div>
                </div>
              </div>

              <div className="metric-card premium-hover">
                <div className="metric-icon">💾</div>
                <div className="metric-content">
                  <div className="metric-value">{formatPercentage(healthData.load?.memory || 0)}</div>
                  <div className="metric-label">Memory Usage</div>
                </div>
              </div>

              <div className="metric-card premium-hover">
                <div className="metric-icon">💿</div>
                <div className="metric-content">
                  <div className="metric-value">{formatPercentage(healthData.load?.disk || 0)}</div>
                  <div className="metric-label">Disk Usage</div>
                </div>
              </div>

              <div className="metric-card premium-hover">
                <div className="metric-icon">🌐</div>
                <div className="metric-content">
                  <div className="metric-value">{formatPercentage(healthData.load?.network || 0)}</div>
                  <div className="metric-label">Network Usage</div>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Metrics */}
          <div className="metrics-section">
            <h3 className="section-title">📈 Activity Metrics</h3>
            <div className="metrics-grid">
              <div className="metric-card premium-hover">
                <div className="metric-icon">👥</div>
                <div className="metric-content">
                  <div className="metric-value">{formatNumber(healthData.activity?.totalUsers || 0)}</div>
                  <div className="metric-label">Total Users</div>
                </div>
              </div>

              <div className="metric-card premium-hover">
                <div className="metric-icon">🟢</div>
                <div className="metric-content">
                  <div className="metric-value">{formatNumber(healthData.activity?.activeUsers || 0)}</div>
                  <div className="metric-label">Active Users</div>
                </div>
              </div>

              <div className="metric-card premium-hover">
                <div className="metric-icon">🎯</div>
                <div className="metric-content">
                  <div className="metric-value">{formatNumber(healthData.activity?.totalSessions || 0)}</div>
                  <div className="metric-label">Total Sessions</div>
                </div>
              </div>

              <div className="metric-card premium-hover">
                <div className="metric-icon">🟡</div>
                <div className="metric-content">
                  <div className="metric-value">{formatNumber(healthData.activity?.activeSessions || 0)}</div>
                  <div className="metric-label">Active Sessions</div>
                </div>
              </div>

              <div className="metric-card premium-hover">
                <div className="metric-icon">💰</div>
                <div className="metric-content">
                  <div className="metric-value">{formatNumber(healthData.activity?.totalPayments || 0)}</div>
                  <div className="metric-label">Total Payments</div>
                </div>
              </div>

              <div className="metric-card premium-hover">
                <div className="metric-icon">💸</div>
                <div className="metric-content">
                  <div className="metric-value">{formatNumber(healthData.activity?.totalPayouts || 0)}</div>
                  <div className="metric-label">Total Payouts</div>
                </div>
              </div>
            </div>
          </div>

          {/* Security Metrics */}
          <div className="metrics-section">
            <h3 className="section-title">🔒 Security Metrics</h3>
            <div className="metrics-grid">
              <div className="metric-card premium-hover">
                <div className="metric-icon">🚫</div>
                <div className="metric-content">
                  <div className="metric-value">{formatNumber(healthData.security?.failedLogins || 0)}</div>
                  <div className="metric-label">Failed Logins</div>
                </div>
              </div>

              <div className="metric-card premium-hover">
                <div className="metric-icon">⚠️</div>
                <div className="metric-content">
                  <div className="metric-value">{formatNumber(healthData.security?.suspiciousActivities || 0)}</div>
                  <div className="metric-label">Suspicious Activities</div>
                </div>
              </div>

              <div className="metric-card premium-hover">
                <div className="metric-icon">🛡️</div>
                <div className="metric-content">
                  <div className="metric-value">{formatNumber(healthData.security?.blockedIPs || 0)}</div>
                  <div className="metric-label">Blocked IPs</div>
                </div>
              </div>

              <div className="metric-card premium-hover">
                <div className="metric-icon">🔐</div>
                <div className="metric-content">
                  <div className="metric-value">{healthData.security?.sslCertificate?.status || 'Unknown'}</div>
                  <div className="metric-label">SSL Certificate</div>
                </div>
              </div>

              <div className="metric-card premium-hover">
                <div className="metric-icon">🔥</div>
                <div className="metric-content">
                  <div className="metric-value">{formatNumber(healthData.security?.vulnerabilities?.critical || 0)}</div>
                  <div className="metric-label">Critical Vulnerabilities</div>
                </div>
              </div>

              <div className="metric-card premium-hover">
                <div className="metric-icon">🔍</div>
                <div className="metric-content">
                  <div className="metric-value">{formatDateTime(healthData.security?.lastSecurityScan || new Date().toISOString())}</div>
                  <div className="metric-label">Last Security Scan</div>
                </div>
              </div>
            </div>
          </div>

          {/* System Alerts */}
          {healthData.alerts && healthData.alerts.length > 0 && (
            <div className="alerts-section">
              <div className="alerts-header">
                <h3 className="alerts-title">🚨 System Alerts</h3>
                <span className="alerts-count">{healthData.alerts.length} alerts</span>
              </div>
              <div className="alerts-list">
                {healthData.alerts.map((alert: SystemAlert) => (
                  <div key={alert.id} className="alert-item">
                    <div className="alert-header">
                      <div className={`alert-icon ${alert.type.toLowerCase()}`}>
                        {alert.type === 'INFO' ? 'ℹ️' : 
                         alert.type === 'WARNING' ? '⚠️' : 
                         alert.type === 'ERROR' ? '❌' : '🚨'}
                      </div>
                      <div className="alert-content">
                        <div className="alert-title">{alert.title}</div>
                        <div className="alert-timestamp">{formatDateTime(alert.timestamp)}</div>
                      </div>
                    </div>
                    <div className="alert-message">{alert.message}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">🏥</div>
          <h3 className="empty-title">No Health Data Available</h3>
          <p className="empty-subtitle">Unable to fetch platform health information</p>
        </div>
      )}
    </div>
  );
} 