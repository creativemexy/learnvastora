"use client";

import React, { useState, useEffect, useCallback } from 'react';

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  duration: number;
  language: string;
  price: number;
  isActive: boolean;
  isPublished: boolean;
  createdAt: string;
  instructor?: {
    name: string;
    email: string;
  };
  _count?: {
    enrollments: number;
    lessons: number;
    reviews: number;
  };
}

interface TeachingResource {
  id: string;
  title: string;
  description: string;
  type: string;
  category: string;
  difficulty: string;
  duration: number;
  language: string;
  isActive: boolean;
  createdAt: string;
  creator?: {
    name: string;
    email: string;
  };
  _count?: {
    favorites: number;
    ratings: number;
  };
}

interface CourseManagementProps {
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

export default function CourseManagement({ showNotification }: CourseManagementProps) {
  const [activeTab, setActiveTab] = useState<'courses' | 'resources'>('courses');
  const [courses, setCourses] = useState<Course[]>([]);
  const [resources, setResources] = useState<TeachingResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [courseForm, setCourseForm] = useState({
    title: '',
    description: '',
    category: '',
    difficulty: '',
    duration: 0,
    language: '',
    price: 0,
    isActive: true,
    isPublished: false
  });
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    draft: 0,
    pending: 0
  });
  const [showCreateResourceModal, setShowCreateResourceModal] = useState(false);
  const [resourceForm, setResourceForm] = useState({
    title: '',
    description: '',
    type: '',
    category: '',
    difficulty: '',
    duration: 0,
    language: '',
    isActive: true
  });

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '12',
        search: searchTerm,
        category: categoryFilter !== 'all' ? categoryFilter : '',
        difficulty: difficultyFilter !== 'all' ? difficultyFilter : '',
        language: languageFilter !== 'all' ? languageFilter : '',
        isActive: statusFilter !== 'all' ? (statusFilter === 'active' ? 'true' : 'false') : ''
      });

      const response = await fetch(`/api/super-admin/courses?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        const coursesData = Array.isArray(data.data.courses) ? data.data.courses : [];
        setCourses(coursesData);
        setTotalPages(Math.ceil((data.data.pagination.total || 0) / 12));
        setStats({
          total: data.data.statistics.total || 0,
          published: data.data.statistics.published || 0,
          draft: data.data.statistics.draft || 0,
          pending: data.data.statistics.pending || 0
        });
      } else {
        throw new Error(data.error || 'Failed to fetch courses');
      }
      
    } catch (error) {
      console.error('Error fetching courses:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch courses');
      setCourses([]);
      showNotification('error', 'Failed to fetch courses');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, categoryFilter, difficultyFilter, languageFilter, statusFilter, showNotification]);

  const fetchResources = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '12',
        search: searchTerm,
        type: typeFilter !== 'all' ? typeFilter : '',
        difficulty: difficultyFilter !== 'all' ? difficultyFilter : '',
        category: categoryFilter !== 'all' ? categoryFilter : '',
        language: languageFilter !== 'all' ? languageFilter : '',
        isActive: statusFilter !== 'all' ? (statusFilter === 'active' ? 'true' : 'false') : ''
      });

      const response = await fetch(`/api/super-admin/content?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Ensure data.data.resources is always an array
        const resourcesData = Array.isArray(data.data.resources) ? data.data.resources : [];
        setResources(resourcesData);
        setTotalPages(Math.ceil((data.data.pagination.total || 0) / 12));
        setStats({
          total: data.data.statistics.total || 0,
          published: data.data.statistics.active || 0,
          draft: data.data.statistics.inactive || 0,
          pending: 0
        });
      } else {
        throw new Error(data.error || 'Failed to fetch resources');
      }
      
    } catch (error) {
      console.error('Error fetching resources:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch resources');
      setResources([]); // Ensure resources is always an array even on error
      showNotification('error', 'Failed to fetch resources');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, typeFilter, difficultyFilter, categoryFilter, languageFilter, statusFilter, showNotification]);

  useEffect(() => {
    if (activeTab === 'courses') {
      fetchCourses();
    } else {
      fetchResources();
    }
  }, [activeTab, fetchCourses, fetchResources]);

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  }, []);

  const handleFilterChange = useCallback((filterType: string, value: string) => {
    switch (filterType) {
      case 'type':
        setTypeFilter(value);
        break;
      case 'difficulty':
        setDifficultyFilter(value);
        break;
      case 'category':
        setCategoryFilter(value);
        break;
      case 'language':
        setLanguageFilter(value);
        break;
      case 'status':
        setStatusFilter(value);
        break;
    }
    setCurrentPage(1);
  }, []);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'video': return '🎥';
      case 'document': return '📄';
      case 'interactive': return '🎮';
      case 'quiz': return '❓';
      case 'worksheet': return '📝';
      default: return '📚';
    }
  };



  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCourse) return;
    
    try {
      const response = await fetch(`/api/super-admin/courses/${selectedCourse.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(courseForm),
      });

      const data = await response.json();
      
      if (data.success) {
        showNotification('success', 'Course updated successfully!');
        setShowEditModal(false);
        setSelectedCourse(null);
        setCourseForm({
          title: '',
          description: '',
          category: '',
          difficulty: '',
          duration: 0,
          language: '',
          price: 0,
          isActive: true,
          isPublished: false
        });
        fetchCourses();
      } else {
        showNotification('error', 'Failed to update course: ' + data.error);
      }
    } catch (error) {
      console.error('Error updating course:', error);
      showNotification('error', 'Failed to update course');
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/super-admin/courses/${courseId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        showNotification('success', 'Course deleted successfully!');
        fetchCourses();
      } else {
        showNotification('error', 'Failed to delete course: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting course:', error);
      showNotification('error', 'Failed to delete course');
    }
  };

  const openEditModal = (course: Course) => {
    setSelectedCourse(course);
    setCourseForm({
      title: course.title,
      description: course.description,
      category: course.category,
      difficulty: course.difficulty,
      duration: course.duration,
      language: course.language,
      price: course.price,
      isActive: course.isActive,
      isPublished: course.isPublished
    });
    setShowEditModal(true);
  };

  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/super-admin/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(resourceForm),
      });
      const data = await response.json();
      if (data.success) {
        showNotification('success', 'Resource created successfully!');
        setShowCreateResourceModal(false);
        setResourceForm({
          title: '',
          description: '',
          type: '',
          category: '',
          difficulty: '',
          duration: 0,
          language: '',
          isActive: true
        });
        fetchResources();
      } else {
        showNotification('error', 'Failed to create resource: ' + data.error);
      }
    } catch (error) {
      console.error('Error creating resource:', error);
      showNotification('error', 'Failed to create resource');
    }
  };

  return (
    <div className="course-management-container">
      {/* Premium Header */}
      <div className="premium-header">
        <div className="header-content">
          <div className="header-left">
            <div className="header-icon">📚</div>
            <div className="header-text">
              <h1 className="premium-title">Course Management</h1>
              <p className="premium-subtitle">Manage all teaching resources and course content</p>
            </div>
          </div>
          <div className="header-stats">
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <div className="stat-value">{stats.total}</div>
                <div className="stat-label">Total Resources</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <div className="stat-value">{stats.published}</div>
                <div className="stat-label">Published</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📝</div>
              <div className="stat-content">
                <div className="stat-value">{stats.draft}</div>
                <div className="stat-label">Drafts</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⏳</div>
              <div className="stat-content">
                <div className="stat-value">{stats.pending}</div>
                <div className="stat-label">Pending</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="tab-switcher">
        <button
          className={`tab-btn${activeTab === 'courses' ? ' active' : ''}`}
          onClick={() => setActiveTab('courses')}
        >
          Courses
        </button>
        <button
          className={`tab-btn${activeTab === 'resources' ? ' active' : ''}`}
          onClick={() => setActiveTab('resources')}
        >
          Teaching Resources
        </button>
      </div>

      {/* Course Management Section */}
      {activeTab === 'courses' && (
        <div className="courses-section">
          <div className="courses-header">
            <h2>Courses</h2>
          </div>
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p className="loading-text">Loading courses...</p>
            </div>
          ) : error ? (
            <div className="error-container">
              <div className="error-icon">❌</div>
              <p className="error-text">{error}</p>
              <button onClick={fetchCourses} className="retry-button">
                Try Again
              </button>
            </div>
          ) : !Array.isArray(courses) || courses.length === 0 ? (
            <div className="empty-container">
              <div className="empty-icon">📚</div>
              <h3 className="empty-title">No courses found</h3>
              <p className="empty-text">Click "+ Add New Course" to create your first course.</p>
            </div>
          ) : (
            <div className="courses-grid">
              {courses.map((course) => (
                <div key={course.id} className="course-card">
                  <div className="course-header">
                    <div className="course-title">{course.title}</div>
                    <div className="course-status">
                      <span className={`status-badge ${course.isActive ? 'active' : 'inactive'}`}>{course.isActive ? 'Active' : 'Inactive'}</span>
                      <span className={`status-badge ${course.isPublished ? 'published' : 'draft'}`}>{course.isPublished ? 'Published' : 'Draft'}</span>
                    </div>
                  </div>
                  <div className="course-content">
                    <div className="course-meta">
                      <span>Category: {course.category}</span>
                      <span>Difficulty: {course.difficulty}</span>
                      <span>Duration: {course.duration} min</span>
                      <span>Language: {course.language}</span>
                      <span>Price: ₦{course.price}</span>
                    </div>
                    <div className="course-description">{course.description}</div>
                    {course._count && (
                      <div className="course-stats">
                        <span>Enrollments: {course._count.enrollments}</span>
                        <span>Lessons: {course._count.lessons}</span>
                        <span>Reviews: {course._count.reviews}</span>
                      </div>
                    )}
                  </div>
                  <div className="course-actions">
                    <button className="action-button edit" onClick={() => openEditModal(course)}>
                      ✏️ Edit
                    </button>
                    <button className="action-button delete" onClick={() => handleDeleteCourse(course.id)}>
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Pagination for courses */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="pagination-button"
              >
                ← Previous
              </button>
              <div className="pagination-info">
                Page {currentPage} of {totalPages}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="pagination-button"
              >
                Next →
              </button>
            </div>
          )}

          {/* Edit Course Modal */}
          {showEditModal && selectedCourse && (
            <div className="modal-overlay">
              <div className="modal">
                <div className="modal-header">
                  <h3>Edit Course</h3>
                  <button onClick={() => setShowEditModal(false)} className="modal-close">
                    <span>×</span>
                  </button>
                </div>
                <form onSubmit={handleUpdateCourse} className="modal-form">
                  <div className="form-group">
                    <label>Title:</label>
                    <input type="text" value={courseForm.title} onChange={e => setCourseForm(f => ({ ...f, title: e.target.value }))} required className="form-input" />
                  </div>
                  <div className="form-group">
                    <label>Description:</label>
                    <textarea value={courseForm.description} onChange={e => setCourseForm(f => ({ ...f, description: e.target.value }))} required className="form-input" />
                  </div>
                  <div className="form-group">
                    <label>Category:</label>
                    <input type="text" value={courseForm.category} onChange={e => setCourseForm(f => ({ ...f, category: e.target.value }))} required className="form-input" />
                  </div>
                  <div className="form-group">
                    <label>Difficulty:</label>
                    <select value={courseForm.difficulty} onChange={e => setCourseForm(f => ({ ...f, difficulty: e.target.value }))} required className="form-select">
                      <option value="">Select</option>
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Duration (minutes):</label>
                    <input type="number" value={courseForm.duration} onChange={e => setCourseForm(f => ({ ...f, duration: parseInt(e.target.value) }))} required className="form-input" min={1} />
                  </div>
                  <div className="form-group">
                    <label>Language:</label>
                    <input type="text" value={courseForm.language} onChange={e => setCourseForm(f => ({ ...f, language: e.target.value }))} required className="form-input" />
                  </div>
                  <div className="form-group">
                    <label>Price (₦):</label>
                    <input type="number" value={courseForm.price} onChange={e => setCourseForm(f => ({ ...f, price: parseInt(e.target.value) }))} required className="form-input" min={0} />
                  </div>
                  <div className="form-group">
                    <label>
                      <input type="checkbox" checked={courseForm.isActive} onChange={e => setCourseForm(f => ({ ...f, isActive: e.target.checked }))} />
                      Active
                    </label>
                  </div>
                  <div className="form-group">
                    <label>
                      <input type="checkbox" checked={courseForm.isPublished} onChange={e => setCourseForm(f => ({ ...f, isPublished: e.target.checked }))} />
                      Published
                    </label>
                  </div>
                  <div className="modal-actions">
                    <button type="submit" className="btn-primary">Update Course</button>
                    <button type="button" onClick={() => setShowEditModal(false)} className="btn-secondary">Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Teaching Resources Section (existing) */}
      {activeTab === 'resources' && (
        <div className="resources-section">
          <div className="resources-header">
            <h2>Teaching Resources</h2>
            <button className="create-resource-btn" onClick={() => setShowCreateResourceModal(true)}>
              + Add New Resource
            </button>
          </div>
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p className="loading-text">Loading resources...</p>
            </div>
          ) : error ? (
            <div className="error-container">
              <div className="error-icon">❌</div>
              <p className="error-text">{error}</p>
              <button onClick={fetchResources} className="retry-button">
                Try Again
              </button>
            </div>
          ) : !Array.isArray(resources) || resources.length === 0 ? (
            <div className="empty-container">
              <div className="empty-icon">📚</div>
              <h3 className="empty-title">No resources found</h3>
              <p className="empty-text">Click "+ Add New Resource" to create your first resource.</p>
            </div>
          ) : (
            <>
              <div className="resources-grid">
                {Array.isArray(resources) && resources.map((resource) => (
                  <div key={resource.id} className="resource-card">
                    <div className="resource-header">
                      <div className="resource-type-icon">
                        {getTypeIcon(resource.type)}
                      </div>
                      <div className="resource-status">
                        <span className={`status-badge ${resource.isActive ? 'active' : 'inactive'}`}>{resource.isActive ? 'Active' : 'Inactive'}</span>
                      </div>
                    </div>
                    <div className="resource-content">
                      <h3 className="resource-title">{resource.title}</h3>
                      <p className="resource-description">{resource.description}</p>
                      <div className="resource-meta">
                        <div className="meta-item">
                          <span className="meta-label">Category:</span>
                          <span className="meta-value">{resource.category}</span>
                        </div>
                        <div className="meta-item">
                          <span className="meta-label">Difficulty:</span>
                          <span className={`meta-value difficulty-badge ${getDifficultyColor(resource.difficulty)}`}>{resource.difficulty}</span>
                        </div>
                        <div className="meta-item">
                          <span className="meta-label">Duration:</span>
                          <span className="meta-value">{resource.duration} min</span>
                        </div>
                        <div className="meta-item">
                          <span className="meta-label">Language:</span>
                          <span className="meta-value">{resource.language}</span>
                        </div>
                      </div>
                      {resource._count && (
                        <div className="resource-stats">
                          <div className="stat-item">
                            <span className="stat-icon">❤️</span>
                            <span className="stat-value">{resource._count.favorites}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-icon">⭐</span>
                            <span className="stat-value">{resource._count.ratings}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="resource-actions">
                      <button className="action-button edit">
                        <span className="action-icon">✏️</span>
                        Edit
                      </button>
                      <button className="action-button view">
                        <span className="action-icon">👁️</span>
                        View
                      </button>
                      <button className="action-button delete">
                        <span className="action-icon">🗑️</span>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {/* Pagination for resources */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="pagination-button"
                  >
                    ← Previous
                  </button>
                  <div className="pagination-info">
                    Page {currentPage} of {totalPages}
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="pagination-button"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
          {/* Create Resource Modal */}
          {showCreateResourceModal && (
            <div className="modal-overlay">
              <div className="modal">
                <div className="modal-header">
                  <h3>Add New Resource</h3>
                  <button onClick={() => setShowCreateResourceModal(false)} className="modal-close">
                    <span>×</span>
                  </button>
                </div>
                <form onSubmit={handleCreateResource} className="modal-form">
                  <div className="form-group">
                    <label>Title:</label>
                    <input type="text" value={resourceForm.title} onChange={e => setResourceForm(f => ({ ...f, title: e.target.value }))} required className="form-input" />
                  </div>
                  <div className="form-group">
                    <label>Description:</label>
                    <textarea value={resourceForm.description} onChange={e => setResourceForm(f => ({ ...f, description: e.target.value }))} required className="form-input" />
                  </div>
                  <div className="form-group">
                    <label>Type:</label>
                    <select value={resourceForm.type} onChange={e => setResourceForm(f => ({ ...f, type: e.target.value }))} required className="form-select">
                      <option value="">Select</option>
                      <option value="video">Video</option>
                      <option value="document">Document</option>
                      <option value="interactive">Interactive</option>
                      <option value="quiz">Quiz</option>
                      <option value="worksheet">Worksheet</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Category:</label>
                    <input type="text" value={resourceForm.category} onChange={e => setResourceForm(f => ({ ...f, category: e.target.value }))} required className="form-input" />
                  </div>
                  <div className="form-group">
                    <label>Difficulty:</label>
                    <select value={resourceForm.difficulty} onChange={e => setResourceForm(f => ({ ...f, difficulty: e.target.value }))} required className="form-select">
                      <option value="">Select</option>
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Duration (minutes):</label>
                    <input type="number" value={resourceForm.duration} onChange={e => setResourceForm(f => ({ ...f, duration: parseInt(e.target.value) }))} required className="form-input" min={1} />
                  </div>
                  <div className="form-group">
                    <label>Language:</label>
                    <input type="text" value={resourceForm.language} onChange={e => setResourceForm(f => ({ ...f, language: e.target.value }))} required className="form-input" />
                  </div>
                  <div className="form-group">
                    <label>
                      <input type="checkbox" checked={resourceForm.isActive} onChange={e => setResourceForm(f => ({ ...f, isActive: e.target.checked }))} />
                      Active
                    </label>
                  </div>
                  <div className="modal-actions">
                    <button type="submit" className="btn-primary">Create Resource</button>
                    <button type="button" onClick={() => setShowCreateResourceModal(false)} className="btn-secondary">Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 