'use client';

import { useState, useEffect } from 'react';
import './session-management.css';

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
    <div className="session-management-container">
      {/* Header */}
      <div className="session-management-header">
        <h1 className="premium-heading">Session Management</h1>
        <p className="premium-text">Manage and monitor all sessions on the platform</p>
      </div>

      {/* Controls */}
      <div className="session-controls">
        <div className="control-left">
          <button 
            className="btn btn-primary"
            onClick={() => {
              showNotification('info', 'Export functionality coming soon');
            }}
          >
            <span className="btn-icon">📤</span>
            Export Sessions
          </button>
          
          <button 
            className="btn btn-secondary"
            onClick={() => {
              showNotification('info', 'Analytics dashboard coming soon');
            }}
          >
            <span className="btn-icon">📊</span>
            Session Analytics
          </button>
        </div>

        <div className="control-center">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search sessions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
            <span className="search-icon">🔍</span>
          </div>
        </div>

        <div className="control-right">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
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
            className="filter-select"
          />
          
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="filter-select"
          />
        </div>
      </div>

      {/* Stats Cards */}
      {statistics && (
        <div className="session-stats-grid">
          <div className="stat-card premium-hover">
            <div className="stat-icon total">📅</div>
            <div className="stat-content">
              <div className="stat-value">{statistics.totalSessions}</div>
              <div className="stat-label">Total Sessions</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon revenue">💰</div>
            <div className="stat-content">
              <div className="stat-value">${statistics.totalRevenue.toFixed(2)}</div>
              <div className="stat-label">Total Revenue</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon pending">⏰</div>
            <div className="stat-content">
              <div className="stat-value">{statistics.todaySessions}</div>
              <div className="stat-label">Today&apos;s Sessions</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon completed">✅</div>
            <div className="stat-content">
              <div className="stat-value">
                {statistics.statusBreakdown.find(s => s.status === 'COMPLETED')?.count || 0}
              </div>
              <div className="stat-label">Completed</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon cancelled">❌</div>
            <div className="stat-content">
              <div className="stat-value">
                {statistics.statusBreakdown.find(s => s.status === 'CANCELLED')?.count || 0}
              </div>
              <div className="stat-label">Cancelled</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon duration">⏱️</div>
            <div className="stat-content">
              <div className="stat-value">
                {statistics.statusBreakdown.find(s => s.status === 'PENDING')?.count || 0}
              </div>
              <div className="stat-label">Pending</div>
            </div>
          </div>
        </div>
      )}

      {/* Sessions List */}
      <div className="sessions-list-container">
        {loading ? (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <p>Loading sessions...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📅</div>
            <h3 className="empty-title">No Sessions Found</h3>
            <p className="empty-subtitle">No sessions match your current filters.</p>
          </div>
        ) : (
          <>
            {/* List Header */}
            <div className="sessions-list-header">
              <div className="list-header-item">Session</div>
              <div className="list-header-item">Participants</div>
              <div className="list-header-item">Status</div>
              <div className="list-header-item">Date & Time</div>
              <div className="list-header-item">Duration</div>
              <div className="list-header-item">Amount</div>
              <div className="list-header-item">Actions</div>
            </div>

            {/* Sessions List */}
            <div className="sessions-list">
              {sessions.map((session) => (
                <div key={session.id} className="session-card premium-hover">
                  {/* Session Info */}
                  <div className="session-info">
                    <div className="session-avatar">
                      {session.student.photo ? (
                        <img src={session.student.photo} alt={session.student.name} className="avatar-image" />
                      ) : (
                        <div className="avatar-initials">
                          {session.student.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    
                    <div className="session-details">
                      <div className="session-title">
                        {session.student.name} → {session.tutor.name}
                      </div>
                      <div className="session-subtitle">
                        {session.isInstant ? 'Instant Session' : 'Scheduled Session'}
                      </div>
                    </div>
                  </div>

                  {/* Participants */}
                  <div className="session-participants">
                    <div className="participant-info">
                      <span className="participant-role">S</span>
                      <span className="participant-name">{session.student.name}</span>
                    </div>
                    <div className="participant-info">
                      <span className="participant-role">T</span>
                      <span className="participant-name">{session.tutor.name}</span>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="session-status">
                    <span className={`status-badge ${session.status.toLowerCase()}`}>
                      {session.status}
                    </span>
                  </div>

                  {/* Date */}
                  <div className="session-date">
                    <div className="date-text">
                      {formatDateTime(session.scheduledAt)}
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="session-duration">
                    {formatDuration(session.duration)}
                  </div>

                  {/* Amount */}
                  <div className="session-amount">
                    ${session.price}
                  </div>

                  {/* Actions */}
                  <div className="session-actions">
                    <button 
                      className="action-btn view-btn"
                      onClick={() => {
                        setSelectedSession(session);
                        setShowSessionModal(true);
                      }}
                      title="View Session"
                    >
                      👁️
                    </button>
                    
                    <button 
                      className="action-btn edit-btn"
                      onClick={() => {
                        setSelectedSession(session);
                        setShowRescheduleModal(true);
                      }}
                      title="Reschedule Session"
                    >
                      📅
                    </button>
                    
                    <button 
                      className="action-btn delete-btn"
                      onClick={() => handleSessionAction(session.id, 'cancel')}
                      title="Cancel Session"
                    >
                      ❌
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
} 