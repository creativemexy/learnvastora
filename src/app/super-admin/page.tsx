"use client";

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import UserManagement from './components/UserManagement';
import TutorManagement from './components/TutorManagement';
import CourseManagement from './components/CourseManagement';
import SessionManagement from './components/SessionManagement';
import PaymentManagement from './components/PaymentManagement';
import AnalyticsManagement from './components/AnalyticsManagement';
import PlatformHealth from './components/PlatformHealth';
import ContentManagement from './components/ContentManagement';
import './super-admin-dashboard.css';

interface SuperAdminStats {
  totalUsers: number;
  totalTutors: number;
  totalStudents: number;
  totalSessions: number;
  totalRevenue: number;
  activeUsers: number;
  pendingApprovals: number;
  systemHealth: string;
  totalAdmins: number;
  platformUptime: number;
  securityAlerts: number;
  dataUsage: number;
}

interface SystemAlert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface GlobalSettings {
  platform: {
    name: string;
    description: string;
    version: string;
    maintenanceMode: boolean;
    maintenanceMessage: string;
    maxFileSize: number;
    allowedFileTypes: string[];
    sessionTimeout: number;
    maxSessionsPerUser: number;
  };
  features: {
    instantBooking: boolean;
    videoRecording: boolean;
    groupSessions: boolean;
    mobileApp: boolean;
    notifications: boolean;
    badges: boolean;
    reviews: boolean;
    payments: boolean;
  };
  security: {
    twoFactorAuth: boolean;
    passwordMinLength: number;
    sessionTimeout: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
    sslRequired: boolean;
    apiRateLimit: number;
  };
  payments: {
    currency: string;
    taxRate: number;
    platformFee: number;
    minimumWithdrawal: number;
    maximumWithdrawal: number;
    autoPayout: boolean;
    payoutSchedule: string;
    supportedGateways: string[];
  };
  notifications: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    pushEnabled: boolean;
    defaultEmailTemplate: string;
    smsProvider: string;
    notificationSchedule: string;
  };
  analytics: {
    trackingEnabled: boolean;
    googleAnalyticsId: string;
    facebookPixelId: string;
    dataRetentionDays: number;
    anonymizeData: boolean;
  };
  support: {
    supportEmail: string;
    supportPhone: string;
    liveChatEnabled: boolean;
    helpCenterUrl: string;
    ticketSystem: string;
    autoResponseEnabled: boolean;
  };
}

export default function SuperAdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isOnline, setIsOnline] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('connected');
  const [notifications, setNotifications] = useState<Array<{type: 'success' | 'error' | 'info', message: string, id: string}>>([]);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setConnectionStatus('connected');
      showNotification('success', 'Connection restored');
    };

    const handleOffline = () => {
      setIsOnline(false);
      setConnectionStatus('disconnected');
      showNotification('error', 'Connection lost. Please check your internet connection.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Dynamic notification system
  const showNotification = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    const id = Date.now().toString();
    const notification = { type, message, id };
    
    setNotifications(prev => [...prev, notification]);
    
    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  // Real-time data fetching
  const fetchSuperAdminData = useCallback(async () => {
    try {
      setConnectionStatus('connected');
      
      const [statsResponse, alertsResponse, settingsResponse] = await Promise.all([
        fetch('/api/super-admin/stats'),
        fetch('/api/super-admin/alerts'),
        fetch('/api/super-admin/settings')
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.data);
      }

      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json();
        setAlerts(alertsData.data);
      }

      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();
        setSettings(settingsData.data);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching super admin data:', error);
      setConnectionStatus('reconnecting');
      showNotification('error', 'Failed to fetch data. Retrying...');
    }
  }, [showNotification]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      if (isOnline) {
        fetchSuperAdminData();
        setLastUpdate(new Date());
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, isOnline, fetchSuperAdminData]);

  // Initial data load
  useEffect(() => {
    if (session && (session.user as any).role === 'SUPER_ADMIN') {
      fetchSuperAdminData();
    }
  }, [session, fetchSuperAdminData]);

  // Dynamic refresh controls
  const toggleAutoRefresh = useCallback(() => {
    setAutoRefresh(!autoRefresh);
    showNotification('info', `Auto-refresh ${!autoRefresh ? 'enabled' : 'disabled'}`);
  }, [autoRefresh, showNotification]);

  const changeRefreshInterval = useCallback((interval: number) => {
    setRefreshInterval(interval);
    showNotification('info', `Refresh interval set to ${interval / 1000} seconds`);
  }, [showNotification]);

  const manualRefresh = useCallback(() => {
    fetchSuperAdminData();
    setLastUpdate(new Date());
    showNotification('success', 'Data refreshed manually');
  }, [fetchSuperAdminData, showNotification]);

  // Dynamic tab switching with data preloading
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    
    // Preload data for the selected tab
    if (tab === 'analytics' || tab === 'health' || tab === 'content') {
      // These tabs have their own data fetching, but we can trigger a refresh
      setTimeout(() => {
        showNotification('info', `Switched to ${tab} management`);
      }, 100);
    }
  }, [showNotification]);

  // Dynamic settings management
  const updateGlobalSettings = useCallback(async (category: string, settings: any) => {
    try {
      const response = await fetch('/api/super-admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, settings })
      });

      if (response.ok) {
        showNotification('success', `${category} settings updated successfully`);
        fetchSuperAdminData();
      } else {
        showNotification('error', 'Failed to update settings');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      showNotification('error', 'Failed to update settings');
    }
  }, [fetchSuperAdminData, showNotification]);

  // Reset settings
  const resetSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/super-admin/settings/reset', {
        method: 'POST'
      });

      if (response.ok) {
        showNotification('success', 'Settings reset to defaults');
        fetchSuperAdminData();
      } else {
        showNotification('error', 'Failed to reset settings');
      }
    } catch (error) {
      console.error('Error resetting settings:', error);
      showNotification('error', 'Failed to reset settings');
    }
  }, [fetchSuperAdminData, showNotification]);

  // Export settings
  const exportSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/super-admin/settings/export');
      const data = await response.json();
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'learnvastora-settings.json';
      a.click();
      URL.revokeObjectURL(url);
      
      showNotification('success', 'Settings exported successfully');
    } catch (error) {
      console.error('Error exporting settings:', error);
      showNotification('error', 'Failed to export settings');
    }
  }, [showNotification]);

  // Import settings
  const importSettings = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const settings = JSON.parse(text);
      
      const response = await fetch('/api/super-admin/settings/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        showNotification('success', 'Settings imported successfully');
        fetchSuperAdminData();
      } else {
        showNotification('error', 'Failed to import settings');
      }
    } catch (error) {
      console.error('Error importing settings:', error);
      showNotification('error', 'Failed to import settings');
    }
  }, [fetchSuperAdminData, showNotification]);

  // Connection status helpers
  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-400';
      case 'disconnected': return 'text-red-400';
      case 'reconnecting': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected': return '🟢';
      case 'disconnected': return '🔴';
      case 'reconnecting': return '🟡';
      default: return '⚪';
    }
  };

  // Check authentication
  if (status === 'loading') {
    return (
      <div className="super-admin-container">
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  if (!session || (session.user as any).role !== 'SUPER_ADMIN') {
    router.push('/auth/signin');
    return null;
  }

  return (
    <div className="super-admin-container">
      {/* Header */}
      <header className="super-admin-header">
        <div className="header-content">
          <div className="header-left">
            <div className="logo-section">
              <div className="logo-icon">⚡</div>
              <div className="logo-text">LearnVastora</div>
            </div>
            <div className="premium-text">Super Admin Dashboard</div>
          </div>
          
          <div className="header-right">
            <div className={`connection-status ${connectionStatus}`}>
              <span>{getConnectionStatusIcon()}</span>
              <span className="code-text">{connectionStatus}</span>
            </div>
            
            <div className="premium-text">
              Last Update: {lastUpdate.toLocaleTimeString()}
            </div>
            
            <button 
              className="btn btn-primary update-btn"
              onClick={manualRefresh}
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '10px',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                marginLeft: '1rem'
              }}
              onMouseEnter={(e) => {
                const target = e.target as HTMLButtonElement;
                target.style.transform = 'translateY(-2px)';
                target.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
              }}
              onMouseLeave={(e) => {
                const target = e.target as HTMLButtonElement;
                target.style.transform = 'translateY(0)';
                target.style.boxShadow = '0 4px 15px rgba(16, 185, 129, 0.3)';
              }}
            >
              <span>🔄</span>
              Update
            </button>
          </div>
        </div>
      
          <button 
            className="btn btn-danger logout-btn"
            onClick={() => signOut({ callbackUrl: '/' })}
            style={{
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '10px',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)'
            }}
            onMouseEnter={(e) => {
              const target = e.target as HTMLButtonElement;
              target.style.transform = 'translateY(-2px)';
              target.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.4)';
            }}
            onMouseLeave={(e) => {
              const target = e.target as HTMLButtonElement;
              target.style.transform = 'translateY(0)';
              target.style.boxShadow = '0 4px 15px rgba(239, 68, 68, 0.3)';
            }}
          >
            <span>🚪</span>
            Logout
          </button></header>

      {/* Main Content */}
      <main className="super-admin-main">
        {/* Stats Grid */}
        {stats && (
          <div className="stats-grid">
            <div className="stat-card premium-hover">
              <div className="stat-header">
                <div className="stat-icon users">👥</div>
              </div>
              <div className="stat-content">
                <div className="stat-value">{stats.totalUsers.toLocaleString()}</div>
                <div className="stat-label">Total Users</div>
                <div className="stat-change positive">+12% this month</div>
              </div>
            </div>

            <div className="stat-card premium-hover">
              <div className="stat-header">
                <div className="stat-icon tutors">👨‍🏫</div>
              </div>
              <div className="stat-content">
                <div className="stat-value">{stats.totalTutors.toLocaleString()}</div>
                <div className="stat-label">Active Tutors</div>
                <div className="stat-change positive">+8% this month</div>
              </div>
            </div>

            <div className="stat-card premium-hover">
              <div className="stat-header">
                <div className="stat-icon sessions">📅</div>
              </div>
              <div className="stat-content">
                <div className="stat-value">{stats.totalSessions.toLocaleString()}</div>
                <div className="stat-label">Total Sessions</div>
                <div className="stat-change positive">+15% this month</div>
              </div>
            </div>

            <div className="stat-card premium-hover">
              <div className="stat-header">
                <div className="stat-icon revenue">💰</div>
              </div>
              <div className="stat-content">
                <div className="stat-value">${stats.totalRevenue.toLocaleString()}</div>
                <div className="stat-label">Total Revenue</div>
                <div className="stat-change positive">+23% this month</div>
              </div>
            </div>

            <div className="stat-card premium-hover">
              <div className="stat-header">
                <div className="stat-icon alerts">🚨</div>
              </div>
              <div className="stat-content">
                <div className="stat-value">{stats.securityAlerts}</div>
                <div className="stat-label">Security Alerts</div>
                <div className="stat-change warning">Requires attention</div>
              </div>
            </div>

            <div className="stat-card premium-hover">
              <div className="stat-header">
                <div className="stat-icon health">🏥</div>
              </div>
              <div className="stat-content">
                <div className="stat-value">{stats.systemHealth}</div>
                <div className="stat-label">System Health</div>
                <div className="stat-change positive">All systems operational</div>
              </div>
            </div>
          </div>
        )}

        {/* Control Panel */}
        <div className="control-panel">
          <div className="control-left">
            <button 
              className="btn btn-primary"
              onClick={manualRefresh}
              disabled={loading}
            >
              🔄 Refresh Data
            </button>
            
            <div className="auto-refresh-controls">
              <div 
                className={`refresh-toggle ${autoRefresh ? 'active' : ''}`}
                onClick={toggleAutoRefresh}
              ></div>
              <span className="premium-text">Auto-refresh</span>
            </div>
            
            <select 
              className="refresh-interval"
              value={refreshInterval}
              onChange={(e) => changeRefreshInterval(Number(e.target.value))}
            >
              <option value={5000}>5s</option>
              <option value={10000}>10s</option>
              <option value={30000}>30s</option>
              <option value={60000}>1m</option>
            </select>
          </div>
          
          <div className="control-right">
            <button className="btn btn-secondary" onClick={exportSettings}>
              📤 Export Settings
            </button>
            <button className="btn btn-warning" onClick={resetSettings}>
              🔄 Reset Settings
            </button>
            <input
              type="file"
              accept=".json"
              onChange={(e) => e.target.files?.[0] && importSettings(e.target.files[0])}
              style={{ display: 'none' }}
              id="import-settings"
            />
            <label htmlFor="import-settings" className="btn btn-secondary">
              📥 Import Settings
            </label>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="nav-tabs">
          <button 
            className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleTabChange('dashboard')}
          >
            <span className="nav-tab-icon">📊</span>
            Dashboard
          </button>
          
          <button 
            className={`nav-tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => handleTabChange('users')}
          >
            <span className="nav-tab-icon">👥</span>
            Users
          </button>
          
          <button 
            className={`nav-tab ${activeTab === 'tutors' ? 'active' : ''}`}
            onClick={() => handleTabChange('tutors')}
          >
            <span className="nav-tab-icon">👨‍🏫</span>
            Tutors
          </button>
          
          <button 
            className={`nav-tab ${activeTab === 'courses' ? 'active' : ''}`}
            onClick={() => handleTabChange('courses')}
          >
            <span className="nav-tab-icon">📚</span>
            Courses
          </button>
          
          <button 
            className={`nav-tab ${activeTab === 'sessions' ? 'active' : ''}`}
            onClick={() => handleTabChange('sessions')}
          >
            <span className="nav-tab-icon">📅</span>
            Sessions
          </button>
          
          <button 
            className={`nav-tab ${activeTab === 'payments' ? 'active' : ''}`}
            onClick={() => handleTabChange('payments')}
          >
            <span className="nav-tab-icon">💰</span>
            Payments
          </button>
          
          <button 
            className={`nav-tab ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => handleTabChange('analytics')}
          >
            <span className="nav-tab-icon">📈</span>
            Analytics
          </button>
          
          <button 
            className={`nav-tab ${activeTab === 'health' ? 'active' : ''}`}
            onClick={() => handleTabChange('health')}
          >
            <span className="nav-tab-icon">🏥</span>
            Health
          </button>
          
          <button 
            className={`nav-tab ${activeTab === 'content' ? 'active' : ''}`}
            onClick={() => handleTabChange('content')}
          >
            <span className="nav-tab-icon">📝</span>
            Content
          </button>
        </nav>

        {/* Tab Content */}
        <div className="tab-content">
          {loading && (
            <div className="loading-overlay">
              <div className="loading-spinner"></div>
            </div>
          )}
          
          {activeTab === 'dashboard' && (
            <div className="super-admin-dashboard">
              <h1 className="premium-heading">Platform Overview</h1>
              <div className="glass-effect" style={{ padding: 'var(--spacing-lg)', borderRadius: 'var(--radius-lg)' }}>
                <p className="premium-text">
                  Welcome to the LearnVastora Super Admin Dashboard. Monitor and manage all aspects of the platform in real-time.
                </p>
              </div>
            </div>
          )}
          
          {activeTab === 'users' && (
            <div className="super-admin-users">
              <UserManagement showNotification={showNotification} />
            </div>
          )}
          
          {activeTab === 'tutors' && (
            <div className="super-admin-tutors">
              <TutorManagement />
            </div>
          )}
          
          {activeTab === 'courses' && (
            <div className="super-admin-courses">
              <CourseManagement showNotification={showNotification} />
            </div>
          )}
          
          {activeTab === 'sessions' && (
            <div className="super-admin-sessions">
              <SessionManagement showNotification={showNotification} />
            </div>
          )}
          
          {activeTab === 'payments' && (
            <div className="super-admin-payments">
              <PaymentManagement showNotification={showNotification} />
            </div>
          )}
          
          {activeTab === 'analytics' && (
            <div className="super-admin-analytics">
              <AnalyticsManagement showNotification={showNotification} />
            </div>
          )}
          
          {activeTab === 'health' && (
            <div className="super-admin-health">
              <PlatformHealth showNotification={showNotification} />
            </div>
          )}
          
          {activeTab === 'content' && (
            <div className="super-admin-content">
              <ContentManagement showNotification={showNotification} />
            </div>
          )}
        </div>
      </main>

      {/* Notifications */}
      <div className="notifications-container">
        {notifications.map((notification) => (
          <div key={notification.id} className={`notification ${notification.type}`}>
            <div className="notification-content">
              <div className="notification-icon">
                {notification.type === 'success' && '✅'}
                {notification.type === 'error' && '❌'}
                {notification.type === 'info' && 'ℹ️'}
              </div>
              <div className="notification-message">{notification.message}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 