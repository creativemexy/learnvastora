import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { libraryService } from '@/services/libraryService';
import { 
  UnifiedResource, 
  Category, 
  LibraryStats, 
  PaginationInfo, 
  LibraryFilters, 
  LibraryResponse 
} from '@/types/library';

interface UseLibraryOptions {
  role: 'student' | 'tutor';
  initialPageSize?: number;
  enableAutoRefresh?: boolean;
  autoRefreshInterval?: number;
}

interface UseLibraryReturn {
  // Data
  resources: UnifiedResource[];
  categories: Category[];
  stats: LibraryStats;
  pagination: PaginationInfo;
  
  // State
  loading: boolean;
  error: string | null;
  isRefreshing: boolean;
  isAutoRefreshing: boolean;
  
  // Filters
  filters: LibraryFilters;
  setFilters: (filters: Partial<LibraryFilters>) => void;
  clearFilters: () => void;
  
  // Pagination
  currentPage: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  
  // Actions
  refresh: () => Promise<void>;
  search: (query: string) => Promise<void>;
  
  // Resource actions
  updateProgress: (resourceId: string, progress: number) => Promise<void>;
  markCompleted: (resourceId: string) => Promise<void>;
  downloadResource: (resourceId: string) => Promise<void>;
  toggleFavorite: (resourceId: string) => Promise<void>;
  rateResource: (resourceId: string, rating: number) => Promise<void>;
  
  // Utilities
  formatDuration: (minutes: number) => string;
  getTypeIcon: (type: string) => string;
  getDifficultyColor: (difficulty: string) => string;
}

const DEFAULT_FILTERS: LibraryFilters = {
  category: 'all',
  difficulty: 'all',
  language: 'all',
  ageGroup: 'all',
  searchQuery: '',
  selectedTags: [],
  sortBy: 'recent',
  sortOrder: 'desc',
};

const DEFAULT_STATS: LibraryStats = {
  totalResources: 0,
  totalDuration: 0,
  recentAdditions: 0,
};

const DEFAULT_PAGINATION: PaginationInfo = {
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0,
  hasNext: false,
  hasPrev: false,
};

export function useLibrary(options: UseLibraryOptions): UseLibraryReturn {
  const { role, initialPageSize = 20, enableAutoRefresh = true, autoRefreshInterval = 30000 } = options;
  const { data: session } = useSession();
  
  console.log('useLibrary hook initialized with options:', options);
  console.log('libraryService in hook:', libraryService);
  
  // Core state
  const [resources, setResources] = useState<UnifiedResource[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<LibraryStats>(DEFAULT_STATS);
  const [pagination, setPagination] = useState<PaginationInfo>(DEFAULT_PAGINATION);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  
  // Filters and pagination
  const [filters, setFiltersState] = useState<LibraryFilters>(DEFAULT_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  
  // Refs for cleanup
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Memoized computed values
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    resources.forEach(resource => {
      resource.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [resources]);

  // Fetch data function
  const fetchData = useCallback(async (isBackgroundRefresh = false) => {
    console.log('fetchData called with session:', !!session, 'role:', role);
    
    if (!session) {
      console.log('No session, returning early');
      return;
    }
    
    try {
      if (!isBackgroundRefresh) setLoading(true);
      setError(null);
      
      // Check if libraryService is available
      if (!libraryService) {
        console.error('libraryService is undefined');
        throw new Error('Library service is not available. Please refresh the page.');
      }
      
      if (!libraryService.makeRequest) {
        console.error('libraryService.makeRequest is undefined');
        throw new Error('Library service methods are not available. Please refresh the page.');
      }
      
      const serviceMethod = role === 'student' 
        ? libraryService.getStudentLibrary 
        : libraryService.getTutorLibrary;
      
      if (!serviceMethod) {
        console.error('Service method is undefined for role:', role);
        throw new Error(`Library service method not found for role: ${role}`);
      }
      
      console.log('Calling service method with filters:', filters, 'page:', currentPage, 'pageSize:', pageSize);
      
      const response: LibraryResponse = await serviceMethod(
        filters,
        currentPage,
        pageSize
      );
      
      console.log('Service response:', response);
      
      setResources(response.resources);
      setCategories(response.categories);
      setStats(response.stats);
      setPagination(response.pagination);
      
      if (!isBackgroundRefresh) {
        toast.success(`${role === 'student' ? 'Library' : 'Teaching resources'} loaded successfully`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load library data';
      console.error('Library fetch error:', err);
      setError(errorMessage);
      if (!isBackgroundRefresh) {
        toast.error(errorMessage);
      }
    } finally {
      if (!isBackgroundRefresh) setLoading(false);
    }
  }, [session, role, filters, currentPage, pageSize]);

  // Set filters with validation
  const setFilters = useCallback((newFilters: Partial<LibraryFilters>) => {
    const sanitizedFilters = {
      ...newFilters,
      searchQuery: newFilters.searchQuery 
        ? (libraryService?.sanitizeSearchQuery(newFilters.searchQuery) || newFilters.searchQuery)
        : filters.searchQuery,
    };
    
    if (libraryService?.validateFilters(sanitizedFilters)) {
      setFiltersState(prev => ({ ...prev, ...sanitizedFilters }));
      setCurrentPage(1); // Reset to first page when filters change
    }
  }, [filters.searchQuery]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
    setCurrentPage(1);
  }, []);

  // Set page with validation
  const setPage = useCallback((page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      setCurrentPage(page);
    }
  }, [pagination.totalPages]);

  // Set page size
  const setPageSize = useCallback((size: number) => {
    if (size >= 1 && size <= 100) {
      setPageSizeState(size);
      setCurrentPage(1); // Reset to first page
    }
  }, []);

  // Refresh data
  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchData(true);
    setIsRefreshing(false);
    toast.success('Library refreshed');
  }, [fetchData]);

  // Search with debouncing
  const search = useCallback(async (query: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    return new Promise<void>((resolve) => {
      searchTimeoutRef.current = setTimeout(async () => {
        setFilters({ searchQuery: query });
        resolve();
      }, 300);
    });
  }, [setFilters]);

  // Resource actions
  const updateProgress = useCallback(async (resourceId: string, progress: number) => {
    try {
      if (!libraryService?.updateStudentProgress) {
        throw new Error('Update progress method not available');
      }
      await libraryService.updateStudentProgress(resourceId, progress);
      setResources(prev => prev.map(r => 
        r.id === resourceId 
          ? { ...r, metadata: { ...r.metadata, student: { ...r.metadata.student, progress } } }
          : r
      ));
      toast.success('Progress updated');
    } catch (error) {
      console.error('Update progress error:', error);
      toast.error('Failed to update progress');
    }
  }, []);

  const markCompleted = useCallback(async (resourceId: string) => {
    try {
      if (!libraryService?.markResourceCompleted) {
        throw new Error('Mark completed method not available');
      }
      await libraryService.markResourceCompleted(resourceId);
      setResources(prev => prev.map(r => 
        r.id === resourceId 
          ? { ...r, metadata: { ...r.metadata, student: { ...r.metadata.student, isCompleted: true, progress: 100 } } }
          : r
      ));
      toast.success('Resource marked as completed');
    } catch (error) {
      console.error('Mark completed error:', error);
      toast.error('Failed to mark resource as completed');
    }
  }, []);

  const downloadResource = useCallback(async (resourceId: string) => {
    try {
      if (!libraryService?.downloadResource) {
        throw new Error('Download method not available');
      }
      await libraryService.downloadResource(resourceId);
      setResources(prev => prev.map(r => 
        r.id === resourceId 
          ? { 
              ...r, 
              metadata: { 
                ...r.metadata, 
                tutor: { 
                  ...r.metadata.tutor, 
                  isDownloaded: true,
                  downloads: (r.metadata.tutor?.downloads || 0) + 1,
                  rating: r.metadata.tutor?.rating || 0,
                  reviewCount: r.metadata.tutor?.reviewCount || 0
                } 
              } 
            }
          : r
      ));
      toast.success('Resource downloaded');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download resource');
    }
  }, []);

  const toggleFavorite = useCallback(async (resourceId: string) => {
    try {
      if (!libraryService?.toggleFavorite) {
        throw new Error('Toggle favorite method not available');
      }
      await libraryService.toggleFavorite(resourceId);
      setResources(prev => prev.map(r => 
        r.id === resourceId 
          ? { 
              ...r, 
              metadata: { 
                ...r.metadata, 
                tutor: { 
                  ...r.metadata.tutor, 
                  isFavorite: !r.metadata.tutor?.isFavorite,
                  downloads: r.metadata.tutor?.downloads || 0,
                  rating: r.metadata.tutor?.rating || 0,
                  reviewCount: r.metadata.tutor?.reviewCount || 0
                } 
              } 
            }
          : r
      ));
      toast.success('Favorite toggled');
    } catch (error) {
      console.error('Toggle favorite error:', error);
      toast.error('Failed to toggle favorite');
    }
  }, []);

  const rateResource = useCallback(async (resourceId: string, rating: number) => {
    try {
      if (!libraryService?.rateResource) {
        throw new Error('Rate resource method not available');
      }
      await libraryService.rateResource(resourceId, rating);
      toast.success('Rating submitted');
    } catch (error) {
      console.error('Rate resource error:', error);
      toast.error('Failed to submit rating');
    }
  }, []);

  // Utility functions
  const formatDuration = useCallback((minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }, []);

  const getTypeIcon = useCallback((type: string) => {
    const icons: Record<string, string> = {
      video: '🎥',
      document: '📄',
      quiz: '❓',
      audio: '🎧',
      interactive: '💻',
      lesson_plan: '📋',
      worksheet: '📝',
      presentation: '📊',
      game: '🎮',
      template: '📄',
      guide: '📖',
    };
    return icons[type] || '📁';
  }, []);

  const getDifficultyColor = useCallback((difficulty: string) => {
    const colors: Record<string, string> = {
      beginner: 'success',
      intermediate: 'warning',
      advanced: 'danger',
    };
    return colors[difficulty] || 'secondary';
  }, []);

  // Effects
  useEffect(() => {
    console.log('useEffect triggered with session:', !!session);
    if (session) {
      fetchData();
    }
  }, [session, fetchData]);

  // Auto-refresh effect
  useEffect(() => {
    if (enableAutoRefresh && session) {
      autoRefreshRef.current = setInterval(() => {
        if (!loading && !isRefreshing) {
          setIsAutoRefreshing(true);
          fetchData(true).finally(() => setIsAutoRefreshing(false));
        }
      }, autoRefreshInterval);
    }

    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
      }
    };
  }, [enableAutoRefresh, session, loading, isRefreshing, autoRefreshInterval, fetchData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
      }
    };
  }, []);

  return {
    // Data
    resources,
    categories,
    stats,
    pagination,
    
    // State
    loading,
    error,
    isRefreshing,
    isAutoRefreshing,
    
    // Filters
    filters,
    setFilters,
    clearFilters,
    
    // Pagination
    currentPage,
    setPage,
    setPageSize,
    
    // Actions
    refresh,
    search,
    
    // Resource actions
    updateProgress,
    markCompleted,
    downloadResource,
    toggleFavorite,
    rateResource,
    
    // Utilities
    formatDuration,
    getTypeIcon,
    getDifficultyColor,
  };
} 