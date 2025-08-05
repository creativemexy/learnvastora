'use client';

import { useState, useEffect } from 'react';

interface Session {
  id: string;
  student: {
    id: string;
    name: string;
    email: string;
    photo?: string;
  };
  tutor: {
    id: string;
    name: string;
    email: string;
    photo?: string;
    hourlyRate: number;
    skills: string[];
    languages: string[];
  };
  scheduledAt: string;
  status: string;
  duration: number;
  price: number;
  isInstant: boolean;
  payment?: {
    id: string;
    amount: number;
    status: string;
    createdAt: string;
  };
  review?: {
    id: string;
    rating: number;
    comment?: string;
    createdAt: string;
  };
  stats: {
    totalMessages: number;
    totalRecordings: number;
    isPaid: boolean;
    hasReview: boolean;
    totalValue: number;
  };
}

interface SessionStatistics {
  totalSessions: number;
  totalRevenue: number;
  todaySessions: number;
  statusBreakdown: Array<{
    status: string;
    count: number;
  }>;
}

interface SessionManagementProps {
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

export default function SessionManagement({ showNotification }: SessionManagementProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [statistics, setStatistics] = useState<SessionStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');

  useEffect(() => {
    fetchSessions();
  }, [currentPage, search, statusFilter, dateFrom, dateTo]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo })
      });

      const response = await fetch(`/api/super-admin/sessions?${params}`);
      const data = await response.json();

      if (data.success && data.data) {
        setSessions(data.data.sessions || []);
        setStatistics(data.data.statistics);
        setTotalPages(data.data.pagination?.totalPages || 1);
      } else {
        showNotification('error', 'Failed to fetch sessions');
        setSessions([]);
        setStatistics(null);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
      showNotification('error', 'Network error while fetching sessions');
      setSessions([]);
      setStatistics(null);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const handleSessionAction = async (sessionId: string, action: string, updates?: any) => {
    try {
      const response = await fetch('/api/super-admin/sessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, action, updates })
      });

      const data = await response.json();

      if (data.success) {
        showNotification('success', `Session ${action} successfully`);
        fetchSessions(); // Refresh the list
        setShowRescheduleModal(false);
        setRescheduleDate('');
        setRescheduleTime('');
      } else {
        showNotification('error', `Failed to ${action} session`);
      }
    } catch (error) {
      console.error(`Error ${action}ing session:`, error);
      showNotification('error', `Network error while ${action}ing session`);
    }
  };

  const handleReschedule = () => {
    if (!selectedSession || !rescheduleDate || !rescheduleTime) {
      showNotification('error', 'Please select date and time');
      return;
    }

    const newDateTime = new Date(`${rescheduleDate}T${rescheduleTime}`);
    handleSessionAction(selectedSession.id, 'reschedule', { scheduledAt: newDateTime.toISOString() });
  };

  const getStatusBadge = (status: string) => {
    const colors: { [key: string]: string } = {
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'CONFIRMED': 'bg-blue-100 text-blue-800',
      'IN_PROGRESS': 'bg-purple-100 text-purple-800',
      'COMPLETED': 'bg-green-100 text-green-800',
      'CANCELLED': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentStatusBadge = (isPaid: boolean) => {
    return isPaid ? 
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Paid</span> :
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Unpaid</span>;
  };

  const getRatingStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <i 
          key={i} 
          className={`fas fa-star ${i <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
        />
      );
    }
    return stars;
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

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="super-admin-session-management">
      <div className="super-admin-card">
        <div className="super-admin-card-header">
          <h3>Session Management</h3>
          <div className="super-admin-card-actions">
            <button 
              className="super-admin-btn secondary"
              onClick={() => {
                showNotification('info', 'Export functionality coming soon');
              }}
            >
              <i className="fas fa-download"></i>
              Export Sessions
            </button>
            <button 
              className="super-admin-btn secondary"
              onClick={() => {
                showNotification('info', 'Analytics dashboard coming soon');
              }}
            >
              <i className="fas fa-chart-bar"></i>
              Session Analytics
            </button>
          </div>
        </div>
        <div className="super-admin-card-body">
          {/* Statistics */}
          {statistics && (
            <div className="super-admin-session-stats">
              <div className="super-admin-stat-card">
                <div className="super-admin-stat-icon">
                  <i className="fas fa-calendar"></i>
                </div>
                <div className="super-admin-stat-content">
                  <h4>Total Sessions</h4>
                  <p>{statistics.totalSessions}</p>
                </div>
              </div>
              <div className="super-admin-stat-card">
                <div className="super-admin-stat-icon">
                  <i className="fas fa-dollar-sign"></i>
                </div>
                <div className="super-admin-stat-content">
                  <h4>Total Revenue</h4>
                  <p>${statistics.totalRevenue.toFixed(2)}</p>
                </div>
              </div>
              <div className="super-admin-stat-card">
                <div className="super-admin-stat-icon">
                  <i className="fas fa-clock"></i>
                </div>
                <div className="super-admin-stat-content">
                  <h4>Today&apos;s Sessions</h4>
                  <p>{statistics.todaySessions}</p>
                </div>
              </div>
              <div className="super-admin-stat-card">
                <div className="super-admin-stat-icon">
                  <i className="fas fa-chart-pie"></i>
                </div>
                <div className="super-admin-stat-content">
                  <h4>Status Breakdown</h4>
                  <div className="super-admin-status-breakdown">
                    {statistics.statusBreakdown.map(stat => (
                      <span key={stat.status} className="super-admin-status-item">
                        {stat.status}: {stat.count}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="super-admin-session-filters">
            <input
              type="text"
              placeholder="Search sessions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="super-admin-input"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="super-admin-select"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="super-admin-input"
              placeholder="From Date"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="super-admin-input"
              placeholder="To Date"
            />
          </div>

          {/* Sessions List */}
          <div className="super-admin-sessions-list">
            {loading ? (
              <div className="super-admin-loading">
                <div className="super-admin-spinner"></div>
                <p>Loading sessions...</p>
              </div>
            ) : sessions.length === 0 ? (
              <div className="super-admin-empty-state">
                <div className="super-admin-empty-state-icon">📅</div>
                <h3>No Sessions Found</h3>
                <p>No sessions match your current filters.</p>
              </div>
            ) : (
              <div className="super-admin-sessions-grid">
                {sessions.map((session) => (
                  <div key={session.id} className="super-admin-session-card">
                    <div className="super-admin-session-header">
                      <div className="super-admin-session-participants">
                        <div className="super-admin-session-student">
                          <div className="super-admin-session-avatar">
                            {session.student.photo ? (
                              <img src={session.student.photo} alt={session.student.name} className="w-8 h-8 rounded-full" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold">
                                {session.student.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="super-admin-session-info">
                            <span className="super-admin-session-label">Student</span>
                            <span className="super-admin-session-name">{session.student.name}</span>
                          </div>
                        </div>
                        <div className="super-admin-session-arrow">
                          <i className="fas fa-arrow-right"></i>
                        </div>
                        <div className="super-admin-session-tutor">
                          <div className="super-admin-session-avatar">
                            {session.tutor.photo ? (
                              <img src={session.tutor.photo} alt={session.tutor.name} className="w-8 h-8 rounded-full" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                                {session.tutor.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="super-admin-session-info">
                            <span className="super-admin-session-label">Tutor</span>
                            <span className="super-admin-session-name">{session.tutor.name}</span>
                          </div>
                        </div>
                      </div>
                      <div className="super-admin-session-status">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(session.status)}`}>
                          {session.status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="super-admin-session-details">
                      <div className="super-admin-session-meta">
                        <div className="super-admin-session-meta-item">
                          <i className="fas fa-calendar"></i>
                          <span>{formatDateTime(session.scheduledAt)}</span>
                        </div>
                        <div className="super-admin-session-meta-item">
                          <i className="fas fa-clock"></i>
                          <span>{formatDuration(session.duration)}</span>
                        </div>
                        <div className="super-admin-session-meta-item">
                          <i className="fas fa-dollar-sign"></i>
                          <span>${session.price}</span>
                        </div>
                        {session.isInstant && (
                          <div className="super-admin-session-meta-item">
                            <i className="fas fa-bolt"></i>
                            <span>Instant</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="super-admin-session-stats">
                        <div className="super-admin-session-stat">
                          <span className="super-admin-session-stat-label">Messages:</span>
                          <span className="super-admin-session-stat-value">{session.stats.totalMessages}</span>
                        </div>
                        <div className="super-admin-session-stat">
                          <span className="super-admin-session-stat-label">Recordings:</span>
                          <span className="super-admin-session-stat-value">{session.stats.totalRecordings}</span>
                        </div>
                        <div className="super-admin-session-stat">
                          <span className="super-admin-session-stat-label">Payment:</span>
                          <span className="super-admin-session-stat-value">
                            {getPaymentStatusBadge(session.stats.isPaid)}
                          </span>
                        </div>
                        {session.review && (
                          <div className="super-admin-session-stat">
                            <span className="super-admin-session-stat-label">Rating:</span>
                            <span className="super-admin-session-stat-value">
                              {getRatingStars(session.review.rating)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="super-admin-session-actions">
                      <button
                        onClick={() => setSelectedSession(session)}
                        className="super-admin-btn secondary"
                        title="View Details"
                      >
                        <i className="fas fa-eye"></i>
                      </button>
                      {session.status === 'PENDING' && (
                        <button
                          onClick={() => {
                            setSelectedSession(session);
                            setShowRescheduleModal(true);
                          }}
                          className="super-admin-btn primary"
                          title="Reschedule"
                        >
                          <i className="fas fa-calendar-alt"></i>
                        </button>
                      )}
                      {session.status === 'CONFIRMED' && (
                        <button
                          onClick={() => handleSessionAction(session.id, 'mark_completed')}
                          className="super-admin-btn primary"
                          title="Mark Completed"
                        >
                          <i className="fas fa-check"></i>
                        </button>
                      )}
                      {session.status === 'PENDING' && (
                        <button
                          onClick={() => handleSessionAction(session.id, 'cancel')}
                          className="super-admin-btn danger"
                          title="Cancel Session"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="super-admin-pagination">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="super-admin-btn secondary"
              >
                <i className="fas fa-chevron-left"></i>
                Previous
              </button>
              <span className="super-admin-pagination-info">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="super-admin-btn secondary"
              >
                Next
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Session Details Modal */}
      {selectedSession && (
        <div className="super-admin-modal-overlay">
          <div className="super-admin-modal">
            <div className="super-admin-modal-header">
              <h3>Session Details</h3>
              <button
                onClick={() => setSelectedSession(null)}
                className="super-admin-modal-close"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="super-admin-modal-body">
              <div className="super-admin-session-detail">
                <label>Session ID:</label>
                <span>{selectedSession.id}</span>
              </div>
              <div className="super-admin-session-detail">
                <label>Student:</label>
                <span>{selectedSession.student.name} ({selectedSession.student.email})</span>
              </div>
              <div className="super-admin-session-detail">
                <label>Tutor:</label>
                <span>{selectedSession.tutor.name} ({selectedSession.tutor.email})</span>
              </div>
              <div className="super-admin-session-detail">
                <label>Scheduled:</label>
                <span>{formatDateTime(selectedSession.scheduledAt)}</span>
              </div>
              <div className="super-admin-session-detail">
                <label>Duration:</label>
                <span>{formatDuration(selectedSession.duration)}</span>
              </div>
              <div className="super-admin-session-detail">
                <label>Price:</label>
                <span>${selectedSession.price}</span>
              </div>
              <div className="super-admin-session-detail">
                <label>Status:</label>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(selectedSession.status)}`}>
                  {selectedSession.status}
                </span>
              </div>
              <div className="super-admin-session-detail">
                <label>Payment Status:</label>
                <span>{getPaymentStatusBadge(selectedSession.stats.isPaid)}</span>
              </div>
              {selectedSession.review && (
                <div className="super-admin-session-detail">
                  <label>Review:</label>
                  <span>{getRatingStars(selectedSession.review.rating)} - {selectedSession.review.comment}</span>
                </div>
              )}
              <div className="super-admin-session-detail">
                <label>Messages:</label>
                <span>{selectedSession.stats.totalMessages}</span>
              </div>
              <div className="super-admin-session-detail">
                <label>Recordings:</label>
                <span>{selectedSession.stats.totalRecordings}</span>
              </div>
            </div>
            <div className="super-admin-modal-footer">
              <button
                onClick={() => setSelectedSession(null)}
                className="super-admin-btn secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && selectedSession && (
        <div className="super-admin-modal-overlay">
          <div className="super-admin-modal">
            <div className="super-admin-modal-header">
              <h3>Reschedule Session</h3>
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="super-admin-modal-close"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="super-admin-modal-body">
              <div className="super-admin-form-group">
                <label>New Date:</label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="super-admin-input"
                />
              </div>
              <div className="super-admin-form-group">
                <label>New Time:</label>
                <input
                  type="time"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="super-admin-input"
                />
              </div>
            </div>
            <div className="super-admin-modal-footer">
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="super-admin-btn secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleReschedule}
                className="super-admin-btn primary"
              >
                Reschedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 