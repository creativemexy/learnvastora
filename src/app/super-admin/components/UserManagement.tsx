"use client";

import React, { useState, useEffect } from 'react';
import './user-management.css';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
  lastSeen: string;
  photo?: string;
}

interface UserManagementProps {
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

export default function UserManagement({ showNotification }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Computed statistics with null safety
  const stats = React.useMemo(() => {
    const usersArray = Array.isArray(users) ? users : [];
    
    return {
      total: usersArray.length,
      tutors: usersArray.filter(u => u?.role === 'TUTOR').length,
      students: usersArray.filter(u => u?.role === 'STUDENT').length,
      admins: usersArray.filter(u => u?.role === 'ADMIN').length,
      active: usersArray.filter(u => u?.active === true).length,
      inactive: usersArray.filter(u => u?.active === false).length
    };
  }, [users]);

  // Fetch users
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Fetching users from API...');
      
      const response = await fetch('/api/super-admin/users', {
        method: 'GET',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('📊 Response status:', response.status);
      console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('📊 API Response data:', data);
      
      // Ensure data.data is an array
      const usersData = Array.isArray(data.data) ? data.data : [];
      
      console.log('👥 Users found:', usersData.length);
      
      setUsers(usersData);
      
      if (usersData.length === 0) {
        console.log('⚠️  No users found in response');
        showNotification('info', 'No users found');
      } else {
        console.log('✅ Users loaded successfully');
        showNotification('success', `Loaded ${usersData.length} users`);
      }
      
    } catch (error) {
      console.error('❌ Error fetching users:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch users');
      setUsers([]);
      showNotification('error', `Failed to fetch users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Filter users with robust error handling
  const filteredUsers = React.useMemo(() => {
    try {
      // Ensure users is an array
      const usersArray = Array.isArray(users) ? users : [];
      
      return usersArray.filter(user => {
        // Ensure user object exists and has required properties
        if (!user || typeof user !== 'object') {
          return false;
        }
        
        const userName = user.name || '';
        const userEmail = user.email || '';
        const userRole = user.role || '';
        const userActive = Boolean(user.active);
        
        const matchesSearch = userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             userEmail.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === 'all' || userRole === roleFilter.toUpperCase();
        const matchesStatus = statusFilter === 'all' || 
                             (statusFilter === 'active' && userActive) ||
                             (statusFilter === 'inactive' && !userActive);
        
        return matchesSearch && matchesRole && matchesStatus;
      });
    } catch (error) {
      console.error('Error filtering users:', error);
      return [];
    }
  }, [users, searchTerm, roleFilter, statusFilter]);

  // Get user initials
  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Get role color
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'bg-gradient-to-r from-purple-500 to-pink-500';
      case 'ADMIN': return 'bg-gradient-to-r from-blue-500 to-cyan-500';
      case 'TUTOR': return 'bg-gradient-to-r from-green-500 to-emerald-500';
      case 'STUDENT': return 'bg-gradient-to-r from-orange-500 to-red-500';
      default: return 'bg-gradient-to-r from-gray-500 to-gray-600';
    }
  };

  // Get status color
  const getStatusColor = (active: boolean) => {
    return active 
      ? 'bg-gradient-to-r from-green-400 to-emerald-400 text-white' 
      : 'bg-gradient-to-r from-red-400 to-pink-400 text-white';
  };

  // Handle user actions
  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    // Could open a detailed view modal here
    showNotification('info', `Viewing ${user.name}'s profile`);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const handleAddUser = () => {
    setShowAddModal(true);
  };

  const handleExportUsers = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Name,Email,Role,Status,Joined,Last Seen\n" +
      filteredUsers.map(user => 
        `${user.name},${user.email},${user.role},${user.active ? 'Active' : 'Inactive'},${user.createdAt},${user.lastSeen}`
      ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "users_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('success', 'Users exported successfully');
  };

  if (loading) {
    return (
      <div className="user-management-container">
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="user-management-container">
      {/* Header */}
      <div className="user-management-header">
        <h1 className="premium-heading">User Management</h1>
        <p className="premium-text text-secondary">
          Manage all platform users, roles, and permissions
        </p>
      </div>

      {/* Controls */}
      <div className="user-controls">
        <div className="control-left">
          <button 
            className="btn btn-primary"
            onClick={handleAddUser}
          >
            <span className="btn-icon">➕</span>
            Add User
          </button>
          
          <button 
            className="btn btn-secondary"
            onClick={handleExportUsers}
          >
            <span className="btn-icon">📤</span>
            Export
          </button>
        </div>

        <div className="control-center">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <span className="search-icon">🔍</span>
          </div>
        </div>

        <div className="control-right">
          <select 
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="tutor">Tutor</option>
            <option value="student">Student</option>
          </select>

          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="user-stats-grid">
        <div className="stat-card premium-hover">
          <div className="stat-icon users">👥</div>
          <div className="stat-content">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Users</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon tutors">👨‍🏫</div>
          <div className="stat-content">
            <div className="stat-value">{stats.tutors}</div>
            <div className="stat-label">Tutors</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon students">👨‍🎓</div>
          <div className="stat-content">
            <div className="stat-value">{stats.students}</div>
            <div className="stat-label">Students</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon admins">👨‍💼</div>
          <div className="stat-content">
            <div className="stat-value">{stats.admins}</div>
            <div className="stat-label">Admins</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon active">✅</div>
          <div className="stat-content">
            <div className="stat-value">{stats.active}</div>
            <div className="stat-label">Active Users</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon inactive">❌</div>
          <div className="stat-content">
            <div className="stat-value">{stats.inactive}</div>
            <div className="stat-label">Inactive Users</div>
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="users-list-container">
        <div className="users-list-header">
          <div className="list-header-item">User</div>
          <div className="list-header-item">Role</div>
          <div className="list-header-item">Status</div>
          <div className="list-header-item">Joined</div>
          <div className="list-header-item">Last Seen</div>
          <div className="list-header-item">Actions</div>
        </div>

        <div className="users-list">
          {filteredUsers.map((user) => (
            <div key={user.id} className="user-card premium-hover">
              <div className="user-info">
                <div className="user-avatar">
                  {user.photo ? (
                    <img src={user.photo} alt={user.name} className="avatar-image" />
                  ) : (
                    <div className={`avatar-initials ${getRoleColor(user.role)}`}>
                      {getUserInitials(user.name)}
                    </div>
                  )}
                </div>
                
                <div className="user-details">
                  <div className="user-name">{user.name}</div>
                  <div className="user-email">{user.email}</div>
                </div>
              </div>

              <div className="user-role">
                <span className={`role-badge ${getRoleColor(user.role)}`}>
                  {user.role.replace('_', ' ')}
                </span>
              </div>

              <div className="user-status">
                <span className={`status-badge ${getStatusColor(user.active)}`}>
                  {user.active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="user-joined">
                <div className="date-text">
                  {new Date(user.createdAt).toLocaleDateString()}
                </div>
              </div>

              <div className="user-last-seen">
                <div className="date-text">
                  {new Date(user.lastSeen).toLocaleString()}
                </div>
              </div>

              <div className="user-actions">
                <button 
                  className="action-btn view-btn"
                  onClick={() => handleViewUser(user)}
                  title="View User"
                >
                  👁️
                </button>
                
                <button 
                  className="action-btn edit-btn"
                  onClick={() => handleEditUser(user)}
                  title="Edit User"
                >
                  ✏️
                </button>
                
                <button 
                  className="action-btn delete-btn"
                  onClick={() => handleDeleteUser(user)}
                  title="Delete User"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <div className="empty-title">No users found</div>
            <div className="empty-description">
              Try adjusting your search or filter criteria
            </div>
          </div>
        )}
      </div>

      {/* Modals would go here */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Add New User</h2>
              <button 
                className="modal-close"
                onClick={() => setShowAddModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              {/* Add user form would go here */}
              <p className="premium-text">Add user form implementation</p>
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedUser && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Edit User: {selectedUser.name}</h2>
              <button 
                className="modal-close"
                onClick={() => setShowEditModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              {/* Edit user form would go here */}
              <p className="premium-text">Edit user form implementation</p>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && selectedUser && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Delete User</h2>
              <button 
                className="modal-close"
                onClick={() => setShowDeleteModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p className="premium-text">
                Are you sure you want to delete {selectedUser.name}? This action cannot be undone.
              </p>
              <div className="modal-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowDeleteModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-danger"
                  onClick={() => {
                    showNotification('success', `${selectedUser.name} deleted successfully`);
                    setShowDeleteModal(false);
                  }}
                >
                  Delete User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 