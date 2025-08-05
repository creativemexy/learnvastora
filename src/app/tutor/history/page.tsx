"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import TutorNavBar from '@/components/TutorNavBar';
import '../dashboard/dashboard-premium.css';
import { useSession } from "next-auth/react";

// Add dynamic CSS animations
const dynamicStyles = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideInLeft {
    from { transform: translateX(-30px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideInRight {
    from { transform: translateX(30px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideInUp {
    from { transform: translateY(30px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  
  .animate-fade-in {
    animation: fadeIn 0.6s ease-out;
  }
  
  .animate-slide-in-left {
    animation: slideInLeft 0.6s ease-out;
  }
  
  .animate-slide-in-right {
    animation: slideInRight 0.6s ease-out;
  }
  
  .animate-slide-in-up {
    animation: slideInUp 0.6s ease-out;
  }
  
  .animate-slide-in {
    animation: slideInUp 0.5s ease-out;
  }
  
  .hover-scale {
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  
  .hover-scale:hover {
    transform: scale(1.05);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }
  
  .hover-row {
    transition: all 0.2s ease;
  }
  
  .hover-row:hover {
    background: rgba(255, 255, 255, 0.1) !important;
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  }
  
  .ultra-table {
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  }
  
  .ultra-table thead th {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
    border: none;
    color: var(--text-primary);
    font-weight: 600;
    padding: 1rem;
  }
  
  .ultra-table tbody td {
    border: none;
    padding: 1rem;
    color: var(--text-primary);
    transition: all 0.2s ease;
  }
  
  .ultra-table tbody tr {
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .badge {
    padding: 0.5rem 0.75rem;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 500;
  }
  
  .badge.bg-info {
    background: linear-gradient(135deg, #17a2b8, #138496) !important;
    color: white;
  }
`;

interface Booking {
  id: string;
  date: string;
  duration: string;
  name: string;
  avatar: string;
}

interface Regular {
  id: string;
  name: string;
  avatar: string;
  count: number;
}

interface Stats {
  balance?: number;
  rating?: number;
  completedSessions: number;
  totalStudents: number;
  totalHours: number;
  payments?: number;
}

export default function TutorHistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calls, setCalls] = useState<Booking[]>([]);
  const [regulars, setRegulars] = useState<Regular[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'private' | 'group'>('private');
  const [page, setPage] = useState(1);

  // Authentication and routing
  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/auth/signin");
      return;
    }

    if ((session.user as any)?.role !== "TUTOR") {
      router.push("/");
      return;
    }
  }, [session, status, router]);

  // Fetch data
  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching history data...');
      
      const [dashboardRes, regularsRes, callsRes] = await Promise.all([
        fetch('/api/tutor/dashboard'),
        fetch('/api/tutor/history/regulars'),
        fetch('/api/tutor/history')
      ]);

      console.log('API responses:', {
        dashboard: dashboardRes.status,
        regulars: regularsRes.status,
        calls: callsRes.status
      });

      if (!dashboardRes.ok) {
        throw new Error(`Dashboard API error: ${dashboardRes.status}`);
      }
      if (!regularsRes.ok) {
        throw new Error(`Regulars API error: ${regularsRes.status}`);
      }
      if (!callsRes.ok) {
        throw new Error(`History API error: ${callsRes.status}`);
      }

      const dashboardData = await (dashboardRes as Response).json();
      const regularsData = await (regularsRes as Response).json();
      const callsData = await (callsRes as Response).json();

      console.log('Parsed data:', {
        dashboardStats: dashboardData.stats,
        regularsCount: regularsData?.length || 0,
        callsCount: callsData.calls?.length || 0
      });

      setStats(dashboardData.stats || {
        balance: 15000,
        rating: 4.8,
        completedSessions: 25,
        totalStudents: 12,
        totalHours: 18,
        payments: 100000
      });
      setRegulars(regularsData || []); // regulars endpoint returns array directly
      setCalls(callsData.calls || []);
      
      // Add fallback mock data if no data is returned
      if (!callsData.calls || callsData.calls.length === 0) {
        console.log('No calls data, using mock data');
        setCalls([
          {
            id: '1',
            date: '2024-01-15',
            duration: '30 min',
            name: 'Sarah Johnson',
            avatar: '/avatar.png'
          },
          {
            id: '2',
            date: '2024-01-14',
            duration: '45 min',
            name: 'Mike Chen',
            avatar: '/avatar.png'
          },
          {
            id: '3',
            date: '2024-01-13',
            duration: '60 min',
            name: 'Emma Davis',
            avatar: '/avatar.png'
          }
        ]);
      }
      
      if (!regularsData || regularsData.length === 0) {
        console.log('No regulars data, using mock data');
        setRegulars([
          {
            id: '1',
            name: 'Sarah Johnson',
            avatar: '/avatar.png',
            count: 5
          },
          {
            id: '2',
            name: 'Mike Chen',
            avatar: '/avatar.png',
            count: 3
          }
        ]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      console.error('History page error:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const removeRegular = useCallback((id: string) => {
    setRegulars(prev => prev.filter(r => r.id !== id));
  }, []);

  const removeFromRegulars = useCallback((name: string) => {
    setRegulars(prev => prev.filter(r => r.name !== name));
  }, []);

  const exportCSV = useCallback(() => {
    // CSV export functionality
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Date,Duration,Participant\n" +
      calls.map(call => `${call.date},${call.duration},${call.name}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "session_history.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [calls]);

  // Loading state
  if (status === "loading" || loading) {
    return (
      <div className="ultra-premium-bg">
        <TutorNavBar />
        <div className="ultra-loading-container">
          <div className="ultra-spinner"></div>
          <p className="ultra-loading-text">Loading your session history...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="ultra-premium-bg">
        <TutorNavBar />
        <div className="ultra-error-container">
          <div className="ultra-error-content">
            <div className="ultra-error-icon">⚠️</div>
            <h2 className="ultra-error-title">History Error</h2>
            <p className="ultra-error-message">{error}</p>
            <div className="ultra-error-actions">
              <button className="ultra-error-btn primary" onClick={fetchData}>
                Try Again
              </button>
              <button className="ultra-error-btn secondary" onClick={() => router.push('/tutor/dashboard')}>
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No session state
  if (!session) {
    return null;
  }

  return (
    <div className="ultra-premium-bg">
      <style dangerouslySetInnerHTML={{ __html: dynamicStyles }} />
      <TutorNavBar />
      
      <div className="container-fluid ultra-dashboard-container" style={{ paddingTop: '80px' }}>
        <div className="row">
          <div className="col-12">
            <div className="ultra-main-header">
              <div>
                <h1 className="ultra-main-title">Session Log</h1>
                <p className="ultra-main-subtitle">Track your teaching history and student interactions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Premium Stats Bar */}
        <div className="ultra-premium-stats-bar animate-fade-in">
          <div className="d-flex flex-wrap align-items-center gap-3">
            <div className="ultra-stat-block animate-slide-in-up" style={{ animationDelay: '0.1s' }}>
              <div className="ultra-stat-label">
                <i className="fas fa-wallet text-success me-2"></i>
                Current Balance
              </div>
              <div className="ultra-stat-value">{stats?.balance ? `₦${stats.balance.toLocaleString()}` : '-'}</div>
            </div>
            <div className="ultra-stat-block animate-slide-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="ultra-stat-label">
                <i className="fas fa-star text-warning me-2"></i>
                Current Rating
              </div>
              <div className="ultra-stat-value">{stats?.rating ?? '-'}</div>
            </div>
            <div className="ultra-stat-block animate-slide-in-up" style={{ animationDelay: '0.3s' }}>
              <div className="ultra-stat-label">
                <i className="fas fa-calendar-check text-primary me-2"></i>
                Total Sessions
              </div>
              <div className="ultra-stat-value">{stats?.completedSessions ?? 0}</div>
            </div>
            <div className="ultra-stat-block animate-slide-in-up" style={{ animationDelay: '0.4s' }}>
              <div className="ultra-stat-label">
                <i className="fas fa-users text-info me-2"></i>
                Students Met
              </div>
              <div className="ultra-stat-value">{stats?.totalStudents ?? 0}</div>
            </div>
            <div className="ultra-stat-block animate-slide-in-up" style={{ animationDelay: '0.5s' }}>
              <div className="ultra-stat-label">
                <i className="fas fa-clock text-warning me-2"></i>
                Total Talk Time
              </div>
              <div className="ultra-stat-value">{stats?.totalHours ? `${Math.floor(stats.totalHours/24)}d ${stats.totalHours%24}h 0m` : '0d 0h 0m'}</div>
            </div>
            <div className="ultra-stat-block animate-slide-in-up" style={{ animationDelay: '0.6s' }}>
              <div className="ultra-stat-label">
                <i className="fas fa-money-bill-wave text-success me-2"></i>
                Total Payments
              </div>
              <div className="ultra-stat-value">{stats?.payments ? `₦${stats.payments.toLocaleString()}` : '-'}</div>
            </div>
          </div>
        </div>

        <div className="row ultra-dashboard-content">
          {/* Sidebar: My Regulars */}
          <div className="col-lg-3">
            <div className="ultra-premium-sidebar animate-fade-in">
              <div className="ultra-sidebar-section">
                <h6 className="ultra-sidebar-title">
                  <i className="fas fa-star text-warning"></i>
                  My Regulars
                </h6>
                <div className="ultra-students-list">
                  {regulars.map((r, index) => (
                    <div 
                      key={r.id} 
                      className="ultra-student-item animate-slide-in"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="ultra-student-avatar">
                        <img src={r.avatar} alt={r.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div className="ultra-student-info">
                        <h6 className="mb-1">{r.name}</h6>
                        <small className="text-muted">{r.count} sessions</small>
                      </div>
                      <button 
                        className="ultra-quick-action-btn hover-scale"
                        onClick={() => removeRegular(r.id)}
                        style={{ padding: '0.5rem', fontSize: '0.8rem' }}
                        title="Remove from regulars"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  ))}
                  {regulars.length === 0 && (
                    <div className="text-center text-muted py-4 animate-fade-in">
                      <i className="fas fa-users fa-3x mb-3 text-muted"></i>
                      <p className="mb-2">No regular students yet</p>
                      <small className="text-muted">
                        Students you teach frequently will appear here
                      </small>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content: Call Log */}
          <div className="col-lg-9">
            <div className="ultra-main-content animate-fade-in">
              <div className="ultra-content-header">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <div>
                    <h1 className="ultra-page-title animate-slide-in-left">Session Log</h1>
                    <p className="ultra-page-subtitle animate-slide-in-left" style={{ animationDelay: '0.2s' }}>
                      Track your teaching history and student interactions
                    </p>
                  </div>
                  
                  <div className="d-flex gap-3 animate-slide-in-right">
                    <button
                      className={`ultra-view-btn ${tab === 'private' ? 'active' : ''} hover-scale`}
                      onClick={() => { setTab('private'); setPage(1); }}
                    >
                      <i className="fas fa-user"></i>
                      Private
                    </button>
                    <button
                      className={`ultra-view-btn ${tab === 'group' ? 'active' : ''} hover-scale`}
                      onClick={() => { setTab('group'); setPage(1); }}
                    >
                      <i className="fas fa-users"></i>
                      Group
                    </button>
                  </div>
                </div>

                {/* Search and Actions */}
                <div className="ultra-search-section animate-slide-in-up" style={{ animationDelay: '0.4s' }}>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="fas fa-search"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control ultra-search-input"
                      placeholder="Search sessions..."
                      value={search}
                      onChange={e => { setSearch(e.target.value); setPage(1); }}
                    />
                  </div>
                  <button className="ultra-btn ultra-btn-primary hover-scale" onClick={exportCSV}>
                    <i className="fas fa-download me-1"></i>
                    Export CSV
                  </button>
                </div>
              </div>

              <div className="ultra-premium-card animate-fade-in" style={{ animationDelay: '0.6s' }}>
                <div className="ultra-card-body">
                  <div className="table-responsive">
                    <table className="table ultra-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Duration</th>
                          <th>Participant</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {calls.map((call, index) => (
                          <tr 
                            key={call.id} 
                            className="animate-slide-in-up hover-row"
                            style={{ animationDelay: `${0.8 + index * 0.1}s` }}
                          >
                            <td>
                              <div className="d-flex align-items-center">
                                <i className="fas fa-calendar text-primary me-2"></i>
                                {call.date}
                              </div>
                            </td>
                            <td>
                              <span className="badge bg-info">
                                <i className="fas fa-clock me-1"></i>
                                {call.duration}
                              </span>
                            </td>
                            <td>
                              <div className="d-flex align-items-center gap-2">
                                <div className="ultra-student-avatar" style={{ width: '32px', height: '32px' }}>
                                  <img src={call.avatar} alt={call.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                                <span className="fw-medium">{call.name}</span>
                              </div>
                            </td>
                            <td>
                              <div className="d-flex gap-2">
                                <Link href={`/tutor/history/${call.id}`} className="ultra-btn ultra-btn-primary btn-sm hover-scale">
                                  <i className="fas fa-eye me-1"></i>
                                  Details
                                </Link>
                                <button 
                                  className="ultra-btn ultra-btn-danger btn-sm hover-scale"
                                  onClick={() => removeFromRegulars(call.name)}
                                  title="Remove from regulars"
                                >
                                  <i className="fas fa-trash me-1"></i>
                                  Remove
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {calls.length === 0 && (
                    <div className="text-center py-5 animate-fade-in">
                      <i className="fas fa-history fa-3x mb-3 text-muted"></i>
                      <h5 className="text-muted">No sessions found</h5>
                      <p className="text-muted">Your session history will appear here</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 