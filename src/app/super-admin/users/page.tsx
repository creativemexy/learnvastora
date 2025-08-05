"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import '../../admin/users/admin-users.css';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  isOnline: boolean;
  createdAt: string;
  photo?: string;
  tutorProfile?: {
    id: string;
    bio?: string;
    hourlyRate?: number;
    rating?: number;
    totalSessions?: number;
    isPro: boolean;
    isSupertutor: boolean;
  };
  _count: {
    bookingsAsStudent: number;
    bookingsAsTutor: number;
    reviewsGiven: number;
    reviewsReceived: number;
    notifications: number;
  };
}

interface UserStats {
  byRole: Array<{
    role: string;
    _count: { id: number };
  }>;
  byStatus: Array<{
    isActive: boolean;
    _count: { id: number };
  }>;
}

export default function SuperAdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
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
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STUDENT',
    isActive: true
  });

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/auth/signin");
      return;
    }

    // Check if user is a super admin
    if ((session.user as any)?.role !== "SUPER_ADMIN") {
      router.push("/");
      return;
    }

    fetchUsers();
  }, [session, status, router, currentPage, filters]);

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

  const openEditModal = (user: User) => {
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

  if (!session) {
    return null;
  }

  return (
    <div className="admin-users-page">
      {/* Header */}
      <div className="admin-users-header">
        <div className="admin-users-header-content">
          <div className="admin-users-header-left">
            <h1 className="admin-users-title">Super Admin: User Management</h1>
            <p className="admin-users-subtitle">Manage all platform users (Super Admin Access)</p>
          </div>
          <div className="admin-users-header-right">
            <button
              onClick={() => setShowCreateModal(true)}
              className="admin-create-btn"
            >
              <i className="fas fa-plus"></i>
              Create User
            </button>
            <Link href="/super-admin" className="admin-back-btn">
              <i className="fas fa-arrow-left"></i>
              Back to Super Admin
            </Link>
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
            {stats.byRole.map((stat) => (
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
                      disabled={user.id === (session.user as any).id}
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