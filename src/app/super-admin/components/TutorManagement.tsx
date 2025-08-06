"use client";

import React, { useState, useEffect } from 'react';
import './tutor-management.css';

interface Tutor {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
  tutorProfile?: {
    bio?: string;
    subjects?: string[];
    hourlyRate?: number;
    experience?: number;
    rating?: number;
    totalSessions?: number;
  };
}

const TutorManagement: React.FC = () => {
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Computed statistics with null safety
  const stats = React.useMemo(() => {
    const tutorsArray = Array.isArray(tutors) ? tutors : [];
    
    return {
      total: tutorsArray.length,
      active: tutorsArray.filter(t => t?.active === true).length,
      inactive: tutorsArray.filter(t => t?.active === false).length,
      newThisMonth: tutorsArray.filter(t => {
        const createdAt = new Date(t?.createdAt || '');
        const now = new Date();
        return createdAt.getMonth() === now.getMonth() && 
               createdAt.getFullYear() === now.getFullYear();
      }).length,
      averageRating: tutorsArray.reduce((sum, t) => sum + (t?.tutorProfile?.rating || 0), 0) / Math.max(tutorsArray.length, 1),
      totalSessions: tutorsArray.reduce((sum, t) => sum + (t?.tutorProfile?.totalSessions || 0), 0)
    };
  }, [tutors]);

  const fetchTutors = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Fetching tutors from API...');
      
      const response = await fetch('/api/super-admin/tutors', {
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
      const tutorsData = Array.isArray(data.data) ? data.data : [];
      
      console.log('👨‍🏫 Tutors found:', tutorsData.length);
      
      setTutors(tutorsData);
      
      if (tutorsData.length === 0) {
        console.log('⚠️  No tutors found in response');
        showNotification('info', 'No tutors found');
      } else {
        console.log('✅ Tutors loaded successfully');
        showNotification('success', `Loaded ${tutorsData.length} tutors`);
      }
      
    } catch (error) {
      console.error('❌ Error fetching tutors:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch tutors');
      setTutors([]);
      showNotification('error', `Failed to fetch tutors: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Filter tutors with robust error handling
  const filteredTutors = React.useMemo(() => {
    try {
      // Ensure tutors is an array
      const tutorsArray = Array.isArray(tutors) ? tutors : [];
      
      return tutorsArray.filter(tutor => {
        // Ensure tutor object exists and has required properties
        if (!tutor || typeof tutor !== 'object') {
          return false;
        }
        
        const tutorName = tutor.name || '';
        const tutorEmail = tutor.email || '';
        const tutorActive = Boolean(tutor.active);
        const tutorSubjects = tutor.tutorProfile?.subjects || [];
        
        const matchesSearch = tutorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             tutorEmail.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || 
                             (statusFilter === 'active' && tutorActive) ||
                             (statusFilter === 'inactive' && !tutorActive);
        const matchesSubject = subjectFilter === 'all' || 
                              tutorSubjects.some(subject => 
                                subject.toLowerCase().includes(subjectFilter.toLowerCase())
                              );
        
        return matchesSearch && matchesStatus && matchesSubject;
      });
    } catch (error) {
      console.error('Error filtering tutors:', error);
      return [];
    }
  }, [tutors, searchTerm, statusFilter, subjectFilter]);

  useEffect(() => {
    fetchTutors();
  }, []);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    // Simple console logging for now - this would be passed from parent component
    console.log(`${type.toUpperCase()}: ${message}`);
    
    // You can also add a simple alert for debugging
    if (type === 'error') {
      console.error('Tutor Management Error:', message);
    }
  };

  const handleEditTutor = (tutor: Tutor) => {
    setSelectedTutor(tutor);
    setShowEditModal(true);
  };

  const handleDeleteTutor = (tutor: Tutor) => {
    setSelectedTutor(tutor);
    setShowDeleteModal(true);
  };

  const handleStatusToggle = async (tutorId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/super-admin/tutors/${tutorId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ active: !currentStatus }),
      });

      if (response.ok) {
        showNotification('success', 'Tutor status updated successfully');
        fetchTutors();
      } else {
        showNotification('error', 'Failed to update tutor status');
      }
    } catch (error) {
      showNotification('error', 'Failed to update tutor status');
    }
  };

  if (loading) {
    return (
      <div className="tutor-management-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading tutors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tutor-management-container">
      {/* Header */}
      <div className="tutor-management-header">
        <h1 className="premium-heading">👨‍🏫 Tutor Management</h1>
        <p className="premium-text">Manage and monitor all tutors on the platform</p>
      </div>

      {/* Controls */}
      <div className="tutor-controls">
        <div className="control-left">
          <button 
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            <span className="btn-icon">➕</span>
            Add New Tutor
          </button>
          
          <button 
            className="btn btn-secondary"
            onClick={() => {
              showNotification('info', 'Export functionality coming soon');
            }}
          >
            <span className="btn-icon">📤</span>
            Export Tutors
          </button>
        </div>

        <div className="control-center">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search tutors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Subjects</option>
            <option value="math">Mathematics</option>
            <option value="science">Science</option>
            <option value="english">English</option>
            <option value="history">History</option>
            <option value="programming">Programming</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="tutor-stats-grid">
        <div className="stat-card premium-hover">
          <div className="stat-icon total">📊</div>
          <div className="stat-content">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Tutors</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon active">✅</div>
          <div className="stat-content">
            <div className="stat-value">{stats.active}</div>
            <div className="stat-label">Active Tutors</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon new">🆕</div>
          <div className="stat-content">
            <div className="stat-value">{stats.newThisMonth}</div>
            <div className="stat-label">New This Month</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon rating">⭐</div>
          <div className="stat-content">
            <div className="stat-value">{stats.averageRating.toFixed(1)}</div>
            <div className="stat-label">Avg Rating</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon sessions">🎯</div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalSessions}</div>
            <div className="stat-label">Total Sessions</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon inactive">⏸️</div>
          <div className="stat-content">
            <div className="stat-value">{stats.inactive}</div>
            <div className="stat-label">Inactive Tutors</div>
          </div>
        </div>
      </div>

      {/* Tutors List */}
      <div className="tutors-list-container">
        {loading ? (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <p>Loading tutors...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <div className="error-icon">⚠️</div>
            <div className="error-message">{error}</div>
            <button className="retry-btn" onClick={fetchTutors}>
              Retry
            </button>
          </div>
        ) : filteredTutors.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👨‍🏫</div>
            <h3 className="empty-title">No Tutors Found</h3>
            <p className="empty-subtitle">Try adjusting your search criteria or add a new tutor</p>
          </div>
        ) : (
          <>
            {/* List Header */}
            <div className="tutors-list-header">
              <div className="list-header-item">Tutor</div>
              <div className="list-header-item">Rating</div>
              <div className="list-header-item">Subjects</div>
              <div className="list-header-item">Rate</div>
              <div className="list-header-item">Sessions</div>
              <div className="list-header-item">Status</div>
              <div className="list-header-item">Actions</div>
            </div>

            {/* Tutors List */}
            <div className="tutors-list">
              {filteredTutors.map((tutor) => (
                <div key={tutor.id} className="tutor-card premium-hover">
                  {/* Tutor Info */}
                  <div className="tutor-info">
                    <div className="tutor-avatar">
                      {tutor.name.charAt(0).toUpperCase()}
                    </div>
                    
                    <div className="tutor-details">
                      <div className="tutor-name">{tutor.name}</div>
                      <div className="tutor-email">{tutor.email}</div>
                    </div>
                  </div>

                  {/* Rating */}
                  <div className="tutor-rating">
                    <div className="rating-stars">
                      ⭐ {tutor.tutorProfile?.rating || 0}
                    </div>
                  </div>

                  {/* Subjects */}
                  <div className="tutor-subjects">
                    {tutor.tutorProfile?.subjects && tutor.tutorProfile.subjects.length > 0 ? (
                      <div className="subjects-tags">
                        {tutor.tutorProfile.subjects.slice(0, 2).map((subject, index) => (
                          <span key={index} className="subject-tag">{subject}</span>
                        ))}
                        {tutor.tutorProfile.subjects.length > 2 && (
                          <span className="subject-tag more">+{tutor.tutorProfile.subjects.length - 2}</span>
                        )}
                      </div>
                    ) : (
                      <span className="no-subjects">No subjects</span>
                    )}
                  </div>

                  {/* Rate */}
                  <div className="tutor-rate">
                    ${tutor.tutorProfile?.hourlyRate || 0}/hr
                  </div>

                  {/* Sessions */}
                  <div className="tutor-sessions">
                    {tutor.tutorProfile?.totalSessions || 0} sessions
                  </div>

                  {/* Status */}
                  <div className="tutor-status">
                    <span className={`status-badge ${tutor.active ? 'active' : 'inactive'}`}>
                      {tutor.active ? '✅ Active' : '⏸️ Inactive'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="tutor-actions">
                    <button 
                      className="action-btn view-btn"
                      onClick={() => handleEditTutor(tutor)}
                      title="View Tutor"
                    >
                      👁️
                    </button>
                    
                    <button 
                      className="action-btn edit-btn"
                      onClick={() => handleEditTutor(tutor)}
                      title="Edit Tutor"
                    >
                      ✏️
                    </button>
                    
                    <button 
                      className="action-btn toggle-btn"
                      onClick={() => handleStatusToggle(tutor.id, tutor.active)}
                      title={tutor.active ? 'Deactivate Tutor' : 'Activate Tutor'}
                    >
                      {tutor.active ? '⏸️' : '✅'}
                    </button>
                    
                    <button 
                      className="action-btn delete-btn"
                      onClick={() => handleDeleteTutor(tutor)}
                      title="Delete Tutor"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modals would be implemented here */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-effect">
            <h3>Add New Tutor</h3>
            {/* Add tutor form would go here */}
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary">Add Tutor</button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedTutor && (
        <div className="modal-overlay">
          <div className="modal-content glass-effect">
            <h3>Edit Tutor: {selectedTutor.name}</h3>
            {/* Edit tutor form would go here */}
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && selectedTutor && (
        <div className="modal-overlay">
          <div className="modal-content glass-effect">
            <h3>Delete Tutor</h3>
            <p>Are you sure you want to delete {selectedTutor.name}? This action cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button className="btn btn-danger">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TutorManagement; 