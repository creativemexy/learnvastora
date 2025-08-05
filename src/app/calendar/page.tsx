"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StudentNavbar from "@/components/StudentNavbar";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isSameWeek, startOfDay, endOfDay, addWeeks, subWeeks, isToday, isPast, isFuture } from "date-fns";
import { Modal, Button } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import './calendar-premium.css';

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

type ViewType = 'monthly' | 'weekly' | 'daily';

export default function CalendarPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<ViewType>('monthly');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [miniProfile, setMiniProfile] = useState<{booking: Booking, anchor: {x: number, y: number}} | null>(null);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const miniProfileTimeout = useRef<NodeJS.Timeout | null>(null);
  const { t } = useTranslation();

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

    // Fetch bookings data
    fetch("/api/bookings")
      .then(res => res.json())
      .then(data => {
        setBookings(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [session, status, router]);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const upcomingBookings = bookings.filter(b => 
    b.status === "CONFIRMED" && new Date(b.scheduledAt) > new Date()
  );
  
  const completedBookings = bookings.filter(b => b.status === "COMPLETED");
  
  const totalHours = completedBookings.length;
  
  // Only count languages from completed bookings where the student actually learned
  const languagesLearned = new Set(
    completedBookings
      .filter(b => b.tutor.tutorProfile?.skills)
      .flatMap(b => b.tutor.tutorProfile?.skills || [])
  ).size;

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { class: string; text: string; icon: string } } = {
      PENDING: { class: 'status-pending', text: t('calendar_section.pending'), icon: '⏳' },
      CONFIRMED: { class: 'status-confirmed', text: t('calendar_section.confirmed'), icon: '✅' },
      COMPLETED: { class: 'status-completed', text: t('calendar_section.completed'), icon: '🎉' },
      CANCELLED: { class: 'status-cancelled', text: t('calendar_section.cancelled'), icon: '❌' }
    };
    const statusInfo = statusMap[status] || { class: 'status-default', text: status, icon: '❓' };
    return (
      <span className={`status-badge ${statusInfo.class}`}>
        <span className="status-icon">{statusInfo.icon}</span>
        <span className="status-text">{statusInfo.text}</span>
      </span>
    );
  };

  const formatDateTime = (dateString: string) => {
    const d = new Date(dateString);
    return format(d, "MMM dd, yyyy 'at' h:mm a");
  };

  const getTutorAvatar = (booking: Booking) => {
    return booking.tutor.photo || 
           booking.tutor.tutorProfile?.avatar || 
           `https://ui-avatars.com/api/?name=${encodeURIComponent(booking.tutor.name)}&background=7c3aed&color=fff&size=128`;
  };

  const getCountdown = (date: string) => {
    const now = new Date();
    const scheduled = new Date(date);
    const diff = scheduled.getTime() - now.getTime();
    
    if (diff <= 0) return "Now";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const goToPrevious = () => {
    setCurrentDate(prev => {
      switch (viewType) {
        case 'monthly': return subMonths(prev, 1);
        case 'weekly': return subWeeks(prev, 1);
        case 'daily': return addDays(prev, -1);
        default: return prev;
      }
    });
  };

  const goToNext = () => {
    setCurrentDate(prev => {
      switch (viewType) {
        case 'monthly': return addMonths(prev, 1);
        case 'weekly': return addWeeks(prev, 1);
        case 'daily': return addDays(prev, 1);
        default: return prev;
      }
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getViewTitle = () => {
    switch (viewType) {
      case 'monthly':
        return format(currentDate, 'MMMM yyyy');
      case 'weekly':
        const start = startOfWeek(currentDate);
        const end = endOfWeek(currentDate);
        return `${format(start, 'MMM dd')} - ${format(end, 'MMM dd, yyyy')}`;
      case 'daily':
        return format(currentDate, 'EEEE, MMMM dd, yyyy');
      default:
        return format(currentDate, 'MMMM yyyy');
    }
  };

  const getBookingsForDate = (date: Date) => {
    return bookings.filter(booking => {
      const bookingDate = new Date(booking.scheduledAt);
      return isSameDay(bookingDate, date);
    });
  };

  const renderMonthlyView = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const startDate = startOfWeek(start);
    const endDate = endOfWeek(end);
    
    const days = [];
    let day = startDate;
    
    while (day <= endDate) {
      const bookingsForDay = getBookingsForDate(day);
      const isCurrentMonth = isSameMonth(day, currentDate);
      const isCurrentDay = isToday(day);
      const hasBookings = bookingsForDay.length > 0;
      
      days.push(
        <div
          key={day.toISOString()}
          className={`calendar-day ${isCurrentMonth ? 'current-month' : 'other-month'} ${isCurrentDay ? 'today' : ''} ${hasBookings ? 'has-bookings' : ''}`}
          onMouseEnter={() => setHoveredDate(day)}
          onMouseLeave={() => setHoveredDate(null)}
        >
          <div className="day-number">{format(day, 'd')}</div>
          {hasBookings && (
            <div className="bookings-indicator">
              <div className="booking-dots">
                {bookingsForDay.slice(0, 3).map((booking, index) => (
                  <div
                    key={booking.id}
                    className={`booking-dot ${booking.status.toLowerCase()}`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedBooking(booking);
                      setShowModal(true);
                    }}
                  />
                ))}
                {bookingsForDay.length > 3 && (
                  <div className="more-bookings">+{bookingsForDay.length - 3}</div>
                )}
              </div>
            </div>
          )}
          {hoveredDate && isSameDay(hoveredDate, day) && hasBookings && (
            <div className="day-tooltip">
              <div className="tooltip-content">
                <div className="tooltip-title">{format(day, 'EEEE, MMMM dd')}</div>
                {bookingsForDay.map(booking => (
                  <div key={booking.id} className="tooltip-booking">
                    <img src={getTutorAvatar(booking)} alt={booking.tutor.name} className="tooltip-avatar" />
                    <div className="tooltip-info">
                      <div className="tooltip-name">{booking.tutor.name}</div>
                      <div className="tooltip-time">
                        {format(new Date(booking.scheduledAt), 'h:mm a')} - {format(new Date(new Date(booking.scheduledAt).getTime() + 30 * 60 * 1000), 'h:mm a')}
                      </div>
                    </div>
                    {getStatusBadge(booking.status)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
      
      day = addDays(day, 1);
    }
    
    return (
      <div className="monthly-view">
        <div className="calendar-grid">
          {daysOfWeek.map(day => (
            <div key={day} className="calendar-header-day">{day}</div>
          ))}
          {days}
        </div>
      </div>
    );
  };

  const renderWeeklyView = () => {
    const start = startOfWeek(currentDate);
    const end = endOfWeek(currentDate);
    
    const days = [];
    let day = start;
    
    while (day <= end) {
      const bookingsForDay = getBookingsForDate(day);
      const isCurrentDay = isToday(day);
      
      days.push(
        <div key={day.toISOString()} className={`week-day ${isCurrentDay ? 'today' : ''}`}>
          <div className="week-day-header">
            <div className="week-day-name">{format(day, 'EEE')}</div>
            <div className="week-day-number">{format(day, 'd')}</div>
          </div>
          <div className="week-day-bookings">
            {bookingsForDay.map(booking => (
              <div
                key={booking.id}
                className={`week-booking ${booking.status.toLowerCase()}`}
                onClick={() => {
                  setSelectedBooking(booking);
                  setShowModal(true);
                }}
              >
                <div className="booking-time">
                  {format(new Date(booking.scheduledAt), 'h:mm a')} - {format(new Date(new Date(booking.scheduledAt).getTime() + 30 * 60 * 1000), 'h:mm a')}
                </div>
                <div className="booking-tutor">
                  <img src={getTutorAvatar(booking)} alt={booking.tutor.name} className="booking-avatar" />
                  <span className="tutor-name">{booking.tutor.name}</span>
                </div>
                {getStatusBadge(booking.status)}
              </div>
            ))}
            {bookingsForDay.length === 0 && (
              <div className="empty-slot">
                <div className="empty-icon">📅</div>
                <div className="empty-text">Available</div>
              </div>
            )}
          </div>
        </div>
      );
      
      day = addDays(day, 1);
    }
    
    return (
      <div className="weekly-view">
        {days}
      </div>
    );
  };

  const renderDailyView = () => {
    const timeSlots = [];
    const startHour = 6; // 6 AM
    const endHour = 22; // 10 PM
    
    for (let hour = startHour; hour < endHour; hour++) {
      const time = new Date(currentDate);
      time.setHours(hour, 0, 0, 0);
      
      const bookingsInSlot = bookings.filter(booking => {
        const bookingTime = new Date(booking.scheduledAt);
        return isSameDay(bookingTime, currentDate) && bookingTime.getHours() === hour;
      });
      
      timeSlots.push(
        <div key={hour} className="time-slot">
          <div className="time-label">{format(time, 'h:mm a')}</div>
          <div className="time-content">
            {bookingsInSlot.map(booking => (
              <div
                key={booking.id}
                className={`daily-booking ${booking.status.toLowerCase()}`}
                onClick={() => {
                  setSelectedBooking(booking);
                  setShowModal(true);
                }}
              >
                <div className="booking-header">
                  <img src={getTutorAvatar(booking)} alt={booking.tutor.name} className="booking-avatar" />
                  <div className="booking-info">
                    <div className="tutor-name">{booking.tutor.name}</div>
                    <div className="booking-time">
                      {format(new Date(booking.scheduledAt), 'h:mm a')} - {format(new Date(new Date(booking.scheduledAt).getTime() + 30 * 60 * 1000), 'h:mm a')}
                    </div>
                  </div>
                  {getStatusBadge(booking.status)}
                </div>
                {booking.tutor.tutorProfile?.skills && (
                  <div className="booking-skills">
                    {booking.tutor.tutorProfile.skills.slice(0, 2).map((skill, idx) => (
                      <span key={idx} className="skill-tag">{skill}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {bookingsInSlot.length === 0 && (
              <div className="empty-slot">
                <div className="empty-icon">⏰</div>
                <div className="empty-text">Available</div>
              </div>
            )}
          </div>
        </div>
      );
    }
    
    return (
      <div className="daily-view">
        {timeSlots}
      </div>
    );
  };

  // Days of the week for the calendar header
  const daysOfWeek = [
    t('calendar_section.sunday'),
    t('calendar_section.monday'),
    t('calendar_section.tuesday'),
    t('calendar_section.wednesday'),
    t('calendar_section.thursday'),
    t('calendar_section.friday'),
    t('calendar_section.saturday'),
  ];

  if (status === "loading" || loading) {
    return (
      <div className="premium-loading-container">
        <div className="loading-spinner">
          <div className="spinner-ring"></div>
          <div className="spinner-text">{t('calendar_section.loading')}...</div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="premium-calendar-container">
      {/* Animated Background */}
      <div className="animated-background">
        <div className="floating-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
          <div className="shape shape-4"></div>
          <div className="shape shape-5"></div>
        </div>
      </div>

      <StudentNavbar />
      
      <div className="calendar-content">
        {/* Hero Section */}
        <div className={`hero-section ${isVisible ? 'visible' : ''}`}>
          <div className="hero-content">
            <div className="hero-icon">📅</div>
            <h1 className="hero-title">{t('calendar_section.title')}</h1>
            <p className="hero-subtitle">{t('calendar_section.subtitle')}</p>

            {/* Enhanced Stats */}
            <div className="hero-stats">
              <div className="stat-item">
                <span className="stat-number">{upcomingBookings.length}</span>
                <span className="stat-label">{t('calendar_section.upcoming_sessions')}</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{completedBookings.length}</span>
                <span className="stat-label">{t('calendar_section.completed_sessions')}</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{totalHours}</span>
                <span className="stat-label">{t('calendar_section.total_hours')}</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{languagesLearned}</span>
                <span className="stat-label">{t('calendar_section.languages_learned')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* View Type Selector */}
        <div className={`view-selector ${isVisible ? 'visible' : ''}`}>
          <div className="view-tabs">
            <button
              className={`view-tab ${viewType === 'monthly' ? 'active' : ''}`}
              onClick={() => setViewType('monthly')}
            >
              <span className="tab-icon">📅</span>
              <span className="tab-text">{t('calendar_section.monthly')}</span>
            </button>
            <button
              className={`view-tab ${viewType === 'weekly' ? 'active' : ''}`}
              onClick={() => setViewType('weekly')}
            >
              <span className="tab-icon">📊</span>
              <span className="tab-text">{t('calendar_section.weekly')}</span>
            </button>
            <button
              className={`view-tab ${viewType === 'daily' ? 'active' : ''}`}
              onClick={() => setViewType('daily')}
            >
              <span className="tab-icon">📝</span>
              <span className="tab-text">{t('calendar_section.daily')}</span>
            </button>
          </div>
        </div>

        {/* Calendar controls */}
        <div className={`calendar-controls ${isVisible ? 'visible' : ''}`}>
          <button className="nav-btn prev-btn" onClick={goToPrevious}>
            <span className="nav-icon">‹</span>
          </button>
          <div className="calendar-title">
            <h2 className="current-period">{getViewTitle()}</h2>
            <button className="today-btn" onClick={goToToday}>
              {t('calendar_section.today')}
            </button>
          </div>
          <button className="nav-btn next-btn" onClick={goToNext}>
            <span className="nav-icon">›</span>
          </button>
        </div>
        
        {/* Calendar View */}
        <div className={`calendar-view ${isVisible ? 'visible' : ''}`}>
          {viewType === 'monthly' && renderMonthlyView()}
          {viewType === 'weekly' && renderWeeklyView()}
          {viewType === 'daily' && renderDailyView()}
        </div>
      </div>

      {/* Mini Profile Card */}
      {miniProfile && (
        <div
          className="mini-profile-card"
          style={{
            position: 'fixed',
            left: miniProfile.anchor.x + 10,
            top: miniProfile.anchor.y,
            zIndex: 9999
          }}
          onMouseEnter={() => { if (miniProfileTimeout.current) clearTimeout(miniProfileTimeout.current); }}
          onMouseLeave={() => { setMiniProfile(null); }}
        >
          <img src={getTutorAvatar(miniProfile.booking)} alt={miniProfile.booking.tutor.name} className="profile-avatar" />
          <div className="profile-name">{miniProfile.booking.tutor.name}</div>
          {miniProfile.booking.tutor.tutorProfile?.bio && <div className="profile-bio">{miniProfile.booking.tutor.tutorProfile.bio}</div>}
          {miniProfile.booking.status === "COMPLETED" && miniProfile.booking.tutor.id && (
            <Link href={`/tutors/${miniProfile.booking.tutor.id}/book`} className="book-again-btn">
              {t('calendar_section.book_again')}
            </Link>
          )}
        </div>
      )}

      {/* Booking Detail Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered className="premium-modal">
        <Modal.Header closeButton className="modal-header">
          <div className="modal-tutor-info">
            <img src={selectedBooking ? getTutorAvatar(selectedBooking) : ''} alt={selectedBooking?.tutor.name} className="modal-avatar" />
            <div className="modal-tutor-details">
              <Modal.Title className="modal-title">{selectedBooking?.tutor.name}</Modal.Title>
              {selectedBooking?.tutor.tutorProfile?.bio && <div className="modal-bio">{selectedBooking.tutor.tutorProfile.bio}</div>}
            </div>
          </div>
        </Modal.Header>
        <Modal.Body className="modal-body">
          {selectedBooking && (
            <div className="booking-details">
              <div className="detail-item">
                <span className="detail-label">📧 Email:</span>
                <span className="detail-value">{selectedBooking.tutor.email}</span>
              </div>
              <div className="mb-2"><strong>Time:</strong> {formatDateTime(selectedBooking.scheduledAt)} - {format(new Date(new Date(selectedBooking.scheduledAt).getTime() + 30 * 60 * 1000), 'h:mm a')}</div>
              <div className="detail-item">
                <span className="detail-label">📊 Status:</span>
                <span className="detail-value">{getStatusBadge(selectedBooking.status)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">💳 Payment:</span>
                <span className="detail-value">
                  {selectedBooking.paidAt ? 
                    <span className="payment-status paid">Paid</span> : 
                    <span className="payment-status pending">Pending</span>
                  }
                </span>
              </div>
              {selectedBooking.status === "CONFIRMED" && new Date(selectedBooking.scheduledAt) > new Date() && (
                <div className="detail-item">
                  <span className="detail-label">⏰ Starts in:</span>
                  <span className="detail-value countdown">{getCountdown(selectedBooking.scheduledAt)}</span>
                </div>
              )}
              {selectedBooking.tutor.tutorProfile?.skills && (
                <div className="detail-item">
                  <span className="detail-label">🎯 Skills:</span>
                  <div className="skills-container">
                    {selectedBooking.tutor.tutorProfile.skills.map((skill, index) => (
                      <span key={index} className="skill-badge">{skill}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="modal-footer">
          {selectedBooking && selectedBooking.status === "CONFIRMED" && (() => {
            const now = new Date();
            const scheduled = new Date(selectedBooking.scheduledAt);
            const thirtyMinutesBefore = new Date(scheduled.getTime() - 30 * 60 * 1000);
            const tenMinutesAfter = new Date(scheduled.getTime() + 10 * 60 * 1000);
            const canJoin = now >= thirtyMinutesBefore && now <= tenMinutesAfter;
            let tooltip = '';
            if (!canJoin) {
              if (now < thirtyMinutesBefore) {
                tooltip = `You can join up to 30 minutes before the session starts.`;
              } else if (now > tenMinutesAfter) {
                tooltip = `This session has ended.`;
              }
            }
            return (
              <span title={tooltip} style={{ display: 'inline-block' }}>
                <Link
                  href={canJoin ? `/sessions/${selectedBooking.id}` : '#'}
                  className={`join-btn ${!canJoin ? 'disabled' : ''}`}
                  tabIndex={canJoin ? 0 : -1}
                  aria-disabled={!canJoin}
                  style={!canJoin ? { pointerEvents: 'none', opacity: 0.6 } : {}}
                >
                  <span className="btn-icon">🎥</span>
                  Join Session
                </Link>
              </span>
            );
          })()}
          <Link href={selectedBooking ? `/bookings/${selectedBooking.id}` : "#"} className="view-btn">
            <span className="btn-icon">👁️</span>
            View Details
          </Link>
          <Button variant="secondary" onClick={() => setShowModal(false)} className="close-btn">
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
} 