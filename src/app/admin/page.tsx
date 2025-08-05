"use client";

export const dynamic = 'force-dynamic';

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import './admin-dashboard.css';
import './admin-users.css';
import './admin-components.css';

interface AdminStats {
  totalUsers: number;
  totalTutors: number;
  totalStudents: number;
  totalSessions: number;
  totalRevenue: number;
  activeUsers: number;
  pendingApprovals: number;
  systemHealth: string;
}

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  user?: string;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useTranslation();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/auth/signin");
      return;
    }

    // Check if user is an admin
    if ((session.user as any)?.role !== "ADMIN") {
      router.push("/");
      return;
    }

    fetchAdminData();

    // Set up auto-refresh every 5 minutes
    const interval = setInterval(fetchAdminData, 300000);

    return () => clearInterval(interval);
  }, [session, status, router]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      
      // Fetch admin statistics
      const statsResponse = await fetch('/api/admin/analytics?type=overview&period=30d');
      const statsData = await statsResponse.json();
      
      // Fetch pending approvals (tutors awaiting approval)
      const pendingResponse = await fetch('/api/admin/pending-approvals');
      const pendingData = await pendingResponse.json();
      
      // Fetch recent activity
      const activityResponse = await fetch('/api/admin/recent-activity');
      const activityData = await activityResponse.json();
      
      if (statsData.success) {
        setStats({
          totalUsers: statsData.data.totalUsers,
          totalTutors: statsData.data.totalTutors,
          totalStudents: statsData.data.totalStudents,
          totalSessions: statsData.data.totalSessions,
          totalRevenue: statsData.data.totalRevenue,
          activeUsers: statsData.data.activeUsers,
          pendingApprovals: pendingData.success ? pendingData.count : 0,
          systemHealth: 'Healthy'
        });
      }

      if (activityData.success) {
        setRecentActivity(activityData.activities);
      } else {
        // Fallback to empty array if API fails
        setRecentActivity([]);
      }

    } catch (error) {
      console.error('Error fetching admin data:', error);
      // Set fallback data on error
      setStats({
        totalUsers: 0,
        totalTutors: 0,
        totalStudents: 0,
        totalSessions: 0,
        totalRevenue: 0,
        activeUsers: 0,
        pendingApprovals: 0,
        systemHealth: 'Unknown'
      });
      setRecentActivity([]);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_registration': return '👤';
      case 'session_completed': return '✅';
      case 'payment_processed': return '💰';
      case 'system_alert': return '⚠️';
      default: return '📝';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60 * 1000) return 'Just now';
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}m ago`;
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}h ago`;
    return date.toLocaleDateString();
  };

  if (status === "loading" || loading) {
    return (
      <div className="admin-dashboard">
        <div className="admin-loading">
          <div className="admin-spinner"></div>
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="admin-dashboard">
      {/* Admin Header */}
      <div className="admin-header">
        <div className="admin-header-content">
          <div className="admin-header-left">
            <h1 className="admin-title">Admin Dashboard</h1>
            <p className="admin-subtitle">Manage the LearnVastora platform</p>
          </div>
          <div className="admin-header-right">
            <div className="admin-user-info">
              <div className="admin-avatar">
                {session.user?.name?.[0] || 'A'}
              </div>
              <div className="admin-user-details">
                <div className="admin-user-name">{session.user?.name}</div>
                <div className="admin-user-role">Administrator</div>
              </div>
            </div>
            
            <button 
              onClick={fetchAdminData}
              className="admin-refresh-btn"
              disabled={loading}
            >
              <i className="fas fa-sync-alt"></i>
              Refresh
            </button>
            
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
                boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)',
                marginLeft: '1rem'
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.transform = 'translateY(-2px)';
                (e.target as HTMLElement).style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.4)';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.transform = 'translateY(0)';
                (e.target as HTMLElement).style.boxShadow = '0 4px 15px rgba(239, 68, 68, 0.3)';
              }}
            >
              <span>🚪</span>
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="admin-container">
        {/* Quick Stats */}
        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <div className="admin-stat-icon">👥</div>
            <div className="admin-stat-content">
              <div className="admin-stat-value">{stats?.totalUsers || 0}</div>
              <div className="admin-stat-label">Total Users</div>
            </div>
          </div>
          
          <div className="admin-stat-card">
            <div className="admin-stat-icon">👨‍🏫</div>
            <div className="admin-stat-content">
              <div className="admin-stat-value">{stats?.totalTutors || 0}</div>
              <div className="admin-stat-label">Active Tutors</div>
            </div>
          </div>
          
          <div className="admin-stat-card">
            <div className="admin-stat-icon">📚</div>
            <div className="admin-stat-content">
              <div className="admin-stat-value">{stats?.totalSessions || 0}</div>
              <div className="admin-stat-label">Total Sessions</div>
            </div>
          </div>
          
                      <div className="admin-stat-card">
              <div className="admin-stat-icon">💰</div>
              <div className="admin-stat-content">
                <div className="admin-stat-value">${stats?.totalRevenue?.toLocaleString() || 0}</div>
                <div className="admin-stat-label">Total Revenue</div>
              </div>
            </div>
            
            <div className="admin-stat-card">
              <div className="admin-stat-icon">📊</div>
              <div className="admin-stat-content">
                <div className="admin-stat-value">{stats?.totalSessions || 0}</div>
                <div className="admin-stat-label">Total Sessions</div>
              </div>
            </div>
          
          <div className="admin-stat-card">
            <div className="admin-stat-icon">🟢</div>
            <div className="admin-stat-content">
              <div className="admin-stat-value">{stats?.activeUsers || 0}</div>
              <div className="admin-stat-label">Active Users</div>
            </div>
          </div>
          
          <div className="admin-stat-card">
            <div className="admin-stat-icon">⏳</div>
            <div className="admin-stat-content">
              <div className="admin-stat-value">{stats?.pendingApprovals || 0}</div>
              <div className="admin-stat-label">Pending Approvals</div>
            </div>
          </div>
        </div>

        {/* Admin Navigation */}
        <div className="admin-nav-tabs">
          <button 
            className={`admin-nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <i className="fas fa-tachometer-alt"></i>
            Overview
          </button>
          <button 
            className={`admin-nav-tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <i className="fas fa-users"></i>
            User Management
          </button>
          <button 
            className={`admin-nav-tab ${activeTab === 'sessions' ? 'active' : ''}`}
            onClick={() => setActiveTab('sessions')}
          >
            <i className="fas fa-calendar-alt"></i>
            Sessions
          </button>
          <button 
            className={`admin-nav-tab ${activeTab === 'financial' ? 'active' : ''}`}
            onClick={() => setActiveTab('financial')}
          >
            <i className="fas fa-dollar-sign"></i>
            Financial
          </button>
          <button 
            className={`admin-nav-tab ${activeTab === 'system' ? 'active' : ''}`}
            onClick={() => setActiveTab('system')}
          >
            <i className="fas fa-cog"></i>
            System
          </button>
        </div>

        {/* Tab Content */}
        <div className="admin-content">
          {activeTab === 'overview' && (
            <div className="admin-overview">
              <div className="admin-content-grid">
                {/* Quick Actions */}
                <div className="admin-card">
                  <div className="admin-card-header">
                    <h3>Quick Actions</h3>
                  </div>
                  <div className="admin-card-body">
                    <div className="admin-actions-grid">
                      <Link href="/admin/analytics" className="admin-action-btn">
                        <i className="fas fa-chart-line"></i>
                        View Analytics
                      </Link>
                      <Link href="/admin/users" className="admin-action-btn">
                        <i className="fas fa-user-cog"></i>
                        Manage Users
                      </Link>
                      <Link href="/admin/sessions" className="admin-action-btn">
                        <i className="fas fa-calendar-check"></i>
                        View Sessions
                      </Link>
                      <Link href="/admin/payments" className="admin-action-btn">
                        <i className="fas fa-credit-card"></i>
                        Payment History
                      </Link>
                      <Link href="/admin/reports" className="admin-action-btn">
                        <i className="fas fa-file-alt"></i>
                        Generate Reports
                      </Link>
                      <Link href="/admin/settings" className="admin-action-btn">
                        <i className="fas fa-cogs"></i>
                        System Settings
                      </Link>
                      <Link href="/super-admin" className="admin-action-btn">
                        <i className="fas fa-crown"></i>
                        Super Admin
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="admin-card">
                  <div className="admin-card-header">
                    <h3>Recent Activity</h3>
                    <Link href="/admin/activity" className="admin-card-link">View All</Link>
                  </div>
                  <div className="admin-card-body">
                    <div className="admin-activity-list">
                      {recentActivity.map((activity) => (
                        <div key={activity.id} className="admin-activity-item">
                          <div className="admin-activity-icon">
                            {getActivityIcon(activity.type)}
                          </div>
                          <div className="admin-activity-content">
                            <div className="admin-activity-description">
                              {activity.description}
                            </div>
                            <div className="admin-activity-meta">
                              {activity.user && <span className="admin-activity-user">{activity.user}</span>}
                              <span className="admin-activity-time">{formatTimestamp(activity.timestamp)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* System Health */}
                <div className="admin-card">
                  <div className="admin-card-header">
                    <h3>System Health</h3>
                  </div>
                  <div className="admin-card-body">
                    <div className="admin-health-status">
                      <div className={`admin-health-indicator ${stats?.systemHealth === 'Healthy' ? 'healthy' : 'warning'}`}>
                        <div className="admin-health-dot"></div>
                        <span>{stats?.systemHealth || 'Unknown'}</span>
                      </div>
                      <div className="admin-health-metrics">
                        <div className="admin-health-metric">
                          <span className="admin-health-label">Database</span>
                          <span className="admin-health-value">Connected</span>
                        </div>
                        <div className="admin-health-metric">
                          <span className="admin-health-label">API</span>
                          <span className="admin-health-value">Online</span>
                        </div>
                        <div className="admin-health-metric">
                          <span className="admin-health-label">Payments</span>
                          <span className="admin-health-value">Active</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <AdminUserManagement />
          )}

          {activeTab === 'sessions' && (
            <AdminSessionManagement />
          )}

          {activeTab === 'financial' && (
            <AdminFinancialManagement />
          )}

          {activeTab === 'system' && (
            <AdminSystemManagement />
          )}
        </div>
      </div>
    </div>
  );
}

// AdminUserManagement Component
function AdminUserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    role: '',
    status: '',
    search: '',
    startDate: '',
    endDate: ''
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STUDENT',
    isActive: true
  });

  useEffect(() => {
    fetchUsers();
  }, [currentPage, filters]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...filters
      });

      const response = await fetch(`/api/admin/users?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setUsers(data.data.users);
        setStats(data.data.stats);
        setTotalPages(data.data.pagination.totalPages);
      } else {
        console.error('Failed to fetch users:', data.error);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (data.success) {
        alert('User created successfully!');
        setShowCreateModal(false);
        setFormData({
          name: '',
          email: '',
          password: '',
          role: 'STUDENT',
          isActive: true
        });
        fetchUsers();
      } else {
        alert('Failed to create user: ' + data.error);
      }
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Failed to create user');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser) return;
    
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedUser.id,
          ...formData
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        alert('User updated successfully!');
        setShowEditModal(false);
        setSelectedUser(null);
        setFormData({
          name: '',
          email: '',
          password: '',
          role: 'STUDENT',
          isActive: true
        });
        fetchUsers();
      } else {
        alert('Failed to update user: ' + data.error);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/admin/users?id=${userId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        alert('User deleted successfully!');
        fetchUsers();
      } else {
        alert('Failed to delete user: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  const openEditModal = (user: any) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '', // Don't populate password
      role: user.role,
      isActive: user.isActive
    });
    setShowEditModal(true);
  };

  const getRoleBadge = (role: string) => {
    const roleConfig: { [key: string]: { color: string; bg: string; text: string } } = {
      'STUDENT': { color: '#3b82f6', bg: '#dbeafe', text: 'Student' },
      'TUTOR': { color: '#10b981', bg: '#d1fae5', text: 'Tutor' },
      'ADMIN': { color: '#f59e0b', bg: '#fef3c7', text: 'Admin' },
      'SUPER_ADMIN': { color: '#8b5cf6', bg: '#ede9fe', text: 'Super Admin' }
    };

    const config = roleConfig[role] || { color: '#6b7280', bg: '#f3f4f6', text: role };
    
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

  const getStatusBadge = (isActive: boolean) => {
    return (
      <span
        style={{
          backgroundColor: isActive ? '#d1fae5' : '#fee2e2',
          color: isActive ? '#10b981' : '#ef4444',
          padding: '0.25rem 0.75rem',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: '600'
        }}
      >
        {isActive ? 'Active' : 'Inactive'}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="admin-users-page">
        <div className="admin-loading">
          <div className="admin-spinner"></div>
          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-users-page">
      {/* Header */}
      <div className="admin-users-header">
        <div className="admin-users-header-content">
          <div className="admin-users-header-left">
            <h1 className="admin-users-title">User Management</h1>
            <p className="admin-users-subtitle">Manage all platform users</p>
          </div>
          <div className="admin-users-header-right">
            <button
              onClick={() => setShowCreateModal(true)}
              className="admin-create-btn"
            >
              <i className="fas fa-plus"></i>
              Create User
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="admin-users-filters">
        <div className="filter-group">
          <label>Role:</label>
          <select
            value={filters.role}
            onChange={(e) => handleFilterChange('role', e.target.value)}
            className="filter-select"
          >
            <option value="">All Roles</option>
            <option value="STUDENT">Student</option>
            <option value="TUTOR">Tutor</option>
            <option value="ADMIN">Admin</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Status:</label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="filter-select"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Search:</label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            placeholder="Name or email..."
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <label>Date Range:</label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
            className="filter-input"
          />
          <span>to</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
            className="filter-input"
          />
        </div>

        <button
          onClick={() => {
            setFilters({
              role: '',
              status: '',
              search: '',
              startDate: '',
              endDate: ''
            });
            setCurrentPage(1);
          }}
          className="filter-clear-btn"
        >
          Clear Filters
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="admin-users-stats">
          <div className="stats-grid">
            {stats.byRole.map((stat: any) => (
              <div key={stat.role} className="stat-card">
                <div className="stat-value">{stat._count.id}</div>
                <div className="stat-label">{stat.role}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="admin-users-table-container">
        <table className="admin-users-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Activity</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <div className="user-info">
                    <div className="user-avatar">
                      {user.photo ? (
                        <img src={user.photo} alt={user.name} />
                      ) : (
                        <span>{user.name[0]}</span>
                      )}
                    </div>
                    <div className="user-details">
                      <div className="user-name">{user.name}</div>
                      <div className="user-email">{user.email}</div>
                      {user.tutorProfile && (
                        <div className="user-tutor-info">
                          {user.tutorProfile.isPro && <span className="badge pro">Pro</span>}
                          {user.tutorProfile.isSupertutor && <span className="badge super">Super</span>}
                          {user.tutorProfile.rating && (
                            <span className="rating">⭐ {user.tutorProfile.rating}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td>{getRoleBadge(user.role)}</td>
                <td>{getStatusBadge(user.isActive)}</td>
                <td>{formatDate(user.createdAt)}</td>
                <td>
                  <div className="activity-stats">
                    <span>Bookings: {user._count.bookingsAsStudent + user._count.bookingsAsTutor}</span>
                    <span>Reviews: {user._count.reviewsGiven + user._count.reviewsReceived}</span>
                  </div>
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      onClick={() => openEditModal(user)}
                      className="action-btn edit-btn"
                    >
                      <i className="fas fa-edit"></i>
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="action-btn delete-btn"
                    >
                      <i className="fas fa-trash"></i>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="no-users">
            <i className="fas fa-users"></i>
            <p>No users found</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="admin-users-pagination">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="pagination-btn"
          >
            <i className="fas fa-chevron-left"></i>
            Previous
          </button>
          
          <span className="pagination-info">
            Page {currentPage} of {totalPages}
          </span>
          
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

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Create New User</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="modal-close"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="modal-form">
              <div className="form-group">
                <label>Name:</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Password:</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  required
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Role:</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                  required
                  className="form-select"
                >
                  <option value="STUDENT">Student</option>
                  <option value="TUTOR">Tutor</option>
                  <option value="ADMIN">Admin</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  />
                  Active
                </label>
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn-primary">
                  Create User
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Edit User</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="modal-close"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleUpdateUser} className="modal-form">
              <div className="form-group">
                <label>Name:</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Password (leave blank to keep current):</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Role:</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                  required
                  className="form-select"
                >
                  <option value="STUDENT">Student</option>
                  <option value="TUTOR">Tutor</option>
                  <option value="ADMIN">Admin</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  />
                  Active
                </label>
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn-primary">
                  Update User
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// AdminSessionManagement Component
function AdminSessionManagement() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    status: '',
    sessionType: '',
    paymentStatus: '',
    reviewStatus: '',
    tutorNameOrEmail: '',
    studentNameOrEmail: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    fetchSessions();
  }, [currentPage, filters]);

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
      'IN_PROGRESS': { color: '#10b981', bg: '#d1fae5', text: 'In Progress' },
      'COMPLETED': { color: '#059669', bg: '#d1fae5', text: 'Completed' },
      'CANCELLED': { color: '#dc2626', bg: '#fee2e2', text: 'Cancelled' }
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

  return (
    <div className="admin-sessions-page">
      {/* Header */}
      <div className="admin-sessions-header">
        <div className="admin-sessions-header-content">
          <div className="admin-sessions-header-left">
            <h1 className="admin-sessions-title">Session Management</h1>
            <p className="admin-sessions-subtitle">Manage and review all platform sessions</p>
          </div>
          <div className="admin-sessions-header-right">
            <Link href="/admin/sessions" className="admin-view-all-btn">
              <i className="fas fa-external-link-alt"></i>
              View Full Page
            </Link>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="admin-sessions-filters">
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
            value={filters.sessionType}
            onChange={(e) => handleFilterChange('sessionType', e.target.value)}
            className="filter-select"
          >
            <option value="">All Types</option>
            <option value="INSTANT">Instant</option>
            <option value="SCHEDULED">Scheduled</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Payment Status:</label>
          <select
            value={filters.paymentStatus}
            onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
            className="filter-select"
          >
            <option value="">All Payments</option>
            <option value="PENDING">Pending</option>
            <option value="PAID">Paid</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Search:</label>
          <input
            type="text"
            value={filters.tutorNameOrEmail}
            onChange={(e) => handleFilterChange('tutorNameOrEmail', e.target.value)}
            placeholder="Tutor name or email..."
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <label>Date Range:</label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
            className="filter-input"
          />
          <span>to</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
            className="filter-input"
          />
        </div>

        <button
          onClick={() => {
            setFilters({
              status: '',
              sessionType: '',
              paymentStatus: '',
              reviewStatus: '',
              tutorNameOrEmail: '',
              studentNameOrEmail: '',
              startDate: '',
              endDate: ''
            });
            setCurrentPage(1);
          }}
          className="filter-clear-btn"
        >
          Clear Filters
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="admin-sessions-stats">
          <div className="stats-grid">
            {stats.byStatus.map((stat: any) => (
              <div key={stat.status} className="stat-card">
                <div className="stat-value">{stat._count.id}</div>
                <div className="stat-label">{stat.status}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sessions Table */}
      <div className="admin-sessions-table-container">
        <table className="admin-sessions-table">
          <thead>
            <tr>
              <th>Session</th>
              <th>Tutor</th>
              <th>Student</th>
              <th>Date & Time</th>
              <th>Duration</th>
              <th>Status</th>
              <th>Price</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id}>
                <td>
                  <div className="session-info">
                    <div className="session-id">#{session.id.slice(-8)}</div>
                    <div className="session-type">{session.sessionType}</div>
                  </div>
                </td>
                <td>
                  <div className="user-info">
                    <div className="user-avatar">
                      {session.tutor?.photo ? (
                        <img src={session.tutor.photo} alt={session.tutor.name} />
                      ) : (
                        <span>{session.tutor?.name?.[0] || 'T'}</span>
                      )}
                    </div>
                    <div className="user-details">
                      <div className="user-name">{session.tutor?.name}</div>
                      <div className="user-email">{session.tutor?.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="user-info">
                    <div className="user-avatar">
                      {session.student?.photo ? (
                        <img src={session.student.photo} alt={session.student.name} />
                      ) : (
                        <span>{session.student?.name?.[0] || 'S'}</span>
                      )}
                    </div>
                    <div className="user-details">
                      <div className="user-name">{session.student?.name}</div>
                      <div className="user-email">{session.student?.email}</div>
                    </div>
                  </div>
                </td>
                <td>{formatDate(session.scheduledAt)}</td>
                <td>{formatDuration(session.duration)}</td>
                <td>{getStatusBadge(session.status)}</td>
                <td>₦{session.price?.toLocaleString()}</td>
                <td>
                  <div className="action-buttons">
                    <Link href={`/admin/sessions/${session.id}/review`} className="action-btn view-btn">
                      <i className="fas fa-eye"></i>
                      Review
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sessions.length === 0 && (
          <div className="no-sessions">
            <i className="fas fa-calendar-alt"></i>
            <p>No sessions found</p>
          </div>
        )}
      </div>

      {/* Pagination */}
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
          
          <span className="pagination-info">
            Page {currentPage} of {totalPages}
          </span>
          
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

// AdminFinancialManagement Component
function AdminFinancialManagement() {
  const [financialData, setFinancialData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');

  useEffect(() => {
    fetchFinancialData();
  }, [selectedPeriod]);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/admin/financial?period=${selectedPeriod}`);
      const data = await response.json();
      
      if (data.success) {
        setFinancialData(data.data);
      } else {
        console.error('Failed to fetch financial data:', data.error);
      }
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="admin-financial-page">
        <div className="admin-loading">
          <div className="admin-spinner"></div>
          <p>Loading financial data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-financial-page">
      {/* Header */}
      <div className="admin-financial-header">
        <div className="admin-financial-header-content">
          <div className="admin-financial-header-left">
            <h1 className="admin-financial-title">Financial Overview</h1>
            <p className="admin-financial-subtitle">Monitor platform revenue and financial metrics</p>
          </div>
          <div className="admin-financial-header-right">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="period-select"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
            </select>
            <button className="admin-export-btn">
              <i className="fas fa-download"></i>
              Export Report
            </button>
          </div>
        </div>
      </div>

      {/* Financial Stats */}
      <div className="admin-financial-stats">
        <div className="stats-grid">
          <div className="stat-card revenue">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <div className="stat-value">{formatCurrency(financialData?.totalRevenue || 0)}</div>
              <div className="stat-label">Total Revenue</div>
              <div className="stat-change positive">
                {formatPercentage(financialData?.revenueGrowth || 0)}
              </div>
            </div>
          </div>
          
          <div className="stat-card transactions">
            <div className="stat-icon">💳</div>
            <div className="stat-content">
              <div className="stat-value">{financialData?.totalTransactions || 0}</div>
              <div className="stat-label">Total Transactions</div>
              <div className="stat-change positive">
                {formatPercentage(financialData?.transactionGrowth || 0)}
              </div>
            </div>
          </div>
          
          <div className="stat-card average">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-value">{formatCurrency(financialData?.averageTransaction || 0)}</div>
              <div className="stat-label">Average Transaction</div>
              <div className="stat-change neutral">
                {formatPercentage(financialData?.averageGrowth || 0)}
              </div>
            </div>
          </div>
          
          <div className="stat-card pending">
            <div className="stat-icon">⏳</div>
            <div className="stat-content">
              <div className="stat-value">{formatCurrency(financialData?.pendingAmount || 0)}</div>
              <div className="stat-label">Pending Payments</div>
              <div className="stat-change negative">
                {financialData?.pendingCount || 0} payments
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="admin-financial-chart">
        <div className="chart-header">
          <h3>Revenue Trend</h3>
          <div className="chart-legend">
            <span className="legend-item">
              <span className="legend-color revenue"></span>
              Revenue
            </span>
            <span className="legend-item">
              <span className="legend-color transactions"></span>
              Transactions
            </span>
          </div>
        </div>
        <div className="chart-placeholder">
          <i className="fas fa-chart-line"></i>
          <p>Revenue chart will be displayed here</p>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="admin-financial-transactions">
        <div className="transactions-header">
          <h3>Recent Transactions</h3>
          <Link href="/admin/transactions" className="view-all-link">
            View All
          </Link>
        </div>
        <div className="transactions-list">
          {(financialData?.recentTransactions || []).map((transaction: any) => (
            <div key={transaction.id} className="transaction-item">
              <div className="transaction-info">
                <div className="transaction-user">
                  <div className="user-avatar">
                    {transaction.user?.photo ? (
                      <img src={transaction.user.photo} alt={transaction.user.name} />
                    ) : (
                      <span>{transaction.user?.name?.[0] || 'U'}</span>
                    )}
                  </div>
                  <div className="user-details">
                    <div className="user-name">{transaction.user?.name}</div>
                    <div className="transaction-type">{transaction.type}</div>
                  </div>
                </div>
                <div className="transaction-amount">
                  <div className="amount">{formatCurrency(transaction.amount)}</div>
                  <div className="status">{transaction.status}</div>
                </div>
                <div className="transaction-date">
                  {new Date(transaction.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// AdminSystemManagement Component
function AdminSystemManagement() {
  const [systemSettings, setSystemSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSystemSettings();
  }, []);

  const fetchSystemSettings = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/admin/system-settings');
      const data = await response.json();
      
      if (data.success) {
        setSystemSettings(data.settings);
      } else {
        console.error('Failed to fetch system settings:', data.error);
      }
    } catch (error) {
      console.error('Error fetching system settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key: string, value: any) => {
    setSystemSettings((prev: any) => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      
      const response = await fetch('/api/admin/system-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(systemSettings),
      });

      const data = await response.json();
      
      if (data.success) {
        alert('System settings saved successfully!');
      } else {
        alert('Failed to save settings: ' + data.error);
      }
    } catch (error) {
      console.error('Error saving system settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-system-page">
        <div className="admin-loading">
          <div className="admin-spinner"></div>
          <p>Loading system settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-system-page">
      {/* Header */}
      <div className="admin-system-header">
        <div className="admin-system-header-content">
          <div className="admin-system-header-left">
            <h1 className="admin-system-title">System Settings</h1>
            <p className="admin-system-subtitle">Configure platform settings and preferences</p>
          </div>
          <div className="admin-system-header-right">
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="admin-save-btn"
            >
              <i className="fas fa-save"></i>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="admin-system-sections">
        {/* General Settings */}
        <div className="settings-section">
          <h3>General Settings</h3>
          <div className="settings-grid">
            <div className="setting-item">
              <label>Platform Name</label>
              <input
                type="text"
                value={systemSettings.platformName || 'LearnVastora'}
                onChange={(e) => handleSettingChange('platformName', e.target.value)}
                className="setting-input"
              />
            </div>
            
            <div className="setting-item">
              <label>Support Email</label>
              <input
                type="email"
                value={systemSettings.supportEmail || 'support@learnvastora.com'}
                onChange={(e) => handleSettingChange('supportEmail', e.target.value)}
                className="setting-input"
              />
            </div>
            
            <div className="setting-item">
              <label>Default Currency</label>
              <select
                value={systemSettings.defaultCurrency || 'NGN'}
                onChange={(e) => handleSettingChange('defaultCurrency', e.target.value)}
                className="setting-select"
              >
                <option value="NGN">Nigerian Naira (₦)</option>
                <option value="USD">US Dollar ($)</option>
                <option value="EUR">Euro (€)</option>
              </select>
            </div>
            
            <div className="setting-item">
              <label>Session Duration (minutes)</label>
              <input
                type="number"
                value={systemSettings.defaultSessionDuration || 30}
                onChange={(e) => handleSettingChange('defaultSessionDuration', parseInt(e.target.value))}
                className="setting-input"
                min="15"
                max="120"
              />
            </div>
          </div>
        </div>

        {/* Payment Settings */}
        <div className="settings-section">
          <h3>Payment Settings</h3>
          <div className="settings-grid">
            <div className="setting-item">
              <label>Minimum Withdrawal Amount</label>
              <input
                type="number"
                value={systemSettings.minWithdrawalAmount || 1000}
                onChange={(e) => handleSettingChange('minWithdrawalAmount', parseInt(e.target.value))}
                className="setting-input"
                min="100"
              />
            </div>
            
            <div className="setting-item">
              <label>Platform Fee (%)</label>
              <input
                type="number"
                value={systemSettings.platformFee || 10}
                onChange={(e) => handleSettingChange('platformFee', parseFloat(e.target.value))}
                className="setting-input"
                min="0"
                max="50"
                step="0.1"
              />
            </div>
            
            <div className="setting-item">
              <label>Payment Gateway</label>
              <select
                value={systemSettings.paymentGateway || 'paystack'}
                onChange={(e) => handleSettingChange('paymentGateway', e.target.value)}
                className="setting-select"
              >
                <option value="paystack">Paystack</option>
                <option value="flutterwave">Flutterwave</option>
                <option value="stripe">Stripe</option>
              </select>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="settings-section">
          <h3>Security Settings</h3>
          <div className="settings-grid">
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={systemSettings.requireEmailVerification || false}
                  onChange={(e) => handleSettingChange('requireEmailVerification', e.target.checked)}
                />
                Require Email Verification
              </label>
            </div>
            
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={systemSettings.enableTwoFactor || false}
                  onChange={(e) => handleSettingChange('enableTwoFactor', e.target.checked)}
                />
                Enable Two-Factor Authentication
              </label>
            </div>
            
            <div className="setting-item">
              <label>Session Timeout (minutes)</label>
              <input
                type="number"
                value={systemSettings.sessionTimeout || 30}
                onChange={(e) => handleSettingChange('sessionTimeout', parseInt(e.target.value))}
                className="setting-input"
                min="5"
                max="480"
              />
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="settings-section">
          <h3>Notification Settings</h3>
          <div className="settings-grid">
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={systemSettings.enableEmailNotifications || true}
                  onChange={(e) => handleSettingChange('enableEmailNotifications', e.target.checked)}
                />
                Enable Email Notifications
              </label>
            </div>
            
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={systemSettings.enablePushNotifications || true}
                  onChange={(e) => handleSettingChange('enablePushNotifications', e.target.checked)}
                />
                Enable Push Notifications
              </label>
            </div>
            
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={systemSettings.enableSMSNotifications || false}
                  onChange={(e) => handleSettingChange('enableSMSNotifications', e.target.checked)}
                />
                Enable SMS Notifications
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 