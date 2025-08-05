"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import './super-admin-sessions.css';

interface Session {
  id: string;
  status: string;
  scheduledAt: string;
  duration: number;
  price: number;
  createdAt: string;
  sessionType?: string;
  paymentStatus?: string;
  tutor: {
    id: string;
    name: string;
    email: string;
    photo?: string;
  };
  student: {
    id: string;
    name: string;
    email: string;
    photo?: string;
  };
  sessionRecordings: Array<{
    id: string;
    url: string;
    fileName: string;
    createdAt: string;
  }>;
  review?: {
    id: string;
    rating: number;
    comment?: string;
    createdAt: string;
  };
}

interface SessionStats {
  byStatus: Array<{
    status: string;
    _count: { id: number };
  }>;
  byReviewStatus: Array<{
    status: string;
    _count: { id: number };
  }>;
  totalSessions: number;
  totalRevenue: number;
  todaySessions: number;
}

export default function SuperAdminSessionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    status: '',
    sessionType: '',
    paymentStatus: '',
    reviewStatus: '',
    tutorName: '',
    studentName: '',
    minDuration: '',
    maxDuration: '',
    tutorId: '',
    studentId: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/signin");
      return;
    }
    if ((session.user as any)?.role !== "SUPER_ADMIN") {
      router.push("/");
      return;
    }
    fetchSessions();
  }, [session, status, router, currentPage, filters]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...filters
      });
      const response = await fetch(`/api/admin/sessions?${params}`);
      const data = await response.json();
      if (data.success) {
        setSessions(data.data.sessions);
        setStats(data.data.stats);
        setTotalPages(data.data.pagination.totalPages);
      } else {
        console.error('Failed to fetch sessions:', data.error);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: { [key: string]: { color: string; bg: string; text: string } } = {
      'PENDING': { color: '#f59e0b', bg: '#fef3c7', text: 'Pending' },
      'CONFIRMED': { color: '#3b82f6', bg: '#dbeafe', text: 'Confirmed' },
      'IN_PROGRESS': { color: '#8b5cf6', bg: '#ede9fe', text: 'In Progress' },
      'COMPLETED': { color: '#10b981', bg: '#d1fae5', text: 'Completed' },
      'CANCELLED': { color: '#ef4444', bg: '#fee2e2', text: 'Cancelled' }
    };

    const config = statusConfig[status] || { color: '#6b7280', bg: '#f3f4f6', text: status };
    
    return (
      <span
        style={{
          backgroundColor: config.bg,
          color: config.color,
          padding: '0.25rem 0.75rem',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: '600'
        }}
      >
        {config.text}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
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

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (loading) {
    return (
      <div className="admin-sessions-page">
        <div className="admin-loading">
          <div className="admin-spinner"></div>
          <p>Loading sessions...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="admin-sessions-page">
      {/* Header */}
      <div className="admin-sessions-header">
        <div className="admin-sessions-header-content">
          <div className="admin-sessions-header-left">
            <h1 className="admin-sessions-title">Super Admin: Session Management</h1>
            <p className="admin-sessions-subtitle">Review and manage all platform sessions (Super Admin)</p>
          </div>
          <div className="admin-sessions-header-right">
            <Link href="/super-admin" className="admin-back-btn">
              <i className="fas fa-arrow-left"></i>
              Back to Super Admin Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Section */}
      {stats && (
        <div className="admin-sessions-stats">
          <div className="stats-overview">
            <div className="stat-card primary">
              <div className="stat-icon">
                <i className="fas fa-calendar-check"></i>
              </div>
              <div className="stat-content">
                <div className="stat-value">{stats.totalSessions || 0}</div>
                <div className="stat-label">Total Sessions</div>
              </div>
            </div>
            <div className="stat-card success">
              <div className="stat-icon">
                <i className="fas fa-dollar-sign"></i>
              </div>
              <div className="stat-content">
                <div className="stat-value">₦{(stats.totalRevenue || 0).toLocaleString()}</div>
                <div className="stat-label">Total Revenue</div>
              </div>
            </div>
            <div className="stat-card info">
              <div className="stat-icon">
                <i className="fas fa-clock"></i>
              </div>
              <div className="stat-content">
                <div className="stat-value">{stats.todaySessions || 0}</div>
                <div className="stat-label">Today's Sessions</div>
              </div>
            </div>
          </div>
          
          <div className="status-breakdown">
            <h3>Status Breakdown</h3>
            <div className="status-grid">
              {stats.byStatus.map((stat) => (
                <div key={stat.status} className="status-item">
                  <span className="status-name">{stat.status}:</span>
                  <span className="status-count">{stat._count.id}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Filters */}
      <div className="admin-sessions-filters">
        <div className="filters-header">
          <h3>Search & Filter Sessions</h3>
          <button
            onClick={() => {
              setFilters({
                status: '',
                sessionType: '',
                paymentStatus: '',
                reviewStatus: '',
                tutorName: '',
                studentName: '',
                minDuration: '',
                maxDuration: '',
                tutorId: '',
                studentId: '',
                startDate: '',
                endDate: ''
              });
              setCurrentPage(1);
            }}
            className="filter-clear-btn"
          >
            <i className="fas fa-times"></i>
            Clear All
          </button>
        </div>
        
        <div className="filters-grid">
          <div className="filter-group">
            <label>Status:</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="filter-select"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>Session Type:</label>
            <select
              value={filters.sessionType || ''}
              onChange={(e) => handleFilterChange('sessionType', e.target.value)}
              className="filter-select"
            >
              <option value="">All Types</option>
              <option value="INSTANT">Instant</option>
              <option value="REGULAR">Regular</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>Payment Status:</label>
            <select
              value={filters.paymentStatus || ''}
              onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
              className="filter-select"
            >
              <option value="">All</option>
              <option value="PAID">Paid</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>Review Status:</label>
            <select
              value={filters.reviewStatus || ''}
              onChange={(e) => handleFilterChange('reviewStatus', e.target.value)}
              className="filter-select"
            >
              <option value="">All</option>
              <option value="REVIEWED">Reviewed</option>
              <option value="NOT_REVIEWED">Not Reviewed</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>Tutor:</label>
            <input
              type="text"
              value={filters.tutorName || ''}
              onChange={(e) => handleFilterChange('tutorName', e.target.value)}
              className="filter-input"
              placeholder="Tutor name or email"
            />
          </div>
          
          <div className="filter-group">
            <label>Student:</label>
            <input
              type="text"
              value={filters.studentName || ''}
              onChange={(e) => handleFilterChange('studentName', e.target.value)}
              className="filter-input"
              placeholder="Student name or email"
            />
          </div>
          
          <div className="filter-group duration-group">
            <label>Duration (min):</label>
            <div className="duration-inputs">
              <input
                type="number"
                value={filters.minDuration || ''}
                onChange={(e) => handleFilterChange('minDuration', e.target.value)}
                className="filter-input"
                placeholder="Min"
                min={0}
              />
              <span className="duration-separator">to</span>
              <input
                type="number"
                value={filters.maxDuration || ''}
                onChange={(e) => handleFilterChange('maxDuration', e.target.value)}
                className="filter-input"
                placeholder="Max"
                min={0}
              />
            </div>
          </div>
          
          <div className="filter-group date-group">
            <label>Date Range:</label>
            <div className="date-inputs">
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="filter-input"
              />
              <span className="date-separator">to</span>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="filter-input"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Sessions Table */}
      <div className="admin-sessions-table-container">
        <div className="table-header">
          <h3>Sessions ({sessions.length})</h3>
          <div className="table-actions">
            <button className="export-btn">
              <i className="fas fa-download"></i>
              Export Sessions
            </button>
            <button className="analytics-btn">
              <i className="fas fa-chart-bar"></i>
              Session Analytics
            </button>
          </div>
        </div>
        
        <div className="sessions-grid">
          {sessions.map((session) => (
            <div key={session.id} className="session-card">
              <div className="session-header">
                <div className="session-participants">
                  <div className="participant student">
                    <div className="participant-avatar">
                      {session.student.photo ? (
                        <img src={session.student.photo} alt={session.student.name} />
                      ) : (
                        <span>{getInitials(session.student.name)}</span>
                      )}
                    </div>
                    <div className="participant-info">
                      <div className="participant-name">{session.student.name}</div>
                      <div className="participant-role">Student</div>
                    </div>
                  </div>
                  
                  <div className="session-arrow">
                    <i className="fas fa-arrow-right"></i>
                  </div>
                  
                  <div className="participant tutor">
                    <div className="participant-avatar">
                      {session.tutor.photo ? (
                        <img src={session.tutor.photo} alt={session.tutor.name} />
                      ) : (
                        <span>{getInitials(session.tutor.name)}</span>
                      )}
                    </div>
                    <div className="participant-info">
                      <div className="participant-name">{session.tutor.name}</div>
                      <div className="participant-role">Tutor</div>
                    </div>
                  </div>
                </div>
                
                <div className="session-status">
                  {getStatusBadge(session.status)}
                </div>
              </div>
              
              <div className="session-details">
                <div className="detail-row">
                  <div className="detail-item">
                    <i className="fas fa-calendar"></i>
                    <span>{formatDate(session.scheduledAt)}</span>
                  </div>
                  <div className="detail-item">
                    <i className="fas fa-clock"></i>
                    <span>{formatDuration(session.duration)}</span>
                  </div>
                  <div className="detail-item">
                    <i className="fas fa-dollar-sign"></i>
                    <span>₦{session.price.toLocaleString()}</span>
                  </div>
                </div>
                
                {session.sessionType === 'INSTANT' && (
                  <div className="session-type-badge">
                    <i className="fas fa-bolt"></i>
                    Instant
                  </div>
                )}
              </div>
              
              <div className="session-metrics">
                <div className="metric">
                  <i className="fas fa-comments"></i>
                  <span>Messages: {session.sessionRecordings?.length || 0}</span>
                </div>
                <div className="metric">
                  <i className="fas fa-video"></i>
                  <span>Recordings: {session.sessionRecordings?.length || 0}</span>
                </div>
                <div className="metric">
                  <i className="fas fa-credit-card"></i>
                  <span>Payment: {session.paymentStatus === 'PAID' ? 'Paid' : 'Unpaid'}</span>
                </div>
                {session.review && (
                  <div className="metric">
                    <i className="fas fa-star"></i>
                    <span>Rating: {session.review.rating}/5</span>
                  </div>
                )}
              </div>
              
              <div className="session-actions">
                <Link
                  href={`/super-admin/sessions/${session.id}`}
                  className="action-btn view-btn"
                >
                  <i className="fas fa-eye"></i>
                  View Details
                </Link>
                {session.status === 'COMPLETED' && (
                  <Link
                    href={`/super-admin/sessions/${session.id}/review`}
                    className="action-btn review-btn"
                  >
                    <i className="fas fa-check-circle"></i>
                    Review
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>

        {sessions.length === 0 && (
          <div className="no-sessions">
            <i className="fas fa-inbox"></i>
            <p>No sessions found</p>
          </div>
        )}
      </div>

      {/* Enhanced Pagination */}
      {totalPages > 1 && (
        <div className="admin-sessions-pagination">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="pagination-btn"
          >
            <i className="fas fa-chevron-left"></i>
            Previous
          </button>
          
          <div className="pagination-info">
            <span>Page {currentPage} of {totalPages}</span>
          </div>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="pagination-btn"
          >
            Next
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>
      )}
    </div>
  );
}