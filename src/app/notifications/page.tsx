"use client";

export const dynamic = 'force-dynamic';

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import StudentNavbar from "@/components/StudentNavbar";
import './notifications-premium.css';

interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  type: string;
  data?: any;
}

export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'important'>('all');
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [showActions, setShowActions] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/auth/signin");
      return;
    }

    fetchNotifications();
  }, [session, status, router]);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch("/api/notifications");
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      
      const data = await response.json();
      setNotifications(data);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setError(t('notifications.error_loading'));
      toast.error(t('notifications.error_loading'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PUT"
      });
      
      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        );
        toast.success(t('notifications.marked_as_read'));
      } else {
        throw new Error('Failed to mark as read');
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast.error(t('notifications.error_marking_read'));
    }
  }, [t]);

  const markAllAsRead = useCallback(async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.isRead);
      const promises = unreadNotifications.map(n => 
        fetch(`/api/notifications/${n.id}/read`, { method: "PUT" })
      );
      
      await Promise.all(promises);
      
      setNotifications(prev => 
        prev.map(n => ({ ...n, isRead: true }))
      );
      
      toast.success(t('notifications.all_marked_read'));
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error(t('notifications.error_marking_all_read'));
    }
  }, [notifications, t]);

  const formatTime = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return t('notifications.just_now');
    if (diffMinutes < 60) return `${diffMinutes}${t('notifications.minutes_ago')}`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}${t('notifications.hours_ago')}`;
    return `${Math.floor(diffHours / 24)}${t('notifications.days_ago')}`;
  }, [t]);

  const getNotificationIcon = useCallback((type: string) => {
    switch (type) {
      case "SESSION_REMINDER":
        return { icon: "📅", color: "premium-primary", bg: "premium-primary-bg" };
      case "SESSION_CANCELLED":
        return { icon: "❌", color: "premium-danger", bg: "premium-danger-bg" };
      case "SESSION_RESCHEDULED":
        return { icon: "✅", color: "premium-success", bg: "premium-success-bg" };
      case "PAYMENT_RECEIVED":
        return { icon: "💰", color: "premium-success", bg: "premium-success-bg" };
      case "REVIEW_RECEIVED":
        return { icon: "⭐", color: "premium-warning", bg: "premium-warning-bg" };
      case "INSTANT_BOOKING_REQUEST":
        return { icon: "⚡", color: "premium-warning", bg: "premium-warning-bg" };
      case "INSTANT_BOOKING_ACCEPTED":
        return { icon: "🎉", color: "premium-success", bg: "premium-success-bg" };
      case "NEW_MESSAGE":
        return { icon: "💬", color: "premium-info", bg: "premium-info-bg" };
      default:
        return { icon: "🔔", color: "premium-primary", bg: "premium-primary-bg" };
    }
  }, []);

  const getNotificationPriority = useCallback((type: string) => {
    const highPriority = ['SESSION_CANCELLED', 'INSTANT_BOOKING_REQUEST', 'PAYMENT_RECEIVED'];
    return highPriority.includes(type) ? 'high' : 'normal';
  }, []);

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'unread') return !n.isRead;
    if (activeTab === 'important') return getNotificationPriority(n.type) === 'high';
    return true;
  });

  const stats = {
    total: notifications.length,
    unread: notifications.filter(n => !n.isRead).length,
    important: notifications.filter(n => getNotificationPriority(n.type) === 'high').length,
    today: notifications.filter(n => {
      const today = new Date();
      const notificationDate = new Date(n.createdAt);
      return notificationDate.toDateString() === today.toDateString();
    }).length
  };

  if (status === "loading" || loading) {
    return (
      <div className="premium-loading-container">
        <div className="premium-loading-content">
          <div className="premium-spinner">
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
          </div>
          <h3>{t('notifications.loading')}</h3>
          <p>{t('notifications.loading_subtitle')}</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="premium-notifications-container">
      <StudentNavbar />

      <div className="premium-notifications-layout">
        {/* Premium Header */}
        <div className="premium-header-section">
          <div className="premium-header-content">
            <div className="premium-header-main">
              <h1 className="premium-title">
                <span className="premium-icon">🔔</span>
                  {t('notifications.title')}
                </h1>
              <p className="premium-subtitle">{t('notifications.subtitle')}</p>
              </div>
            <div className="premium-header-actions">
              {stats.unread > 0 && (
                <button 
                  className="premium-action-btn premium-mark-all-btn"
                  onClick={markAllAsRead}
                >
                  <span className="action-icon">✓</span>
                  <span className="action-text">{t('notifications.mark_all_read')}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Premium Stats */}
        <div className="premium-stats-section">
          <div className="premium-stats-grid">
            <div className="premium-stat-card">
              <div className="premium-stat-icon premium-primary-bg">
                <span className="stat-icon">📊</span>
              </div>
              <div className="premium-stat-content">
                <h3 className="premium-stat-number">{stats.total}</h3>
                <p className="premium-stat-label">{t('notifications.total')}</p>
              </div>
            </div>
            
            <div className="premium-stat-card">
              <div className="premium-stat-icon premium-warning-bg">
                <span className="stat-icon">📬</span>
          </div>
              <div className="premium-stat-content">
                <h3 className="premium-stat-number">{stats.unread}</h3>
                <p className="premium-stat-label">{t('notifications.unread')}</p>
              </div>
            </div>
            
            <div className="premium-stat-card">
              <div className="premium-stat-icon premium-danger-bg">
                <span className="stat-icon">⚠️</span>
          </div>
              <div className="premium-stat-content">
                <h3 className="premium-stat-number">{stats.important}</h3>
                <p className="premium-stat-label">{t('notifications.important')}</p>
              </div>
            </div>
            
            <div className="premium-stat-card">
              <div className="premium-stat-icon premium-success-bg">
                <span className="stat-icon">📅</span>
          </div>
              <div className="premium-stat-content">
                <h3 className="premium-stat-number">{stats.today}</h3>
                <p className="premium-stat-label">{t('notifications.today')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Premium Tabs */}
        <div className="premium-tabs-section">
          <div className="premium-tabs-container">
                <button
              className={`premium-tab ${activeTab === 'all' ? 'premium-active' : ''}`}
                  onClick={() => setActiveTab('all')}
                >
              <span className="tab-icon">📋</span>
              <span className="tab-text">{t('notifications.all')}</span>
              <span className="tab-badge">{notifications.length}</span>
                </button>
            
                <button
              className={`premium-tab ${activeTab === 'unread' ? 'premium-active' : ''}`}
                  onClick={() => setActiveTab('unread')}
            >
              <span className="tab-icon">📬</span>
              <span className="tab-text">{t('notifications.unread')}</span>
              <span className="tab-badge">{stats.unread}</span>
            </button>
            
            <button
              className={`premium-tab ${activeTab === 'important' ? 'premium-active' : ''}`}
              onClick={() => setActiveTab('important')}
            >
              <span className="tab-icon">⚠️</span>
              <span className="tab-text">{t('notifications.important')}</span>
              <span className="tab-badge">{stats.important}</span>
                </button>
          </div>
        </div>

        {/* Premium Notifications List */}
        <div className="premium-notifications-section">
          {error && (
            <div className="premium-error-message">
              <span className="error-icon">⚠️</span>
              <p>{error}</p>
              <button 
                onClick={fetchNotifications}
                className="premium-retry-btn"
              >
                {t('notifications.retry')}
              </button>
            </div>
          )}
          
            {filteredNotifications.length === 0 ? (
            <div className="premium-empty-state">
              <div className="premium-empty-icon">🔔</div>
              <h3>{t('notifications.no_notifications_found')}</h3>
              <p>
                  {activeTab === 'unread' 
                    ? t('notifications.no_unread_notifications')
                  : activeTab === 'important'
                  ? t('notifications.no_important_notifications')
                    : t('notifications.no_notifications_yet')
                  }
                </p>
              </div>
            ) : (
            <div className="premium-notifications-list">
              {filteredNotifications.map((notification) => {
                const iconData = getNotificationIcon(notification.type);
                const priority = getNotificationPriority(notification.type);
                
                return (
                  <div 
                    key={notification.id} 
                    className={`premium-notification-item ${!notification.isRead ? 'premium-unread' : ''} ${priority === 'high' ? 'premium-important' : ''}`}
                    onClick={() => setSelectedNotification(notification)}
                  >
                    <div className="premium-notification-icon">
                      <div className={`premium-icon-container ${iconData.bg}`}>
                        <span className="notification-icon">{iconData.icon}</span>
                      </div>
                      {!notification.isRead && (
                        <div className="premium-unread-indicator"></div>
                      )}
                    </div>
                    
                    <div className="premium-notification-content">
                      <div className="premium-notification-header">
                        <h4 className="premium-notification-title">{notification.title}</h4>
                        <span className="premium-notification-time">{formatTime(notification.createdAt)}</span>
                        </div>
                      
                      <p className="premium-notification-message">{notification.message}</p>
                      
                      <div className="premium-notification-actions">
                          {!notification.isRead && (
                            <button
                            className="premium-action-btn premium-mark-read-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                          >
                            <span className="action-icon">✓</span>
                            <span className="action-text">{t('notifications.mark_read')}</span>
                            </button>
                          )}
                        
                          {notification.data?.bookingId && (
                            <Link 
                              href={`/sessions/${notification.data.bookingId}`}
                            className="premium-action-btn premium-view-btn"
                            onClick={(e) => e.stopPropagation()}
                            >
                            <span className="action-icon">📹</span>
                            <span className="action-text">{t('notifications.view_session')}</span>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Premium Notification Detail Modal */}
      {selectedNotification && (
        <div className="premium-modal-overlay" onClick={() => setSelectedNotification(null)}>
          <div className="premium-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="premium-modal-header">
              <h3 className="premium-modal-title">{t('notifications.notification_details')}</h3>
              <button 
                className="premium-modal-close"
                onClick={() => setSelectedNotification(null)}
              >
                ✕
              </button>
            </div>
            
            <div className="premium-modal-body">
              <div className="premium-notification-detail">
                <div className="premium-detail-icon">
                  {(() => {
                    const iconData = getNotificationIcon(selectedNotification.type);
                    return (
                      <div className={`premium-icon-container ${iconData.bg}`}>
                        <span className="notification-icon">{iconData.icon}</span>
                      </div>
                    );
                  })()}
                </div>
                
                <div className="premium-detail-content">
                  <h4 className="premium-detail-title">{selectedNotification.title}</h4>
                  <p className="premium-detail-message">{selectedNotification.message}</p>
                  <div className="premium-detail-meta">
                    <span className="premium-detail-time">{formatTime(selectedNotification.createdAt)}</span>
                    <span className={`premium-detail-status ${selectedNotification.isRead ? 'read' : 'unread'}`}>
                      {selectedNotification.isRead ? 'Read' : 'Unread'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="premium-modal-footer">
              {!selectedNotification.isRead && (
                <button
                  className="premium-action-btn premium-mark-read-btn"
                  onClick={() => {
                    markAsRead(selectedNotification.id);
                    setSelectedNotification(null);
                  }}
                >
                  <span className="action-icon">✓</span>
                  <span className="action-text">{t('notifications.mark_read')}</span>
                </button>
              )}
              
              {selectedNotification.data?.bookingId && (
                <Link 
                  href={`/sessions/${selectedNotification.data.bookingId}`}
                  className="premium-action-btn premium-view-btn"
                >
                  <span className="action-icon">📹</span>
                  <span className="action-text">{t('notifications.view_session')}</span>
                </Link>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
} 