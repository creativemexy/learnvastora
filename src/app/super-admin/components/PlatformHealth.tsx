'use client';

import { useState, useEffect } from 'react';

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
      const params = new URLSearchParams({
        detailed: detailed.toString()
      });

      const response = await fetch(`/api/super-admin/health?${params}`);
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
    const colors: { [key: string]: string } = {
      'HEALTHY': 'bg-green-100 text-green-800',
      'DEGRADED': 'bg-yellow-100 text-yellow-800',
      'CRITICAL': 'bg-red-100 text-red-800',
      'ERROR': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getAlertColor = (type: string) => {
    const colors: { [key: string]: string } = {
      'INFO': 'bg-blue-100 text-blue-800',
      'WARNING': 'bg-yellow-100 text-yellow-800',
      'ERROR': 'bg-red-100 text-red-800',
      'CRITICAL': 'bg-red-100 text-red-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getTrendIcon = (trend: string) => {
    const icons: { [key: string]: string } = {
      'IMPROVING': 'fas fa-arrow-up text-green-600',
      'STABLE': 'fas fa-minus text-blue-600',
      'DECLINING': 'fas fa-arrow-down text-red-600',
      'GROWING': 'fas fa-arrow-up text-green-600'
    };
    return icons[trend] || 'fas fa-minus text-gray-600';
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

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatPercentage = (num: number) => {
    return `${num.toFixed(1)}%`;
  };

  return (
    <div className="super-admin-platform-health">
      <div className="super-admin-card">
        <div className="super-admin-card-header">
          <h3>Platform Health Monitor</h3>
          <div className="super-admin-card-actions">
            <button 
              className={`super-admin-btn ${autoRefresh ? 'primary' : 'secondary'}`}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <i className={`fas fa-${autoRefresh ? 'pause' : 'play'}`}></i>
              {autoRefresh ? 'Auto Refresh On' : 'Auto Refresh Off'}
            </button>
            <button 
              className="super-admin-btn secondary"
              onClick={fetchHealthData}
            >
              <i className="fas fa-sync-alt"></i>
              Refresh Now
            </button>
            <button 
              className={`super-admin-btn ${detailed ? 'primary' : 'secondary'}`}
              onClick={() => setDetailed(!detailed)}
            >
              <i className="fas fa-chart-line"></i>
              {detailed ? 'Basic View' : 'Detailed View'}
            </button>
          </div>
        </div>
        <div className="super-admin-card-body">
          {loading ? (
            <div className="super-admin-loading">
              <div className="super-admin-spinner"></div>
              <p>Checking platform health...</p>
            </div>
          ) : healthData ? (
            <>
              {/* System Status Overview */}
              <div className="super-admin-health-overview">
                <div className="super-admin-health-status">
                  <div className="super-admin-status-indicator">
                    <div className={`super-admin-status-dot ${getStatusColor(healthData.system.status)}`}></div>
                    <span className="super-admin-status-text">
                      System Status: {healthData.system.status}
                    </span>
                  </div>
                  <div className="super-admin-uptime">
                    <span className="super-admin-uptime-label">Uptime:</span>
                    <span className="super-admin-uptime-value">{healthData.system.uptime}%</span>
                  </div>
                </div>
                
                <div className="super-admin-health-metrics">
                  <div className="super-admin-health-metric">
                    <span className="super-admin-metric-label">Response Time:</span>
                    <span className="super-admin-metric-value">{healthData.system.responseTime}ms</span>
                  </div>
                  <div className="super-admin-health-metric">
                    <span className="super-admin-metric-label">Error Rate:</span>
                    <span className="super-admin-metric-value">{healthData.system.errorRate.toFixed(2)}%</span>
                  </div>
                  <div className="super-admin-health-metric">
                    <span className="super-admin-metric-label">Last Checked:</span>
                    <span className="super-admin-metric-value">{formatDateTime(healthData.lastChecked)}</span>
                  </div>
                </div>
              </div>

              {/* Database Health */}
              <div className="super-admin-health-section">
                <h4>Database Health</h4>
                <div className="super-admin-database-health">
                  <div className="super-admin-db-status">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(healthData.database.status)}`}>
                      {healthData.database.status}
                    </span>
                  </div>
                  <div className="super-admin-db-metrics">
                    <div className="super-admin-db-metric">
                      <span className="super-admin-db-label">Response Time:</span>
                      <span className="super-admin-db-value">{healthData.database.responseTime}ms</span>
                    </div>
                    <div className="super-admin-db-metric">
                      <span className="super-admin-db-label">Connections:</span>
                      <span className="super-admin-db-value">{healthData.database.connections}</span>
                    </div>
                    <div className="super-admin-db-metric">
                      <span className="super-admin-db-label">Queries/sec:</span>
                      <span className="super-admin-db-value">{healthData.database.queriesPerSecond}</span>
                    </div>
                    <div className="super-admin-db-metric">
                      <span className="super-admin-db-label">Last Backup:</span>
                      <span className="super-admin-db-value">{formatDateTime(healthData.database.lastBackup)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* System Load */}
              <div className="super-admin-health-section">
                <h4>System Load</h4>
                <div className="super-admin-system-load">
                  <div className="super-admin-load-metric">
                    <span className="super-admin-load-label">CPU Usage:</span>
                    <div className="super-admin-load-bar">
                      <div 
                        className="super-admin-load-fill" 
                        style={{ width: `${healthData.load.cpu}%` }}
                      ></div>
                      <span className="super-admin-load-value">{healthData.load.cpu.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="super-admin-load-metric">
                    <span className="super-admin-load-label">Memory Usage:</span>
                    <div className="super-admin-load-bar">
                      <div 
                        className="super-admin-load-fill" 
                        style={{ width: `${healthData.load.memory}%` }}
                      ></div>
                      <span className="super-admin-load-value">{healthData.load.memory.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="super-admin-load-metric">
                    <span className="super-admin-load-label">Disk Usage:</span>
                    <div className="super-admin-load-bar">
                      <div 
                        className="super-admin-load-fill" 
                        style={{ width: `${healthData.load.disk}%` }}
                      ></div>
                      <span className="super-admin-load-value">{healthData.load.disk.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="super-admin-load-metric">
                    <span className="super-admin-load-label">Network Usage:</span>
                    <div className="super-admin-load-bar">
                      <div 
                        className="super-admin-load-fill" 
                        style={{ width: `${healthData.load.network}%` }}
                      ></div>
                      <span className="super-admin-load-value">{healthData.load.network.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Activity Metrics */}
              <div className="super-admin-health-section">
                <h4>Activity Metrics</h4>
                <div className="super-admin-activity-metrics">
                  <div className="super-admin-activity-grid">
                    <div className="super-admin-activity-item">
                      <span className="super-admin-activity-label">Total Users:</span>
                      <span className="super-admin-activity-value">{formatNumber(healthData.activity.totalUsers)}</span>
                    </div>
                    <div className="super-admin-activity-item">
                      <span className="super-admin-activity-label">Active Users:</span>
                      <span className="super-admin-activity-value">{formatNumber(healthData.activity.activeUsers)}</span>
                    </div>
                    <div className="super-admin-activity-item">
                      <span className="super-admin-activity-label">Total Sessions:</span>
                      <span className="super-admin-activity-value">{formatNumber(healthData.activity.totalSessions)}</span>
                    </div>
                    <div className="super-admin-activity-item">
                      <span className="super-admin-activity-label">Active Sessions:</span>
                      <span className="super-admin-activity-value">{formatNumber(healthData.activity.activeSessions)}</span>
                    </div>
                    <div className="super-admin-activity-item">
                      <span className="super-admin-activity-label">User Activity Rate:</span>
                      <span className="super-admin-activity-value">{formatPercentage(healthData.activity.userActivityRate)}</span>
                    </div>
                    <div className="super-admin-activity-item">
                      <span className="super-admin-activity-label">Session Activity Rate:</span>
                      <span className="super-admin-activity-value">{formatPercentage(healthData.activity.sessionActivityRate)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="super-admin-health-section">
                <h4>Recent Activity</h4>
                <div className="super-admin-recent-activity-grid">
                  <div className="super-admin-activity-period">
                    <h5>Last Hour</h5>
                    <div className="super-admin-activity-stats">
                      <span>{healthData.recent.hourly.users} users</span>
                      <span>{healthData.recent.hourly.sessions} sessions</span>
                      <span>{healthData.recent.hourly.payments} payments</span>
                    </div>
                  </div>
                  <div className="super-admin-activity-period">
                    <h5>Last 24 Hours</h5>
                    <div className="super-admin-activity-stats">
                      <span>{healthData.recent.daily.users} users</span>
                      <span>{healthData.recent.daily.sessions} sessions</span>
                      <span>{healthData.recent.daily.payments} payments</span>
                    </div>
                  </div>
                  <div className="super-admin-activity-period">
                    <h5>Last Week</h5>
                    <div className="super-admin-activity-stats">
                      <span>{healthData.recent.weekly.users} users</span>
                      <span>{healthData.recent.weekly.sessions} sessions</span>
                      <span>{healthData.recent.weekly.payments} payments</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Metrics */}
              <div className="super-admin-health-section">
                <h4>Security Status</h4>
                <div className="super-admin-security-metrics">
                  <div className="super-admin-security-grid">
                    <div className="super-admin-security-item">
                      <span className="super-admin-security-label">Failed Logins:</span>
                      <span className="super-admin-security-value">{healthData.security.failedLogins}</span>
                    </div>
                    <div className="super-admin-security-item">
                      <span className="super-admin-security-label">Suspicious Activities:</span>
                      <span className="super-admin-security-value">{healthData.security.suspiciousActivities}</span>
                    </div>
                    <div className="super-admin-security-item">
                      <span className="super-admin-security-label">Blocked IPs:</span>
                      <span className="super-admin-security-value">{healthData.security.blockedIPs}</span>
                    </div>
                    <div className="super-admin-security-item">
                      <span className="super-admin-security-label">Firewall Status:</span>
                      <span className="super-admin-security-value">{healthData.security.firewallStatus}</span>
                    </div>
                  </div>
                  <div className="super-admin-ssl-status">
                    <span className="super-admin-ssl-label">SSL Certificate:</span>
                    <span className={`super-admin-ssl-value ${healthData.security.sslCertificate.status === 'VALID' ? 'text-green-600' : 'text-red-600'}`}>
                      {healthData.security.sslCertificate.status}
                    </span>
                    <span className="super-admin-ssl-expiry">
                      Expires: {formatDateTime(healthData.security.sslCertificate.expiresAt)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Performance Trends */}
              <div className="super-admin-health-section">
                <h4>Performance Trends</h4>
                <div className="super-admin-performance-trends">
                  <div className="super-admin-trend-item">
                    <span className="super-admin-trend-label">Response Time:</span>
                    <span className="super-admin-trend-value">{healthData.trends.responseTime.current}ms</span>
                    <i className={`super-admin-trend-icon ${getTrendIcon(healthData.trends.responseTime.trend)}`}></i>
                  </div>
                  <div className="super-admin-trend-item">
                    <span className="super-admin-trend-label">Error Rate:</span>
                    <span className="super-admin-trend-value">{healthData.trends.errorRate.current.toFixed(2)}%</span>
                    <i className={`super-admin-trend-icon ${getTrendIcon(healthData.trends.errorRate.trend)}`}></i>
                  </div>
                  <div className="super-admin-trend-item">
                    <span className="super-admin-trend-label">Uptime:</span>
                    <span className="super-admin-trend-value">{healthData.trends.uptime.current}%</span>
                    <i className={`super-admin-trend-icon ${getTrendIcon(healthData.trends.uptime.trend)}`}></i>
                  </div>
                  <div className="super-admin-trend-item">
                    <span className="super-admin-trend-label">User Growth:</span>
                    <span className="super-admin-trend-value">{healthData.trends.userGrowth.current} users</span>
                    <i className={`super-admin-trend-icon ${getTrendIcon(healthData.trends.userGrowth.trend)}`}></i>
                  </div>
                </div>
              </div>

              {/* System Alerts */}
              {healthData.alerts && healthData.alerts.length > 0 && (
                <div className="super-admin-health-section">
                  <h4>System Alerts</h4>
                  <div className="super-admin-alerts">
                    {healthData.alerts.map((alert: SystemAlert) => (
                      <div key={alert.id} className={`super-admin-alert ${getAlertColor(alert.type)}`}>
                        <div className="super-admin-alert-header">
                          <span className="super-admin-alert-title">{alert.title}</span>
                          <span className="super-admin-alert-time">{formatDateTime(alert.timestamp)}</span>
                        </div>
                        <div className="super-admin-alert-message">{alert.message}</div>
                        <div className="super-admin-alert-priority">
                          Priority: {alert.priority}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="super-admin-empty-state">
              <div className="super-admin-empty-state-icon">⚠️</div>
              <h3>Health Data Unavailable</h3>
              <p>Unable to fetch platform health data. Please check your connection and try again.</p>
              <button 
                className="super-admin-btn primary"
                onClick={fetchHealthData}
              >
                <i className="fas fa-sync-alt"></i>
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 