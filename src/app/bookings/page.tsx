"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StudentNavbar from "@/components/StudentNavbar";
import { format } from "date-fns";
import { Modal, Button } from 'react-bootstrap';
import './bookings-premium.css';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

interface Booking {
  id: string;
  scheduledAt: string;
  status: string;
  createdAt: string;
  tutor: {
    name: string;
    email: string;
    photo?: string;
    tutorProfile?: {
      bio?: string;
      skills?: string[];
      avatar?: string;
    };
    id?: string;
  };
  paymentMethod?: string;
  paymentReference?: string;
  paidAt?: string;
}

export default function StudentBookings() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [animateCards, setAnimateCards] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [currentTime, setCurrentTime] = useState(new Date());
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { t } = useTranslation();

  // Fetch bookings with background refresh support
  const fetchBookings = useCallback(async (isBackgroundRefresh = false) => {
    try {
      if (!isBackgroundRefresh) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }
      
      console.log('🔄 Fetching bookings data...');
      
      const response = await fetch("/api/bookings", {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setBookings(data);
        setLastUpdated(new Date());
        
        if (!isBackgroundRefresh) {
          toast.success(t('bookings.bookings_loaded_successfully'));
        }
      } else {
        const errorMessage = `Failed to fetch bookings: ${response.status} ${response.statusText}`;
        console.error(errorMessage);
        if (!isBackgroundRefresh) {
          toast.error(t('bookings.error_loading_bookings'));
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error fetching bookings:', error);
      if (!isBackgroundRefresh) {
        toast.error(t('bookings.error_loading_bookings_message'));
      }
    } finally {
      if (!isBackgroundRefresh) {
        setLoading(false);
      }
      setIsRefreshing(false);
    }
  }, [t]);

  // Manual refresh function
  const handleManualRefresh = useCallback(() => {
    console.log('🔄 Manual refresh triggered');
    fetchBookings(false);
  }, [fetchBookings]);

  // Set up auto-refresh and countdown timer
  useEffect(() => {
    if (session) {
      // Initial fetch
      fetchBookings(false);
      
      // Set up auto-refresh every 2 minutes
      refreshIntervalRef.current = setInterval(() => {
        console.log('🔄 Auto-refreshing bookings data...');
        setIsAutoRefreshing(true);
        fetchBookings(true).then(() => {
          setIsAutoRefreshing(false);
        });
      }, 2 * 60 * 1000); // 2 minutes

      // Set up countdown timer updates every second
      countdownIntervalRef.current = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
      };
    }
  }, [session, fetchBookings]);

  // Set up real-time updates for session status changes
  useEffect(() => {
    if (!session) return;

    // Listen for visibility change to refresh when user returns to tab
    const handleVisibilityChange = () => {
      if (!document.hidden && session) {
        console.log('🔄 Tab became visible, refreshing data...');
        fetchBookings(true);
      }
    };

    // Listen for online/offline status
    const handleOnlineStatus = () => {
      if (navigator.onLine && session) {
        console.log('🔄 Back online, refreshing data...');
        fetchBookings(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnlineStatus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnlineStatus);
    };
  }, [session, fetchBookings]);

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/auth/signin");
      return;
    }

    if ((session.user as any)?.role !== "STUDENT") {
      router.push("/");
      return;
    }
  }, [session, status, router]);

  useEffect(() => {
    setIsVisible(true);
    setAnimateCards(true);
  }, []);

  const upcomingBookings = bookings.filter(b => 
    b.status === "CONFIRMED" && b.paidAt
  );
  
  const completedBookings = bookings.filter(b => b.status === "COMPLETED");
  const cancelledBookings = bookings.filter(b => b.status === "CANCELLED");
  
  const totalHours = completedBookings.length * 0.5; // Assuming 30-minute sessions
  
  // Only count languages from completed bookings where the student actually learned
  const languagesLearned = new Set(
    completedBookings
      .filter(b => b.tutor.tutorProfile?.skills)
      .flatMap(b => b.tutor.tutorProfile?.skills || [])
  ).size;

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { class: string; text: string; icon: string } } = {
      PENDING: { class: 'status-pending', text: t('pending'), icon: 'bi-clock' },
      CONFIRMED: { class: 'status-confirmed', text: t('confirmed'), icon: 'bi-check-circle' },
      COMPLETED: { class: 'status-completed', text: t('completed'), icon: 'bi-check-circle-fill' },
      CANCELLED: { class: 'status-cancelled', text: t('cancelled'), icon: 'bi-x-circle' }
    };
    const statusInfo = statusMap[status] || { class: 'status-pending', text: status, icon: 'bi-question-circle' };
    return (
      <span className={`status-badge ${statusInfo.class}`}>
        <i className={`bi ${statusInfo.icon} me-1`}></i>
        {statusInfo.text}
      </span>
    );
  };

  const formatDateTime = (dateString: string) => {
    const d = new Date(dateString);
    return format(d, "MMM dd, yyyy 'at' h:mm a");
  };

  const getTutorAvatar = (booking: Booking) => {
    const name = booking.tutor.name || t('tutor');
    if (booking.tutor.photo) return booking.tutor.photo;
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
    return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><defs><linearGradient id='grad' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' style='stop-color:%237c3aed;stop-opacity:1' /><stop offset='100%' style='stop-color:%23a855f7;stop-opacity:1' /></linearGradient></defs><rect width='100%' height='100%' rx='40' fill='url(%23grad)'/><text x='50%' y='55%' text-anchor='middle' fill='white' font-size='32' font-family='Inter, sans-serif' font-weight='600'>${initials}</text></svg>`;
  };

  const getCountdown = (date: string) => {
    const target = new Date(date);
    const diff = Math.max(0, Math.floor((target.getTime() - currentTime.getTime()) / 1000));
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    if (diff <= 0) return null;
    return `${h > 0 ? h + 'h ' : ''}${m}m ${s}s`;
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  if (status === "loading" || loading) {
    return (
      <div className="premium-loading-container">
        <div className="loading-spinner">
          <div className="spinner-ring"></div>
          <div className="spinner-text">{t('bookings.loading_bookings')}</div>
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
      
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-xl-11">
            {/* Header Section */}
            <div className={`premium-header-box ${isVisible ? 'visible' : ''}`}>
              <div style={{ textAlign: 'center', marginBottom: '2rem', paddingTop: '2rem' }}>
                <h1 className="premium-title">{t('bookings.title')}</h1>
                <p className="premium-subtitle">{t('bookings.subtitle')}</p>
                {lastUpdated && (
                  <small style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>
                    Last updated: {lastUpdated.toLocaleTimeString()}
                    {isRefreshing && ' (Refreshing...)'}
                  </small>
                )}
              </div>
              
              {isAutoRefreshing && (
                <div style={{ 
                  background: 'rgba(255,255,255,0.1)', 
                  padding: '0.5rem 1rem', 
                  borderRadius: '8px', 
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  justifyContent: 'center'
                }}>
                  <i className="fas fa-sync-alt fa-spin" style={{ color: '#4facfe' }}></i>
                  <span style={{ color: 'rgba(255,255,255,0.9)' }}>Auto-refreshing data...</span>
                </div>
              )}
              
              {/* Quick Stats */}
              <div className="premium-stats-grid">
                <div className={`premium-stat-card ${animateCards ? 'animate-in' : ''}`} style={{ animationDelay: '0.1s' }}>
                  <div className="stat-icon">
                    <i className="bi bi-calendar-check"></i>
                  </div>
                  <div className="stat-content">
                    <h3 className="stat-number">{formatNumber(upcomingBookings.length)}</h3>
                    <p className="stat-label">{t('bookings.upcoming_sessions_count')}</p>
                  </div>
                </div>
                
                <div className={`premium-stat-card ${animateCards ? 'animate-in' : ''}`} style={{ animationDelay: '0.2s' }}>
                  <div className="stat-icon">
                    <i className="bi bi-check-circle"></i>
                  </div>
                  <div className="stat-content">
                    <h3 className="stat-number">{formatNumber(completedBookings.length)}</h3>
                    <p className="stat-label">{t('bookings.completed_sessions_count')}</p>
                  </div>
                </div>
                
                <div className={`premium-stat-card ${animateCards ? 'animate-in' : ''}`} style={{ animationDelay: '0.3s' }}>
                  <div className="stat-icon">
                    <i className="bi bi-clock"></i>
                  </div>
                  <div className="stat-content">
                    <h3 className="stat-number">{formatNumber(totalHours)}</h3>
                    <p className="stat-label">{t('bookings.total_hours')}</p>
                  </div>
                </div>
                
                <div className={`premium-stat-card ${animateCards ? 'animate-in' : ''}`} style={{ animationDelay: '0.4s' }}>
                  <div className="stat-icon">
                    <i className="bi bi-globe"></i>
                  </div>
                  <div className="stat-content">
                    <h3 className="stat-number">{formatNumber(languagesLearned)}</h3>
                    <p className="stat-label">{t('bookings.languages_learned')}</p>
                  </div>
                </div>
                
                <div className={`premium-stat-card ${animateCards ? 'animate-in' : ''}`} style={{ animationDelay: '0.5s' }}>
                  <div className="stat-icon">
                    <i className="bi bi-star"></i>
                  </div>
                  <div className="stat-content">
                    <h3 className="stat-number">{formatNumber(cancelledBookings.length)}</h3>
                    <p className="stat-label">{t('bookings.cancelled_sessions_count')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className={`premium-actions-section ${isVisible ? 'visible' : ''}`}>
              <div className="premium-actions-grid">
                <Link href="/calendar" className="premium-action-btn primary">
                  <i className="bi bi-calendar3"></i>
                  <span>{t('bookings.view_calendar')}</span>
                </Link>
                <Link href="/tutors" className="premium-action-btn secondary">
                  <i className="bi bi-search"></i>
                  <span>{t('bookings.find_tutors')}</span>
                </Link>
                <Link href="/instant" className="premium-action-btn accent">
                  <i className="bi bi-lightning"></i>
                  <span>{t('bookings.instant_booking')}</span>
                </Link>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className={`premium-tabs-section ${isVisible ? 'visible' : ''}`}>
              <div className="premium-tabs">
                <button
                  className={`premium-tab ${activeTab === 'upcoming' ? 'active' : ''}`}
                  onClick={() => setActiveTab('upcoming')}
                >
                  <i className="bi bi-clock"></i>
                  {t('bookings.upcoming')} ({upcomingBookings.length})
                </button>
                <button
                  className={`premium-tab ${activeTab === 'completed' ? 'active' : ''}`}
                  onClick={() => setActiveTab('completed')}
                >
                  <i className="bi bi-check-circle"></i>
                  {t('bookings.completed')} ({completedBookings.length})
                </button>
                <button
                  className={`premium-tab ${activeTab === 'cancelled' ? 'active' : ''}`}
                  onClick={() => setActiveTab('cancelled')}
                >
                  <i className="bi bi-x-circle"></i>
                  {t('bookings.cancelled')} ({cancelledBookings.length})
                </button>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'upcoming' && (
              <div className={`premium-bookings-section ${isVisible ? 'visible' : ''}`}>
                {upcomingBookings.length > 0 ? (
                  <div className="premium-bookings-grid">
                    {upcomingBookings.map((booking, index) => (
                      <div key={booking.id} className={`premium-booking-card ${animateCards ? 'animate-in' : ''}`} 
                           style={{ animationDelay: `${index * 0.1}s` }}>
                        <div className="booking-header">
                          <div className="tutor-avatar">
                            <img src={getTutorAvatar(booking)} alt={booking.tutor.name} />
                            <div className="online-indicator"></div>
                          </div>
                          <div className="booking-status">
                            {getStatusBadge(booking.status)}
                          </div>
                        </div>
                        
                        <div className="booking-content">
                          <h4 className="tutor-name">{booking.tutor.name}</h4>
                          <p className="booking-time">
                            <i className="bi bi-calendar-event"></i>
                            {formatDateTime(booking.scheduledAt)}
                          </p>
                          
                          {getCountdown(booking.scheduledAt) && (
                            <div className="countdown-timer">
                              <i className="bi bi-hourglass-split"></i>
                              <span>{getCountdown(booking.scheduledAt)}</span>
                            </div>
                          )}
                          
                          {booking.tutor.tutorProfile?.skills && (
                            <div className="tutor-skills">
                              {booking.tutor.tutorProfile.skills.slice(0, 3).map((skill, idx) => (
                                <span key={idx} className="skill-tag">{skill}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div className="booking-actions">
                          <button 
                            className="premium-btn primary"
                            onClick={() => {
                              setSelectedBooking(booking);
                              setShowModal(true);
                            }}
                          >
                            <i className="bi bi-eye"></i>
                            {t('View Details')}
                          </button>
                          
                          {(() => {
                            const scheduled = new Date(booking.scheduledAt);
                            const thirtyMinutesBefore = new Date(scheduled.getTime() - 30 * 60 * 1000);
                            const tenMinutesAfter = new Date(scheduled.getTime() + 10 * 60 * 1000);
                            const canJoin = currentTime >= thirtyMinutesBefore && currentTime <= tenMinutesAfter;
                            
                            return (
                              <Link
                                href={canJoin ? `/sessions/${booking.id}` : '#'}
                                className={`premium-btn ${canJoin ? 'accent' : 'disabled'}`}
                                style={!canJoin ? { pointerEvents: 'none', opacity: 0.6 } : {}}
                              >
                                <i className="bi bi-camera-video"></i>
                                {t('Join Session')}
                              </Link>
                            );
                          })()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="premium-empty-state">
                    <div className="empty-icon">
                      <i className="bi bi-calendar-x"></i>
                    </div>
                    <h3>{t('bookings.empty_states.no_upcoming_title')}</h3>
                    <p>{t('bookings.empty_states.no_upcoming_description')}</p>
                    <Link href="/tutors" className="premium-btn primary">
                      <i className="bi bi-search"></i>
                      {t('bookings.find_tutors')}
                    </Link>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'completed' && (
              <div className={`premium-bookings-section ${isVisible ? 'visible' : ''}`}>
                {completedBookings.length > 0 ? (
                  <div className="premium-bookings-grid">
                    {completedBookings.map((booking, index) => (
                      <div key={booking.id} className={`premium-booking-card completed ${animateCards ? 'animate-in' : ''}`} 
                           style={{ animationDelay: `${index * 0.1}s` }}>
                        <div className="booking-header">
                          <div className="tutor-avatar">
                            <img src={getTutorAvatar(booking)} alt={booking.tutor.name} />
                            <div className="completion-badge">
                              <i className="bi bi-check-circle-fill"></i>
                            </div>
                          </div>
                          <div className="booking-status">
                            {getStatusBadge(booking.status)}
                          </div>
                        </div>
                        
                        <div className="booking-content">
                          <h4 className="tutor-name">{booking.tutor.name}</h4>
                          <p className="booking-time">
                            <i className="bi bi-calendar-event"></i>
                            {formatDateTime(booking.scheduledAt)}
                          </p>
                          
                          {booking.tutor.tutorProfile?.skills && (
                            <div className="tutor-skills">
                              {booking.tutor.tutorProfile.skills.slice(0, 3).map((skill, idx) => (
                                <span key={idx} className="skill-tag">{skill}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div className="booking-actions">
                          <button 
                            className="premium-btn secondary"
                            onClick={() => {
                              setSelectedBooking(booking);
                              setShowModal(true);
                            }}
                          >
                            <i className="bi bi-eye"></i>
                            {t('bookings.view_details')}
                          </button>
                          
                          {booking.tutor.id && (
                            <Link href={`/tutors/${booking.tutor.id}/book`} className="premium-btn primary">
                              <i className="bi bi-arrow-clockwise"></i>
                              {t('bookings.book_again')}
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="premium-empty-state">
                    <div className="empty-icon">
                      <i className="bi bi-check-circle"></i>
                    </div>
                    <h3>{t('bookings.empty_states.no_completed_title')}</h3>
                    <p>{t('bookings.empty_states.no_completed_description')}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'cancelled' && (
              <div className={`premium-bookings-section ${isVisible ? 'visible' : ''}`}>
                {cancelledBookings.length > 0 ? (
                  <div className="premium-bookings-grid">
                    {cancelledBookings.map((booking, index) => (
                      <div key={booking.id} className={`premium-booking-card cancelled ${animateCards ? 'animate-in' : ''}`} 
                           style={{ animationDelay: `${index * 0.1}s` }}>
                        <div className="booking-header">
                          <div className="tutor-avatar">
                            <img src={getTutorAvatar(booking)} alt={booking.tutor.name} />
                            <div className="cancellation-badge">
                              <i className="bi bi-x-circle-fill"></i>
                            </div>
                          </div>
                          <div className="booking-status">
                            {getStatusBadge(booking.status)}
                          </div>
                        </div>
                        
                        <div className="booking-content">
                          <h4 className="tutor-name">{booking.tutor.name}</h4>
                          <p className="booking-time">
                            <i className="bi bi-calendar-event"></i>
                            {formatDateTime(booking.scheduledAt)}
                          </p>
                        </div>
                        
                        <div className="booking-actions">
                          <button 
                            className="premium-btn secondary"
                            onClick={() => {
                              setSelectedBooking(booking);
                              setShowModal(true);
                            }}
                          >
                            <i className="bi bi-eye"></i>
                            {t('bookings.view_details')}
                          </button>
                          
                          {booking.tutor.id && (
                            <Link href={`/tutors/${booking.tutor.id}/book`} className="premium-btn primary">
                              <i className="bi bi-arrow-clockwise"></i>
                              {t('bookings.book_again')}
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="premium-empty-state">
                    <div className="empty-icon">
                      <i className="bi bi-x-circle"></i>
                    </div>
                    <h3>{t('bookings.empty_states.no_cancelled_title')}</h3>
                    <p>{t('bookings.empty_states.no_cancelled_description')}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Premium Booking Detail Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered className="premium-modal">
        <Modal.Header closeButton className="premium-modal-header">
          <div className="modal-tutor-info">
            <img src={selectedBooking ? getTutorAvatar(selectedBooking) : ''} alt={selectedBooking?.tutor.name} className="modal-avatar" />
            <div className="modal-tutor-details">
              <Modal.Title>{selectedBooking?.tutor.name}</Modal.Title>
              {selectedBooking?.tutor.tutorProfile?.bio && (
                <p className="modal-bio">{selectedBooking.tutor.tutorProfile.bio}</p>
              )}
            </div>
          </div>
        </Modal.Header>
        <Modal.Body className="premium-modal-body">
          {selectedBooking && (
            <div className="modal-content-grid">
              <div className="modal-info-item">
                <i className="bi bi-envelope"></i>
                <div>
                  <label>{t('bookings.email')}</label>
                  <span>{selectedBooking.tutor.email}</span>
                </div>
              </div>
              
              <div className="modal-info-item">
                <i className="bi bi-calendar-event"></i>
                <div>
                  <label>{t('bookings.session_time')}</label>
                  <span>{formatDateTime(selectedBooking.scheduledAt)}</span>
                </div>
              </div>
              
              <div className="modal-info-item">
                <i className="bi bi-info-circle"></i>
                <div>
                  <label>{t('bookings.status')}</label>
                  <span>{getStatusBadge(selectedBooking.status)}</span>
                </div>
              </div>
              
              <div className="modal-info-item">
                <i className="bi bi-credit-card"></i>
                <div>
                  <label>{t('bookings.payment')}</label>
                  <span className={selectedBooking.paidAt ? 'payment-paid' : 'payment-pending'}>
                    {selectedBooking.paidAt ? t('bookings.paid') : t('bookings.pending')}
                  </span>
                </div>
              </div>
              
              {selectedBooking.status === "CONFIRMED" && new Date(selectedBooking.scheduledAt) > currentTime && (
                <div className="modal-info-item">
                  <i className="bi bi-hourglass-split"></i>
                  <div>
                    <label>{t('bookings.starts_in')}</label>
                    <span className="countdown">{getCountdown(selectedBooking.scheduledAt)}</span>
                  </div>
                </div>
              )}
              
              {selectedBooking.tutor.tutorProfile?.skills && (
                <div className="modal-info-item full-width">
                  <i className="bi bi-tags"></i>
                  <div>
                    <label>{t('bookings.skills')}</label>
                    <div className="modal-skills">
                      {selectedBooking.tutor.tutorProfile.skills.map((skill, idx) => (
                        <span key={idx} className="skill-tag">{skill}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="premium-modal-footer">
          {selectedBooking && selectedBooking.status === "CONFIRMED" && (() => {
            const scheduled = new Date(selectedBooking.scheduledAt);
            const thirtyMinutesBefore = new Date(scheduled.getTime() - 30 * 60 * 1000);
            const tenMinutesAfter = new Date(scheduled.getTime() + 10 * 60 * 1000);
            const canJoin = currentTime >= thirtyMinutesBefore && currentTime <= tenMinutesAfter;
            
            return (
              <Link
                href={canJoin ? `/sessions/${selectedBooking.id}` : '#'}
                className={`premium-btn ${canJoin ? 'accent' : 'disabled'}`}
                style={!canJoin ? { pointerEvents: 'none', opacity: 0.6 } : {}}
              >
                <i className="bi bi-camera-video"></i>
                {t('bookings.join_session')}
              </Link>
            );
          })()}
          
          <Link href={selectedBooking ? `/bookings/${selectedBooking.id}` : "#"} className="premium-btn secondary">
            <i className="bi bi-eye"></i>
            {t('bookings.view_full_details')}
          </Link>
          
          <Button variant="secondary" onClick={() => setShowModal(false)} className="premium-btn outline">
            {t('bookings.close')}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
} 