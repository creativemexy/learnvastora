"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import TutorNavBar from "@/components/TutorNavBar";
import { useLibrary } from "@/hooks/useLibrary";
import { LibraryFilters } from "@/components/library/LibraryFilters";
import { ResourceCard } from "@/components/library/ResourceCard";
import { Pagination } from "@/components/library/Pagination";
import '@/styles/library.css';
import './tutor-library.css';
import { libraryService } from "@/services/libraryService";

// Test the service import
console.log('=== LIBRARY SERVICE TEST ===');
console.log('LibraryService in page:', libraryService);
console.log('LibraryService type:', typeof libraryService);
if (libraryService) {
  console.log('LibraryService methods:', Object.getOwnPropertyNames(libraryService));
  console.log('LibraryService.makeRequest:', libraryService.makeRequest);
} else {
  console.error('LibraryService is undefined!');
}

export default function TutorLibraryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  
  // UI state
  const [isVisible, setIsVisible] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Test service availability
  useEffect(() => {
    console.log('=== COMPONENT MOUNTED ===');
    console.log('libraryService available:', !!libraryService);
    if (libraryService) {
      console.log('Testing service methods...');
      try {
        // Test basic methods
        console.log('validateFilters:', libraryService.validateFilters);
        console.log('sanitizeSearchQuery:', libraryService.sanitizeSearchQuery);
        console.log('makeRequest:', libraryService.makeRequest);
      } catch (error) {
        console.error('Error testing service methods:', error);
      }
    }
  }, []);
  
  // Use the unified library hook with error handling
  const {
    resources,
    categories,
    stats,
    pagination,
    loading,
    error,
    isRefreshing,
    isAutoRefreshing,
    filters,
    setFilters,
    clearFilters,
    currentPage,
    setPage,
    setPageSize,
    refresh,
    search,
    downloadResource,
    toggleFavorite,
    rateResource,
    formatDuration,
    getTypeIcon,
    getDifficultyColor,
  } = useLibrary({
    role: 'tutor',
    initialPageSize: 20,
    enableAutoRefresh: true,
    autoRefreshInterval: 30000,
  });

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  // Animation effects
  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Handle resource actions
  const handleResourceAction = useCallback(async (action: string, resourceId: string, data?: any) => {
    try {
      switch (action) {
        case 'download':
          await downloadResource(resourceId);
          break;
        case 'favorite':
          await toggleFavorite(resourceId);
          break;
        case 'rate':
          await rateResource(resourceId, data.rating);
          break;
        case 'preview':
          // Handle preview action
          toast.success('Opening preview...');
          break;
        default:
          console.log('Unknown action:', action);
      }
    } catch (error) {
      console.error('Resource action error:', error);
      toast.error('Failed to perform action');
    }
  }, [downloadResource, toggleFavorite, rateResource]);

  // Handle search with debouncing
  const handleSearch = useCallback((query: string) => {
    search(query);
  }, [search]);

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: any) => {
    setFilters(newFilters);
  }, [setFilters]);

  // Handle view mode toggle
  const toggleViewMode = useCallback(() => {
    setViewMode(prev => prev === 'grid' ? 'list' : 'grid');
  }, []);

  if (status === "loading" || loading) {
    return (
      <div className="tutor-library-container">
        <TutorNavBar />
        <div className="library-content">
          <div className="loading-container">
            <div className="loading-spinner">
              <div className="spinner-ring"></div>
            </div>
            <div className="spinner-text">Loading your teaching library...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="tutor-library-container">


      <TutorNavBar />
      
      <div className="library-content">
        {/* Hero Section */}
        <div className={`hero-section ${isVisible ? 'visible' : ''}`}>
          <div className="hero-content">
            <div className="hero-icon">📚</div>
            <h1 className="hero-title">Teaching Resources Library</h1>
            <p className="hero-subtitle">Discover and download high-quality teaching materials for your lessons</p>

            {/* Enhanced Stats */}
            <div className="hero-stats">
              <div className="stat-item">
                <span className="stat-number">{stats.totalResources}</span>
                <span className="stat-label">Total Resources</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{stats.downloadedResources || 0}</span>
                <span className="stat-label">Downloaded</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{stats.favoriteResources || 0}</span>
                <span className="stat-label">Favorites</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{stats.averageRating || 0}</span>
                <span className="stat-label">Avg Rating</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="hero-actions">
              <button 
                className="refresh-btn"
                onClick={refresh}
                disabled={isRefreshing}
              >
                {isRefreshing ? '🔄' : '🔄'} {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </button>
              <button 
                className="filters-btn"
                onClick={() => setShowFilters(!showFilters)}
              >
                🔍 {showFilters ? 'Hide Filters' : 'Show Filters'}
              </button>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className={`search-section ${isVisible ? 'visible' : ''}`}>
          <div className="search-container">
            <div className="search-box">
              <div className="search-icon">🔍</div>
              <input
                type="text"
                className="search-input"
                placeholder="Search teaching resources..."
                value={filters.searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
              {filters.searchQuery && (
                <button 
                  className="clear-search"
                  onClick={() => handleSearch('')}
                >
                  ✕
                </button>
              )}
            </div>
            
            <div className="filter-controls">
              <div className="view-toggle">
                <button
                  className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={toggleViewMode}
                  title="Grid View"
                >
                  <span>⊞</span>
                </button>
                <button
                  className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={toggleViewMode}
                  title="List View"
                >
                  <span>☰</span>
                </button>
              </div>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <LibraryFilters
              filters={filters}
              categories={categories}
              allTags={resources.reduce((tags: string[], resource) => {
                resource.tags.forEach(tag => {
                  if (!tags.includes(tag)) tags.push(tag);
                });
                return tags;
              }, [])}
              onFiltersChange={handleFiltersChange}
              onClearFilters={clearFilters}
              role="tutor"
              isMobile={isMobile}
            />
          )}
        </div>

        {/* Auto-refresh indicator */}
        {isAutoRefreshing && (
          <div className="auto-refresh-indicator">
            <i className="fas fa-sync-alt fa-spin"></i>
            <span>Auto-refreshing data...</span>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="error-message">
            <div className="error-icon">⚠️</div>
            <h3 className="error-title">Failed to load library</h3>
            <p className="error-description">{error}</p>
            <button className="retry-btn" onClick={refresh}>
              Try Again
            </button>
          </div>
        )}

        {/* Categories */}
        {categories.length > 0 && (
          <div className={`categories-section ${isVisible ? 'visible' : ''}`}>
            <h2 className="section-title">Browse by Category</h2>
            <div className="categories-grid">
              {categories.map((category, index) => (
                <div 
                  key={category.id} 
                  className={`category-card ${filters.category === category.id ? 'active' : ''}`}
                  onClick={() => handleFiltersChange({ category: category.id })}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="category-icon">{category.icon}</div>
                  <h3 className="category-name">{category.name}</h3>
                  <p className="category-count">{category.resourceCount} resources</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resources Section */}
        <div className={`resources-section ${isVisible ? 'visible' : ''}`}>
          <div className="resources-header">
            <h2 className="section-title">
              {filters.category === 'all' ? 'All Resources' : categories.find(c => c.id === filters.category)?.name}
            </h2>
            <div className="resources-count">
              {resources.length} resources
            </div>
          </div>

          {/* Quick Actions */}
          <div className="quick-actions">
            <button 
              className={`favorites-btn ${stats.favoriteResources && stats.favoriteResources > 0 ? 'active' : ''}`}
              onClick={() => handleFiltersChange({ selectedTags: ['favorites'] })}
            >
              ⭐ Favorites ({stats.favoriteResources || 0})
            </button>
            <button 
              className={`completed-btn ${stats.downloadedResources && stats.downloadedResources > 0 ? 'active' : ''}`}
              onClick={() => handleFiltersChange({ selectedTags: ['downloaded'] })}
            >
              📥 Downloaded ({stats.downloadedResources || 0})
            </button>
          </div>

          {/* Resources Grid/List */}
          {resources.length > 0 ? (
            <div className={`resources-container ${viewMode}-view`}>
              {resources.map((resource, index) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  role="tutor"
                  viewMode={viewMode}
                  onAction={handleResourceAction}
                  formatDuration={formatDuration}
                  getTypeIcon={getTypeIcon}
                  getDifficultyColor={getDifficultyColor}
                  isFavorite={resource.metadata.tutor?.isFavorite}
                  isDownloaded={resource.metadata.tutor?.isDownloaded}
                  showProgress={false}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📚</div>
              <h3 className="empty-title">No resources found</h3>
              <p className="empty-description">Try adjusting your filters or search terms</p>
              <button className="clear-filters-btn" onClick={clearFilters}>
                Clear All Filters
              </button>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <Pagination
              pagination={pagination}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              showPageSizeSelector={true}
              isMobile={isMobile}
            />
          )}
        </div>
      </div>
    </div>
  );
} 