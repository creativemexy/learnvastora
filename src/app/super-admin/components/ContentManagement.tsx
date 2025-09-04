'use client';

import { useState, useEffect } from 'react';
import './content-management.css';

interface TeachingResource {
  id: string;
  title: string;
  description: string;
  type: string;
  category: string;
  difficulty: string;
  duration: number;
  thumbnail?: string;
  url?: string;
  language: string;
  ageGroup: string;
  tags: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  stats: {
    downloads: number;
    favorites: number;
    averageRating: number;
    totalRatings: number;
  };
}

interface ContentStatistics {
  total: number;
  active: number;
  inactive: number;
  typeBreakdown: Array<{ type: string; _count: { id: number } }>;
  difficultyBreakdown: Array<{ difficulty: string; _count: { id: number } }>;
  ageGroupBreakdown: Array<{ ageGroup: string; _count: { id: number } }>;
  languageBreakdown: Array<{ language: string; _count: { id: number } }>;
}

interface ContentManagementProps {
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

export default function ContentManagement({ showNotification }: ContentManagementProps) {
  const [resources, setResources] = useState<TeachingResource[]>([]);
  const [statistics, setStatistics] = useState<ContentStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    type: '',
    difficulty: '',
    ageGroup: '',
    language: '',
    isActive: ''
  });
  const [selectedResource, setSelectedResource] = useState<TeachingResource | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const clearNewResource = () => {
    setFormError(null);
    (newResource as any)._file = undefined;
    setNewResource({
      title: '',
      description: '',
      type: '',
      category: '',
      difficulty: '',
      duration: 60,
      language: '',
      ageGroup: '',
      tags: [],
      thumbnail: '',
      url: '',
      subject: '',
      module: '',
      isActive: true
    } as any);
  };
  const [newResource, setNewResource] = useState({
    title: '',
    description: '',
    type: '',
    category: '',
    difficulty: '',
    duration: 60,
    language: '',
    ageGroup: '',
    tags: [] as string[],
    thumbnail: '',
    url: '',
    subject: '',
    module: '',
    isActive: true
  });
  const [editResource, setEditResource] = useState({
    title: '',
    description: '',
    type: '',
    category: '',
    difficulty: '',
    duration: 60,
    language: '',
    ageGroup: '',
    tags: [] as string[],
    thumbnail: '',
    url: '',
    subject: '',
    module: '',
    isActive: true
  });

  useEffect(() => {
    fetchContentData();
  }, [currentPage, searchTerm, filters]);

  const fetchContentData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        search: searchTerm,
        type: filters.type,
        difficulty: filters.difficulty,
        ageGroup: filters.ageGroup,
        language: filters.language,
        isActive: filters.isActive
      });

      const response = await fetch(`/api/admin/library?${params}`);
      const data = await response.json();

      if (data.success && data.data) {
        const mappedResources = (data.data.resources || []).map((r: any) => ({
          id: r.id,
          title: r.title,
          description: r.description,
          type: r.type,
          category: r.category,
          difficulty: r.difficulty,
          duration: r.duration,
          thumbnail: r.thumbnail,
          url: r.url,
          language: r.language,
          ageGroup: r.ageGroup,
          subject: r.subject || '',
          module: r.module || '',
          tags: r.tags || [],
          isActive: r.isActive,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          stats: {
            downloads: r.downloadCount ?? 0,
            favorites: r.favoriteCount ?? 0,
            averageRating: r.averageRating ?? 0,
            totalRatings: r.ratingCount ?? 0,
          },
        }));

        setResources(mappedResources);
        setTotalPages(data.data.pagination.totalPages);
      } else {
        showNotification('error', 'Failed to fetch content data');
        setResources([]);
        setStatistics(null);
      }
    } catch (error) {
      console.error('Error fetching content data:', error);
      showNotification('error', 'Network error while fetching content data');
      setResources([]);
      setStatistics(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateResource = async () => {
    try {
      setFormError(null);

      // Basic client-side validation aligned with API
      if (!newResource.title.trim()) return setFormError('Title is required');
      if (!newResource.description.trim()) return setFormError('Description is required');
      if (!newResource.type) return setFormError('Type is required');
      if (!newResource.difficulty) return setFormError('Difficulty is required');
      if (!newResource.language.trim()) return setFormError('Language is required');
      if (!newResource.ageGroup) return setFormError('Age Group is required');
      if (!newResource.duration || Number.isNaN(newResource.duration) || newResource.duration <= 0) {
        return setFormError('Duration must be a positive number');
      }

      // Validate file if present
      const file = (newResource as any)._file as File | undefined;
      if (file) {
        const maxSize = 15 * 1024 * 1024; // 15MB
        const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowed.includes(file.type)) {
          return setFormError('File type not allowed. Use PDF, JPG, PNG, GIF, or WebP.');
        }
        if (file.size > maxSize) {
          return setFormError('File too large. Max size is 15MB.');
        }
      }

      const formData = new FormData();
      Object.entries(newResource).forEach(([key, value]) => {
        if (key === 'tags') {
          formData.append('tags', JSON.stringify(value));
        } else if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });
      if (file instanceof File) {
        formData.append('file', file);
      }

      const response = await fetch('/api/admin/library', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        showNotification('success', 'Resource created successfully');
        setShowAddModal(false);
        setNewResource({
          title: '',
          description: '',
          type: '',
          category: '',
          difficulty: '',
          duration: 60,
          language: '',
          ageGroup: '',
          tags: [],
          thumbnail: '',
          url: '',
          subject: '',
          module: '',
          isActive: true
        } as any);
        // Clear any selected file
        (newResource as any)._file = undefined;
        fetchContentData();
      } else {
        showNotification('error', data.message || 'Failed to create resource');
      }
    } catch (error) {
      console.error('Error creating resource:', error);
      showNotification('error', 'Network error while creating resource');
    }
  };

  const handleUpdateResource = async () => {
    if (!selectedResource) return;

    try {
      const response = await fetch(`/api/super-admin/content/${selectedResource.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editResource),
      });

      const data = await response.json();

      if (data.success) {
        showNotification('success', 'Resource updated successfully');
        setShowEditModal(false);
        setSelectedResource(null);
        fetchContentData();
      } else {
        showNotification('error', data.message || 'Failed to update resource');
      }
    } catch (error) {
      console.error('Error updating resource:', error);
      showNotification('error', 'Network error while updating resource');
    }
  };

  const handleDeleteResource = async () => {
    if (!selectedResource) return;

    try {
      const response = await fetch(`/api/super-admin/content/${selectedResource.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        showNotification('success', 'Resource deleted successfully');
        setShowDeleteModal(false);
        setSelectedResource(null);
        fetchContentData();
      } else {
        showNotification('error', data.message || 'Failed to delete resource');
      }
    } catch (error) {
      console.error('Error deleting resource:', error);
      showNotification('error', 'Network error while deleting resource');
    }
  };

  const handleEditClick = (resource: TeachingResource) => {
    setSelectedResource(resource);
    setEditResource({
      title: resource.title,
      description: resource.description,
      type: resource.type,
      category: resource.category,
      difficulty: resource.difficulty,
      duration: resource.duration,
      language: resource.language,
      ageGroup: resource.ageGroup,
      tags: resource.tags,
      thumbnail: resource.thumbnail || '',
      url: resource.url || '',
      subject: (resource as any).subject || '',
      module: (resource as any).module || '',
      isActive: resource.isActive
    });
    setShowEditModal(true);
  };

  const handleAddClick = () => {
    setNewResource({
      title: '',
      description: '',
      type: '',
      category: '',
      difficulty: '',
      duration: 60,
      language: '',
      ageGroup: '',
      tags: [],
      thumbnail: '',
      url: '',
      subject: '',
      module: '',
      isActive: true
    });
    setShowAddModal(true);
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? 'active' : 'inactive';
  };

  const getTypeIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      'LESSON_PLAN': '📋',
      'WORKSHEET': '📝',
      'VIDEO': '🎥',
      'PRESENTATION': '📊',
      'QUIZ': '❓',
      'GAME': '🎮',
      'TEMPLATE': '📄',
      'GUIDE': '📖',
      'AUDIO': '🎵',
      'INTERACTIVE': '🔄'
    };
    return icons[type] || '📚';
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors: { [key: string]: string } = {
      'BEGINNER': 'beginner',
      'INTERMEDIATE': 'intermediate',
      'ADVANCED': 'advanced'
    };
    return colors[difficulty] || 'beginner';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  return (
    <div className="content-management-container">
      {/* Header */}
      <div className="content-management-header">
        <h1 className="premium-heading">📚 Content Management</h1>
        <p className="premium-text">Manage and organize all teaching resources and content</p>
      </div>

      {/* Content Statistics */}
      {statistics && (
        <div className="content-stats-grid">
          <div className="content-stat-card premium-hover">
            <div className="content-stat-icon">📚</div>
            <div className="content-stat-value">{formatNumber(statistics.total)}</div>
            <div className="content-stat-label">Total Resources</div>
          </div>
          <div className="content-stat-card premium-hover">
            <div className="content-stat-icon">✅</div>
            <div className="content-stat-value">{formatNumber(statistics.active)}</div>
            <div className="content-stat-label">Active Resources</div>
          </div>
          <div className="content-stat-card premium-hover">
            <div className="content-stat-icon">⏸️</div>
            <div className="content-stat-value">{formatNumber(statistics.inactive)}</div>
            <div className="content-stat-label">Inactive Resources</div>
          </div>
          <div className="content-stat-card premium-hover">
            <div className="content-stat-icon">📊</div>
            <div className="content-stat-value">{statistics.typeBreakdown.length}</div>
            <div className="content-stat-label">Resource Types</div>
          </div>
        </div>
      )}

      {/* Content Controls */}
      <div className="content-controls">
        <div className="control-left">
          <button 
            className="control-btn"
            onClick={handleAddClick}
          >
            <span className="btn-icon">➕</span>
            Add Resource
          </button>
          
          <button 
            className="control-btn"
            onClick={() => fetchContentData()}
          >
            <span className="btn-icon">🔄</span>
            Refresh
          </button>
        </div>
        
        <div className="control-right">
          <div className="search-container">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search resources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="filter-select"
          >
            <option value="">All Types</option>
            <option value="LESSON_PLAN">Lesson Plan</option>
            <option value="WORKSHEET">Worksheet</option>
            <option value="VIDEO">Video</option>
            <option value="PRESENTATION">Presentation</option>
            <option value="QUIZ">Quiz</option>
            <option value="GAME">Game</option>
            <option value="TEMPLATE">Template</option>
            <option value="GUIDE">Guide</option>
            <option value="AUDIO">Audio</option>
            <option value="INTERACTIVE">Interactive</option>
          </select>
          
          <select
            value={filters.difficulty}
            onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
            className="filter-select"
          >
            <option value="">All Difficulties</option>
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
          </select>
          
          <select
            value={filters.isActive}
            onChange={(e) => setFilters({ ...filters, isActive: e.target.value })}
            className="filter-select"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>

      {/* Content List */}
      {loading ? (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Loading resources...</p>
        </div>
      ) : resources.length > 0 ? (
        <>
          <div className="resources-grid">
            {resources.map((resource) => (
              <div key={resource.id} className="resource-card premium-hover">
                <div className="resource-header">
                  <div className="resource-icon">
                    {getTypeIcon(resource.type)}
                  </div>
                  <div className="resource-title">{resource.title}</div>
                  <div className="resource-type">{resource.type.replace('_', ' ')}</div>
                  <div className="resource-description">{resource.description}</div>
                  
                  <div className="resource-meta">
                    <div className="meta-item">
                      <span className="meta-label">Duration:</span>
                      <span className="meta-value">{resource.duration} min</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Language:</span>
                      <span className="meta-value">{resource.language}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Age Group:</span>
                      <span className="meta-value">{resource.ageGroup}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Difficulty:</span>
                      <span className={`difficulty-badge ${getDifficultyColor(resource.difficulty)}`}>
                        {resource.difficulty}
                      </span>
                    </div>
                  </div>
                  
                  <div className="resource-stats">
                    <div className="stat-item">
                      <span className="stat-icon">⬇️</span>
                      <span className="stat-value">{formatNumber(resource.stats.downloads)}</span>
                      <span className="stat-label">Downloads</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-icon">⭐</span>
                      <span className="stat-value">{resource.stats.averageRating.toFixed(1)}</span>
                      <span className="stat-label">Rating</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-icon">❤️</span>
                      <span className="stat-value">{formatNumber(resource.stats.favorites)}</span>
                      <span className="stat-label">Favorites</span>
                    </div>
                  </div>
                </div>
                
                <div className="resource-footer">
                  <div className="resource-status">
                    <span className={`status-badge ${getStatusBadge(resource.isActive)}`}>
                      {resource.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className="meta-value">{formatDate(resource.createdAt)}</span>
                  </div>
                  
                  <div className="resource-actions">
                    <button
                      className="resource-action-btn"
                      onClick={() => handleEditClick(resource)}
                      title="Edit Resource"
                    >
                      ✏️
                    </button>
                    <button
                      className="resource-action-btn"
                      onClick={() => {
                        setSelectedResource(resource);
                        setShowDeleteModal(true);
                      }}
                      title="Delete Resource"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
              
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">📚</div>
          <h3 className="empty-title">No Resources Found</h3>
          <p className="empty-subtitle">No teaching resources match your current filters</p>
        </div>
      )}

      {/* Add Resource Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Add New Resource</h2>
            <div className="modal-form">
              {formError && (
                <div className="error-message" style={{ marginBottom: '12px', color: 'var(--danger, #d11)' }}>
                  {formError}
                </div>
              )}
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={newResource.title}
                  onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                  placeholder="Enter resource title"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Description *</label>
                <textarea
                  value={newResource.description}
                  onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                  placeholder="Enter resource description"
                  rows={3}
                  required
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Type *</label>
                  <select
                    value={newResource.type}
                    onChange={(e) => setNewResource({ ...newResource, type: e.target.value })}
                    required
                  >
                    <option value="">Select Type</option>
                    <option value="LESSON_PLAN">Lesson Plan</option>
                    <option value="WORKSHEET">Worksheet</option>
                    <option value="VIDEO">Video</option>
                    <option value="PRESENTATION">Presentation</option>
                    <option value="QUIZ">Quiz</option>
                    <option value="GAME">Game</option>
                    <option value="TEMPLATE">Template</option>
                    <option value="GUIDE">Guide</option>
                    <option value="AUDIO">Audio</option>
                    <option value="INTERACTIVE">Interactive</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Category</label>
                  <input
                    type="text"
                    value={newResource.category}
                    onChange={(e) => setNewResource({ ...newResource, category: e.target.value })}
                    placeholder="Enter category"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Subject</label>
                  <input
                    type="text"
                    value={(newResource as any).subject}
                    onChange={(e) => setNewResource({ ...newResource, subject: e.target.value } as any)}
                    placeholder="e.g., English, Math, Science"
                  />
                </div>
                <div className="form-group">
                  <label>Module</label>
                  <input
                    type="text"
                    value={(newResource as any).module}
                    onChange={(e) => setNewResource({ ...newResource, module: e.target.value } as any)}
                    placeholder="e.g., Module 1: Basics"
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Difficulty *</label>
                  <select
                    value={newResource.difficulty}
                    onChange={(e) => setNewResource({ ...newResource, difficulty: e.target.value })}
                    required
                  >
                    <option value="">Select Difficulty</option>
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Duration (minutes) *</label>
                  <input
                    type="number"
                    value={newResource.duration}
                    onChange={(e) => setNewResource({ ...newResource, duration: parseInt(e.target.value) || 0 })}
                    min="1"
                    required
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Language *</label>
                  <input
                    type="text"
                    value={newResource.language}
                    onChange={(e) => setNewResource({ ...newResource, language: e.target.value })}
                    placeholder="e.g., English"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Age Group *</label>
                  <select
                    value={newResource.ageGroup}
                    onChange={(e) => setNewResource({ ...newResource, ageGroup: e.target.value })}
                    required
                  >
                    <option value="">Select Age Group</option>
                    <option value="KIDS">Kids</option>
                    <option value="TEENS">Teens</option>
                    <option value="ADULTS">Adults</option>
                    <option value="ALL">All</option>
                  </select>
                </div>
              </div>
              
              <div className="form-group">
                <label>Thumbnail URL</label>
                <input
                  type="url"
                  value={newResource.thumbnail}
                  onChange={(e) => setNewResource({ ...newResource, thumbnail: e.target.value })}
                  placeholder="Enter thumbnail URL"
                />
              </div>
              
              <div className="form-group">
                <label>Resource URL</label>
                <input
                  type="url"
                  value={newResource.url}
                  onChange={(e) => setNewResource({ ...newResource, url: e.target.value })}
                  placeholder="Enter resource URL"
                />
              </div>

              <div className="form-group">
                <label>Or Upload File (PDF, JPG, PNG)</label>
                <input
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/jpg,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setNewResource({ ...(newResource as any), _file: file } as any);
                    }
                  }}
                />
                {(newResource as any)._file && (
                  <div className="file-chip" style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{(newResource as any)._file?.name}</span>
                    <button
                      type="button"
                      className="modal-btn secondary"
                      onClick={() => {
                        (newResource as any)._file = undefined;
                        setNewResource({ ...(newResource as any) });
                      }}
                    >
                      Remove File
                    </button>
                  </div>
                )}
              </div>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={newResource.isActive}
                    onChange={(e) => setNewResource({ ...newResource, isActive: e.target.checked })}
                  />
                  Active Resource
                </label>
              </div>
            </div>
            
            <div className="modal-actions">
              <button 
                className="modal-btn secondary"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </button>
              <button
                className="modal-btn secondary"
                onClick={clearNewResource}
                title="Clear all fields"
              >
                Clear
              </button>
              <button 
                className="modal-btn primary"
                onClick={handleCreateResource}
                disabled={!newResource.title || !newResource.description || !newResource.type || !newResource.difficulty || !newResource.language || !newResource.ageGroup || !newResource.duration}
              >
                Create Resource
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Resource Modal */}
      {showEditModal && selectedResource && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Edit Resource</h2>
            <div className="modal-form">
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={editResource.title}
                  onChange={(e) => setEditResource({ ...editResource, title: e.target.value })}
                  placeholder="Enter resource title"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Description *</label>
                <textarea
                  value={editResource.description}
                  onChange={(e) => setEditResource({ ...editResource, description: e.target.value })}
                  placeholder="Enter resource description"
                  rows={3}
                  required
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Type *</label>
                  <select
                    value={editResource.type}
                    onChange={(e) => setEditResource({ ...editResource, type: e.target.value })}
                    required
                  >
                    <option value="">Select Type</option>
                    <option value="LESSON_PLAN">Lesson Plan</option>
                    <option value="WORKSHEET">Worksheet</option>
                    <option value="VIDEO">Video</option>
                    <option value="PRESENTATION">Presentation</option>
                    <option value="QUIZ">Quiz</option>
                    <option value="GAME">Game</option>
                    <option value="TEMPLATE">Template</option>
                    <option value="GUIDE">Guide</option>
                    <option value="AUDIO">Audio</option>
                    <option value="INTERACTIVE">Interactive</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Category</label>
                  <input
                    type="text"
                    value={editResource.category}
                    onChange={(e) => setEditResource({ ...editResource, category: e.target.value })}
                    placeholder="Enter category"
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Difficulty *</label>
                  <select
                    value={editResource.difficulty}
                    onChange={(e) => setEditResource({ ...editResource, difficulty: e.target.value })}
                    required
                  >
                    <option value="">Select Difficulty</option>
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Duration (minutes) *</label>
                  <input
                    type="number"
                    value={editResource.duration}
                    onChange={(e) => setEditResource({ ...editResource, duration: parseInt(e.target.value) || 0 })}
                    min="1"
                    required
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Language *</label>
                  <input
                    type="text"
                    value={editResource.language}
                    onChange={(e) => setEditResource({ ...editResource, language: e.target.value })}
                    placeholder="e.g., English"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Age Group *</label>
                  <select
                    value={editResource.ageGroup}
                    onChange={(e) => setEditResource({ ...editResource, ageGroup: e.target.value })}
                    required
                  >
                    <option value="">Select Age Group</option>
                    <option value="KIDS">Kids</option>
                    <option value="TEENS">Teens</option>
                    <option value="ADULTS">Adults</option>
                    <option value="ALL">All</option>
                  </select>
                </div>
              </div>
              
              <div className="form-group">
                <label>Thumbnail URL</label>
                <input
                  type="url"
                  value={editResource.thumbnail}
                  onChange={(e) => setEditResource({ ...editResource, thumbnail: e.target.value })}
                  placeholder="Enter thumbnail URL"
                />
              </div>
              
              <div className="form-group">
                <label>Resource URL</label>
                <input
                  type="url"
                  value={editResource.url}
                  onChange={(e) => setEditResource({ ...editResource, url: e.target.value })}
                  placeholder="Enter resource URL"
                />
              </div>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={editResource.isActive}
                    onChange={(e) => setEditResource({ ...editResource, isActive: e.target.checked })}
                  />
                  Active Resource
                </label>
              </div>
            </div>
            
            <div className="modal-actions">
              <button 
                className="modal-btn secondary"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </button>
              <button 
                className="modal-btn primary"
                onClick={handleUpdateResource}
                disabled={!editResource.title || !editResource.description || !editResource.type || !editResource.difficulty || !editResource.language || !editResource.ageGroup}
              >
                Update Resource
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Resource Modal */}
      {showDeleteModal && selectedResource && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Delete Resource</h2>
            <p>Are you sure you want to delete &quot;{selectedResource.title}&quot;?</p>
            <p className="warning-text">This action cannot be undone.</p>
            <div className="modal-actions">
              <button 
                className="modal-btn secondary"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button 
                className="modal-btn danger"
                onClick={handleDeleteResource}
              >
                Delete Resource
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 