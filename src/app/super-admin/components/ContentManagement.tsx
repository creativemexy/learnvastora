'use client';

import { useState, useEffect } from 'react';

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

      const response = await fetch(`/api/super-admin/content?${params}`);
      const data = await response.json();

      if (data.success && data.data) {
        setResources(data.data.resources);
        setStatistics(data.data.statistics);
        setTotalPages(data.data.pagination.totalPages);
      } else {
        showNotification('error', 'Failed to fetch content data');
      }
    } catch (error) {
      console.error('Error fetching content data:', error);
      showNotification('error', 'Network error while fetching content data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateResource = async () => {
    try {
      const response = await fetch('/api/super-admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newResource)
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
          isActive: true
        });
        fetchContentData();
      } else {
        showNotification('error', data.error || 'Failed to create resource');
      }
    } catch (error) {
      console.error('Error creating resource:', error);
      showNotification('error', 'Network error while creating resource');
    }
  };

  const handleUpdateResource = async () => {
    if (!selectedResource) return;

    try {
      const response = await fetch('/api/super-admin/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedResource)
      });

      const data = await response.json();

      if (data.success) {
        showNotification('success', 'Resource updated successfully');
        setShowEditModal(false);
        setSelectedResource(null);
        fetchContentData();
      } else {
        showNotification('error', data.error || 'Failed to update resource');
      }
    } catch (error) {
      console.error('Error updating resource:', error);
      showNotification('error', 'Network error while updating resource');
    }
  };

  const handleDeleteResource = async () => {
    if (!selectedResource) return;

    try {
      const response = await fetch(`/api/super-admin/content?id=${selectedResource.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        showNotification('success', 'Resource deleted successfully');
        setShowDeleteModal(false);
        setSelectedResource(null);
        fetchContentData();
      } else {
        showNotification('error', data.error || 'Failed to delete resource');
      }
    } catch (error) {
      console.error('Error deleting resource:', error);
      showNotification('error', 'Network error while deleting resource');
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const getTypeIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      'LESSON_PLAN': 'fas fa-book',
      'WORKSHEET': 'fas fa-file-alt',
      'VIDEO': 'fas fa-video',
      'PRESENTATION': 'fas fa-presentation',
      'QUIZ': 'fas fa-question-circle',
      'GAME': 'fas fa-gamepad',
      'TEMPLATE': 'fas fa-copy',
      'GUIDE': 'fas fa-map',
      'AUDIO': 'fas fa-music',
      'INTERACTIVE': 'fas fa-mouse-pointer'
    };
    return icons[type] || 'fas fa-file';
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors: { [key: string]: string } = {
      'BEGINNER': 'text-green-600',
      'INTERMEDIATE': 'text-yellow-600',
      'ADVANCED': 'text-red-600'
    };
    return colors[difficulty] || 'text-gray-600';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  return (
    <div className="super-admin-content-management">
      {/* Content Statistics */}
      {statistics && (
        <div className="super-admin-content-stats">
          <div className="super-admin-stat-card">
            <div className="super-admin-stat-icon">📚</div>
            <div className="super-admin-stat-content">
              <h3>{formatNumber(statistics.total)}</h3>
              <p>Total Resources</p>
            </div>
          </div>
          <div className="super-admin-stat-card">
            <div className="super-admin-stat-icon">✅</div>
            <div className="super-admin-stat-content">
              <h3>{formatNumber(statistics.active)}</h3>
              <p>Active Resources</p>
            </div>
          </div>
          <div className="super-admin-stat-card">
            <div className="super-admin-stat-icon">⏸️</div>
            <div className="super-admin-stat-content">
              <h3>{formatNumber(statistics.inactive)}</h3>
              <p>Inactive Resources</p>
            </div>
          </div>
          <div className="super-admin-stat-card">
            <div className="super-admin-stat-icon">📊</div>
            <div className="super-admin-stat-content">
              <h3>{statistics.typeBreakdown.length}</h3>
              <p>Resource Types</p>
            </div>
          </div>
        </div>
      )}

      {/* Content Filters */}
      <div className="super-admin-content-filters">
        <div className="super-admin-search-box">
          <input
            type="text"
            placeholder="Search resources..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="super-admin-input"
          />
          <i className="fas fa-search"></i>
        </div>
        <div className="super-admin-filter-group">
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="super-admin-select"
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
            className="super-admin-select"
          >
            <option value="">All Difficulties</option>
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
          </select>
          <select
            value={filters.ageGroup}
            onChange={(e) => setFilters({ ...filters, ageGroup: e.target.value })}
            className="super-admin-select"
          >
            <option value="">All Age Groups</option>
            <option value="CHILDREN">Children</option>
            <option value="TEENAGERS">Teenagers</option>
            <option value="ADULTS">Adults</option>
            <option value="SENIORS">Seniors</option>
          </select>
          <select
            value={filters.language}
            onChange={(e) => setFilters({ ...filters, language: e.target.value })}
            className="super-admin-select"
          >
            <option value="">All Languages</option>
            <option value="english">English</option>
            <option value="spanish">Spanish</option>
            <option value="french">French</option>
            <option value="german">German</option>
            <option value="italian">Italian</option>
            <option value="portuguese">Portuguese</option>
            <option value="russian">Russian</option>
            <option value="chinese">Chinese</option>
            <option value="japanese">Japanese</option>
            <option value="korean">Korean</option>
          </select>
          <select
            value={filters.isActive}
            onChange={(e) => setFilters({ ...filters, isActive: e.target.value })}
            className="super-admin-select"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
        <button
          className="super-admin-btn primary"
          onClick={() => setShowAddModal(true)}
        >
          <i className="fas fa-plus"></i>
          Add Resource
        </button>
      </div>

      {/* Content List */}
      <div className="super-admin-content-list">
        {loading ? (
          <div className="super-admin-loading">
            <div className="super-admin-spinner"></div>
            <p>Loading resources...</p>
          </div>
        ) : resources.length > 0 ? (
          <div className="super-admin-resources-grid">
            {resources.map((resource) => (
              <div key={resource.id} className="super-admin-resource-card">
                <div className="super-admin-resource-header">
                  <div className="super-admin-resource-type">
                    <i className={getTypeIcon(resource.type)}></i>
                    <span>{resource.type.replace('_', ' ')}</span>
                  </div>
                  <div className="super-admin-resource-actions">
                    <button
                      className="super-admin-btn-icon"
                      onClick={() => {
                        setSelectedResource(resource);
                        setShowEditModal(true);
                      }}
                      title="Edit"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    <button
                      className="super-admin-btn-icon danger"
                      onClick={() => {
                        setSelectedResource(resource);
                        setShowDeleteModal(true);
                      }}
                      title="Delete"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
                <div className="super-admin-resource-content">
                  <h4>{resource.title}</h4>
                  <p>{resource.description}</p>
                  <div className="super-admin-resource-meta">
                    <span className={`super-admin-difficulty ${getDifficultyColor(resource.difficulty)}`}>
                      {resource.difficulty}
                    </span>
                    <span className="super-admin-duration">
                      {resource.duration} min
                    </span>
                    <span className="super-admin-language">
                      {resource.language}
                    </span>
                    <span className={`super-admin-status ${getStatusBadge(resource.isActive)}`}>
                      {resource.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="super-admin-resource-stats">
                    <span title="Downloads">
                      <i className="fas fa-download"></i>
                      {formatNumber(resource.stats.downloads)}
                    </span>
                    <span title="Favorites">
                      <i className="fas fa-heart"></i>
                      {formatNumber(resource.stats.favorites)}
                    </span>
                    <span title="Rating">
                      <i className="fas fa-star"></i>
                      {resource.stats.averageRating.toFixed(1)}
                    </span>
                    <span title="Total Ratings">
                      <i className="fas fa-users"></i>
                      {formatNumber(resource.stats.totalRatings)}
                    </span>
                  </div>
                  <div className="super-admin-resource-tags">
                    {resource.tags.slice(0, 3).map((tag, index) => (
                      <span key={index} className="super-admin-tag">
                        {tag}
                      </span>
                    ))}
                    {resource.tags.length > 3 && (
                      <span className="super-admin-tag-more">
                        +{resource.tags.length - 3} more
                      </span>
                    )}
                  </div>
                  <div className="super-admin-resource-date">
                    Created: {formatDate(resource.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="super-admin-empty-state">
            <div className="super-admin-empty-state-icon">📚</div>
            <h3>No Resources Found</h3>
            <p>No teaching resources match your current filters.</p>
            <button
              className="super-admin-btn primary"
              onClick={() => setShowAddModal(true)}
            >
              <i className="fas fa-plus"></i>
              Add Your First Resource
            </button>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="super-admin-pagination">
          <button
            className="super-admin-btn secondary"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            <i className="fas fa-chevron-left"></i>
            Previous
          </button>
          <span className="super-admin-page-info">
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="super-admin-btn secondary"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            Next
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>
      )}

      {/* Add Resource Modal */}
      {showAddModal && (
        <div className="super-admin-modal-overlay">
          <div className="super-admin-modal">
            <div className="super-admin-modal-header">
              <h3>Add New Resource</h3>
              <button
                className="super-admin-btn-icon"
                onClick={() => setShowAddModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="super-admin-modal-body">
              <div className="super-admin-form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={newResource.title}
                  onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                  className="super-admin-input"
                  placeholder="Enter resource title"
                />
              </div>
              <div className="super-admin-form-group">
                <label>Description</label>
                <textarea
                  value={newResource.description}
                  onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                  className="super-admin-textarea"
                  placeholder="Enter resource description"
                  rows={3}
                />
              </div>
              <div className="super-admin-form-row">
                <div className="super-admin-form-group">
                  <label>Type *</label>
                  <select
                    value={newResource.type}
                    onChange={(e) => setNewResource({ ...newResource, type: e.target.value })}
                    className="super-admin-select"
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
                <div className="super-admin-form-group">
                  <label>Category *</label>
                  <input
                    type="text"
                    value={newResource.category}
                    onChange={(e) => setNewResource({ ...newResource, category: e.target.value })}
                    className="super-admin-input"
                    placeholder="Enter category"
                  />
                </div>
              </div>
              <div className="super-admin-form-row">
                <div className="super-admin-form-group">
                  <label>Difficulty *</label>
                  <select
                    value={newResource.difficulty}
                    onChange={(e) => setNewResource({ ...newResource, difficulty: e.target.value })}
                    className="super-admin-select"
                  >
                    <option value="">Select Difficulty</option>
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                  </select>
                </div>
                <div className="super-admin-form-group">
                  <label>Duration (minutes)</label>
                  <input
                    type="number"
                    value={newResource.duration}
                    onChange={(e) => setNewResource({ ...newResource, duration: parseInt(e.target.value) || 60 })}
                    className="super-admin-input"
                    min="1"
                  />
                </div>
              </div>
              <div className="super-admin-form-row">
                <div className="super-admin-form-group">
                  <label>Language *</label>
                  <input
                    type="text"
                    value={newResource.language}
                    onChange={(e) => setNewResource({ ...newResource, language: e.target.value })}
                    className="super-admin-input"
                    placeholder="Enter language"
                  />
                </div>
                <div className="super-admin-form-group">
                  <label>Age Group</label>
                  <select
                    value={newResource.ageGroup}
                    onChange={(e) => setNewResource({ ...newResource, ageGroup: e.target.value })}
                    className="super-admin-select"
                  >
                    <option value="ADULTS">Adults</option>
                    <option value="CHILDREN">Children</option>
                    <option value="TEENAGERS">Teenagers</option>
                    <option value="SENIORS">Seniors</option>
                  </select>
                </div>
              </div>
              <div className="super-admin-form-group">
                <label>Tags</label>
                <input
                  type="text"
                  value={newResource.tags.join(', ')}
                  onChange={(e) => setNewResource({ ...newResource, tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag) })}
                  className="super-admin-input"
                  placeholder="Enter tags separated by commas"
                />
              </div>
              <div className="super-admin-form-row">
                <div className="super-admin-form-group">
                  <label>Thumbnail URL</label>
                  <input
                    type="url"
                    value={newResource.thumbnail}
                    onChange={(e) => setNewResource({ ...newResource, thumbnail: e.target.value })}
                    className="super-admin-input"
                    placeholder="Enter thumbnail URL"
                  />
                </div>
                <div className="super-admin-form-group">
                  <label>Resource URL</label>
                  <input
                    type="url"
                    value={newResource.url}
                    onChange={(e) => setNewResource({ ...newResource, url: e.target.value })}
                    className="super-admin-input"
                    placeholder="Enter resource URL"
                  />
                </div>
              </div>
              <div className="super-admin-form-group">
                <label className="super-admin-checkbox-label">
                  <input
                    type="checkbox"
                    checked={newResource.isActive}
                    onChange={(e) => setNewResource({ ...newResource, isActive: e.target.checked })}
                    className="super-admin-checkbox"
                  />
                  Active Resource
                </label>
              </div>
            </div>
            <div className="super-admin-modal-footer">
              <button
                className="super-admin-btn secondary"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </button>
              <button
                className="super-admin-btn primary"
                onClick={handleCreateResource}
                disabled={!newResource.title || !newResource.type || !newResource.category || !newResource.difficulty || !newResource.language}
              >
                Create Resource
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Resource Modal */}
      {showEditModal && selectedResource && (
        <div className="super-admin-modal-overlay">
          <div className="super-admin-modal">
            <div className="super-admin-modal-header">
              <h3>Edit Resource</h3>
              <button
                className="super-admin-btn-icon"
                onClick={() => setShowEditModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="super-admin-modal-body">
              <div className="super-admin-form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={selectedResource.title}
                  onChange={(e) => setSelectedResource({ ...selectedResource, title: e.target.value })}
                  className="super-admin-input"
                />
              </div>
              <div className="super-admin-form-group">
                <label>Description</label>
                <textarea
                  value={selectedResource.description}
                  onChange={(e) => setSelectedResource({ ...selectedResource, description: e.target.value })}
                  className="super-admin-textarea"
                  rows={3}
                />
              </div>
              <div className="super-admin-form-row">
                <div className="super-admin-form-group">
                  <label>Type *</label>
                  <select
                    value={selectedResource.type}
                    onChange={(e) => setSelectedResource({ ...selectedResource, type: e.target.value })}
                    className="super-admin-select"
                  >
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
                <div className="super-admin-form-group">
                  <label>Category *</label>
                  <input
                    type="text"
                    value={selectedResource.category}
                    onChange={(e) => setSelectedResource({ ...selectedResource, category: e.target.value })}
                    className="super-admin-input"
                  />
                </div>
              </div>
              <div className="super-admin-form-row">
                <div className="super-admin-form-group">
                  <label>Difficulty *</label>
                  <select
                    value={selectedResource.difficulty}
                    onChange={(e) => setSelectedResource({ ...selectedResource, difficulty: e.target.value })}
                    className="super-admin-select"
                  >
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                  </select>
                </div>
                <div className="super-admin-form-group">
                  <label>Duration (minutes)</label>
                  <input
                    type="number"
                    value={selectedResource.duration}
                    onChange={(e) => setSelectedResource({ ...selectedResource, duration: parseInt(e.target.value) || 60 })}
                    className="super-admin-input"
                    min="1"
                  />
                </div>
              </div>
              <div className="super-admin-form-row">
                <div className="super-admin-form-group">
                  <label>Language *</label>
                  <input
                    type="text"
                    value={selectedResource.language}
                    onChange={(e) => setSelectedResource({ ...selectedResource, language: e.target.value })}
                    className="super-admin-input"
                  />
                </div>
                <div className="super-admin-form-group">
                  <label>Age Group</label>
                  <select
                    value={selectedResource.ageGroup}
                    onChange={(e) => setSelectedResource({ ...selectedResource, ageGroup: e.target.value })}
                    className="super-admin-select"
                  >
                    <option value="ADULTS">Adults</option>
                    <option value="CHILDREN">Children</option>
                    <option value="TEENAGERS">Teenagers</option>
                    <option value="SENIORS">Seniors</option>
                  </select>
                </div>
              </div>
              <div className="super-admin-form-group">
                <label>Tags</label>
                <input
                  type="text"
                  value={selectedResource.tags.join(', ')}
                  onChange={(e) => setSelectedResource({ ...selectedResource, tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag) })}
                  className="super-admin-input"
                  placeholder="Enter tags separated by commas"
                />
              </div>
              <div className="super-admin-form-row">
                <div className="super-admin-form-group">
                  <label>Thumbnail URL</label>
                  <input
                    type="url"
                    value={selectedResource.thumbnail || ''}
                    onChange={(e) => setSelectedResource({ ...selectedResource, thumbnail: e.target.value })}
                    className="super-admin-input"
                  />
                </div>
                <div className="super-admin-form-group">
                  <label>Resource URL</label>
                  <input
                    type="url"
                    value={selectedResource.url || ''}
                    onChange={(e) => setSelectedResource({ ...selectedResource, url: e.target.value })}
                    className="super-admin-input"
                  />
                </div>
              </div>
              <div className="super-admin-form-group">
                <label className="super-admin-checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedResource.isActive}
                    onChange={(e) => setSelectedResource({ ...selectedResource, isActive: e.target.checked })}
                    className="super-admin-checkbox"
                  />
                  Active Resource
                </label>
              </div>
            </div>
            <div className="super-admin-modal-footer">
              <button
                className="super-admin-btn secondary"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </button>
              <button
                className="super-admin-btn primary"
                onClick={handleUpdateResource}
                disabled={!selectedResource.title || !selectedResource.type || !selectedResource.category || !selectedResource.difficulty || !selectedResource.language}
              >
                Update Resource
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedResource && (
        <div className="super-admin-modal-overlay">
          <div className="super-admin-modal">
            <div className="super-admin-modal-header">
              <h3>Delete Resource</h3>
              <button
                className="super-admin-btn-icon"
                onClick={() => setShowDeleteModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="super-admin-modal-body">
              <p>Are you sure you want to delete the resource &quot;{selectedResource.title}&quot;?</p>
              <p className="super-admin-warning-text">
                This action cannot be undone. All associated data (downloads, favorites, ratings) will also be deleted.
              </p>
            </div>
            <div className="super-admin-modal-footer">
              <button
                className="super-admin-btn secondary"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                className="super-admin-btn danger"
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