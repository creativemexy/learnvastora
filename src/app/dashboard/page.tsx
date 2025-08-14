"use client";

export const dynamic = 'force-dynamic';

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import NotificationIcon from "@/components/NotificationIcon";
import './dashboard-cambly.css';
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import StudentNavbar from "@/components/StudentNavbar";

interface DashboardData {
  stats: {
    totalSessions: number;
    completedSessions: number;
    upcomingSessions: number;
    totalSpent: number;
    averageRating: number;
  };
  recentSessions: Array<{
    id: string;
    tutorName: string;
    scheduledAt: string;
    status: string;
    rating: number | null;
  }>;
  upcomingBookings: Array<{
    id: string;
    tutorName: string;
    scheduledAt: string;
    status: string;
  }>;
  recentReviews: Array<{
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    tutor: {
      name: string;
    };
  }>;
  recentTutors: Array<{
    id: string;
    name: string;
    email: string;
  }>;
}

interface DashboardError {
  message: string;
  code?: string;
}

export default function StudentDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<DashboardError | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pathname = usePathname();
  const [showTour, setShowTour] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const tourSteps = [
    { target: '.premium-stats-grid', content: 'Track your progress and stats here!' },
    { target: '.premium-actions-section', content: 'Quick access to all major features.' },
    { target: '.premium-card-header', content: 'Upcoming lessons will appear here.' },
    { target: '.premium-btn', content: 'Quick actions for your learning journey.' },
  ];

  const { t } = useTranslation();

  // Show tour for new users (simulate with localStorage)
  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('onboardingComplete')) {
      setShowTour(true);
    }
  }, []);

  const handleNextTour = () => {
    if (tourStep < tourSteps.length - 1) setTourStep(tourStep + 1);
    else {
      setShowTour(false);
      localStorage.setItem('onboardingComplete', '1');
    }
  };
  const handlePrevTour = () => { if (tourStep > 0) setTourStep(tourStep - 1); };

  // Fetch dashboard data with error handling
  const fetchDashboardData = useCallback(async (isBackgroundRefresh = false) => {
    try {
      if (!isBackgroundRefresh) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);
      
      console.log('🔄 Fetching dashboard data...');
      
      const response = await fetch("/api/student/dashboard", {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      console.log('✅ Dashboard data received:', data);
      
      setDashboardData(data);
      setLastUpdated(new Date());
      
      // Fetch notifications count
      try {
        const notificationsResponse = await fetch("/api/notifications");
        if (notificationsResponse.ok) {
          const notifications = await notificationsResponse.json();
          const unreadNotifications = notifications.filter((n: any) => !n.read).length;
          setUnreadCount(unreadNotifications);
        }
      } catch (notifError) {
        console.warn('Failed to fetch notifications:', notifError);
      }
      
    } catch (err) {
      console.error("❌ Error fetching dashboard data:", err);
      setError({
        message: "Failed to load dashboard data. Please try again.",
        code: "FETCH_ERROR"
      });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Manual refresh function
  const handleManualRefresh = useCallback(() => {
    console.log('🔄 Manual refresh triggered');
    fetchDashboardData(false);
  }, [fetchDashboardData]);

  // Set up auto-refresh
  useEffect(() => {
    if (session) {
      // Initial fetch
      fetchDashboardData(false);
      
      // Set up auto-refresh every 2 minutes
      refreshIntervalRef.current = setInterval(() => {
        console.log('🔄 Auto-refreshing dashboard data...');
        fetchDashboardData(true);
      }, 2 * 60 * 1000); // 2 minutes

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [session, fetchDashboardData]);

  // Set up real-time updates for session status changes
  useEffect(() => {
    if (!session) return;

    // Listen for visibility change to refresh when user returns to tab
    const handleVisibilityChange = () => {
      if (!document.hidden && session) {
        console.log('🔄 Tab became visible, refreshing data...');
        fetchDashboardData(true);
      }
    };

    // Listen for online/offline status
    const handleOnlineStatus = () => {
      if (navigator.onLine && session) {
        console.log('🔄 Back online, refreshing data...');
        fetchDashboardData(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnlineStatus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnlineStatus);
    };
  }, [session, fetchDashboardData]);

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/auth/signin");
      return;
    }

    // Check if user is a student
    if ((session.user as any)?.role !== "STUDENT") {
      router.push("/");
      return;
    }
  }, [session, status, router]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { class: string; text: string } } = {
      PENDING: { class: "bg-warning", text: "Pending" },
      CONFIRMED: { class: "bg-success", text: "Confirmed" },
      IN_PROGRESS: { class: "bg-primary", text: "In Progress" },
      COMPLETED: { class: "bg-secondary", text: "Completed" },
      CANCELLED: { class: "bg-danger", text: "Cancelled" }
    };
    
    const statusInfo = statusMap[status] || { class: "bg-secondary", text: status };
    return <span className={`badge ${statusInfo.class}`}>{statusInfo.text}</span>;
  };

  // Loading state
  if (status === "loading" || loading) {
    return (
      <div className="premium-bg">
        <StudentNavbar />
        <div className="premium-loading-container">
          <div className="premium-spinner">
            <div className="book">
              <div className="book-spine"></div>
              <div className="pages">
                <div className="page"></div>
                <div className="page"></div>
                <div className="page"></div>
              </div>
            </div>
          </div>
          <p className="premium-loading-text">{t('loading_dashboard')}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="premium-bg">
        <StudentNavbar />
        <div className="container" style={{ position: 'relative', zIndex: 10 }}>
          <div className="premium-card error-card">
            <div className="error-icon">⚠️</div>
            <h3 className="error-title">Oops! Something went wrong</h3>
            <p className="error-message">{error.message}</p>
            <button onClick={handleManualRefresh} className="premium-btn primary">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="premium-bg">
      <StudentNavbar />
      
      {/* Premium Header Section */}
      <div className="premium-header-box">
        <h1 className="premium-title">{t('dashboard_title')}</h1>
        <p className="premium-subtitle">{t('dashboard_subtitle')}</p>
      </div>

      <div className="container" style={{ position: 'relative', zIndex: 10 }}>
        {/* Premium Stats Grid */}
        <div className="premium-stats-grid">
          <div className="premium-stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-number">{dashboardData?.stats.totalSessions || 0}</div>
            <div className="stat-label">{t('total_sessions')}</div>
          </div>
          <div className="premium-stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-number">{dashboardData?.stats.completedSessions || 0}</div>
            <div className="stat-label">{t('completed')}</div>
          </div>
          <div className="premium-stat-card">
            <div className="stat-icon">📅</div>
            <div className="stat-number">{dashboardData?.stats.upcomingSessions || 0}</div>
            <div className="stat-label">{t('upcoming')}</div>
          </div>
          <div className="premium-stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-number">${(dashboardData?.stats.totalSpent || 0).toFixed(2)}</div>
            <div className="stat-label">{t('total_spent')}</div>
          </div>
          <div className="premium-stat-card">
            <div className="stat-icon">⭐</div>
            <div className="stat-number">{dashboardData?.stats.averageRating?.toFixed(1) || '0.0'}</div>
            <div className="stat-label">{t('avg_rating')}</div>
          </div>
        </div>

        <div className="row g-4 mb-4">
          {/* Premium Quick Actions */}
          <div className="col-12">
            <div className="premium-actions-section">
              <h3 className="premium-actions-title">{t('quick_actions')}</h3>
              <div className="premium-actions-grid">
                <Link href="/tutors" className="premium-action-btn">
                  <i className="fas fa-search"></i>
                  {t('find_tutors')}
                </Link>
                <Link href="/instant" className="premium-action-btn">
                  <i className="fas fa-bolt"></i>
                  {t('instant_booking')}
                </Link>
                <Link href="/bookings" className="premium-action-btn">
                  <i className="fas fa-calendar"></i>
                  {t('my_bookings')}
                </Link>
                <Link href="/bookings/history" className="premium-action-btn">
                  <i className="fas fa-history"></i>
                  {t('session_history')}
                </Link>
                <Link href="/notifications" className="premium-action-btn">
                  <i className="fas fa-bell"></i>
                  {t('notifications.title')}
                  {unreadCount > 0 && (
                    <span className="notification-badge-small">{unreadCount}</span>
                  )}
                </Link>
                <Link href="/analytics" className="premium-action-btn">
                  <i className="fas fa-chart-line"></i>
                  Analytics
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="row">
          {/* Upcoming Lessons Main Area */}
          <div className="col-md-8 mb-4">
            <div className="premium-card">
              <div className="premium-card-header">
                <h4 className="premium-card-title">
                  <i className="fas fa-calendar-alt"></i>
                  {t('upcoming_lessons')}
                </h4>
                <Link href="/bookings" className="premium-btn outline small">
                  View All
                </Link>
              </div>
              <div className="premium-card-body">
                {!dashboardData?.upcomingBookings || dashboardData.upcomingBookings.length === 0 ? (
                  <div className="premium-empty-state">
                    <div className="premium-empty-icon">📅</div>
                    <h5 className="premium-empty-title">{t('no_upcoming_lessons')}</h5>
                    <p className="premium-empty-description">{t('scheduled_lessons_appear_here')}</p>
                    <Link href="/tutors" className="premium-btn primary">
                      Find a Tutor
                    </Link>
                  </div>
                ) : (
                  <div>
                    {dashboardData.upcomingBookings.map((booking) => (
                      <div key={booking.id} className="premium-list-item">
                        <div className="premium-list-item-avatar">
                          <span>{booking.tutorName[0]}</span>
                          </div>
                        <div className="premium-list-item-content">
                          <div className="premium-list-item-title">{booking.tutorName}</div>
                          <div className="premium-list-item-subtitle">{formatDate(booking.scheduledAt)}</div>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <span className={`premium-status-badge ${booking.status.toLowerCase()}`}>
                          {getStatusBadge(booking.status)}
                          </span>
                          {/* Show join button if session is within 10 minutes */}
                          {(() => {
                            const sessionTime = new Date(booking.scheduledAt).getTime();
                            const now = Date.now();
                            if (booking.status === 'CONFIRMED' && sessionTime - now < 10 * 60 * 1000 && sessionTime - now > -60 * 60 * 1000) {
                              return (
                                <Link href={`/sessions/${booking.id}`} className="premium-btn success">
                                  <i className="fas fa-video"></i>
                                  {t('join')}
                                </Link>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Recent Tutors & Reviews Sidebar */}
          <div className="col-md-4 mb-4">
            {/* Recent Tutors */}
            <div className="premium-card mb-4">
              <div className="premium-card-header">
                <h4 className="premium-card-title">
                  <i className="fas fa-users"></i>
                  {t('recent_tutors')}
                </h4>
              </div>
              <div className="premium-card-body">
                {dashboardData?.recentTutors && dashboardData.recentTutors.length > 0 ? (
                  <div>
                    {dashboardData.recentTutors.map((tutor: any) => (
                      <div key={tutor.email} className="premium-list-item">
                        <div className="premium-list-item-avatar">
                          <span>{tutor.name[0]}</span>
                        </div>
                        <div className="premium-list-item-content">
                          <div className="premium-list-item-title">{tutor.name}</div>
                        </div>
                        {tutor.id ? (
                          <Link href={`/tutors/${tutor.id}`} className="premium-btn outline">
                            {t('book_again')}
                          </Link>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="premium-empty-state">
                    <div className="premium-empty-icon">👥</div>
                    <h5 className="premium-empty-title">{t('no_recent_tutors')}</h5>
                    <p className="premium-empty-description">{t('tutors_appear_here')}</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Recent Reviews */}
            <div className="premium-card mb-4">
              <div className="premium-card-header">
                <h4 className="premium-card-title">
                  <i className="fas fa-star"></i>
                  {t('recent_reviews')}
                </h4>
              </div>
              <div className="premium-card-body">
                {!dashboardData?.recentReviews || dashboardData.recentReviews.length === 0 ? (
                  <div className="premium-empty-state">
                    <div className="premium-empty-icon">💬</div>
                    <h5 className="premium-empty-title">{t('no_reviews_yet')}</h5>
                    <p className="premium-empty-description">{t('feedback_appears_here')}</p>
                  </div>
                ) : (
                  <div>
                    {dashboardData.recentReviews.map((review) => (
                      <div key={review.id} className="premium-list-item">
                        <div className="premium-list-item-avatar">
                          <span>{review.tutor.name[0]}</span>
                        </div>
                        <div className="premium-list-item-content">
                          <div className="premium-list-item-title">{review.tutor.name}</div>
                          <div className="premium-list-item-subtitle">
                            {review.comment || <span className="fst-italic">{t('no_comment')}</span>}
                          </div>
                        </div>
                        <div className="premium-list-item-badge">
                          {review.rating} ★
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Onboarding Tour */}
      {showTour && (
        <div className="tour-overlay">
          <div className="tour-modal">
            <div className="tour-content">
              <h3>Welcome to your dashboard!</h3>
              <p>{tourSteps[tourStep].content}</p>
              <div className="tour-actions">
                <button onClick={handlePrevTour} disabled={tourStep === 0} className="premium-btn outline">
                  Previous
                </button>
                <button onClick={handleNextTour} className="premium-btn primary">
                  {tourStep === tourSteps.length - 1 ? 'Get Started' : 'Next'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 