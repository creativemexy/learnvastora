import { useState, useEffect, useCallback } from 'react';

// Centralized API layer for dashboard and other components
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

export interface DashboardData {
  stats: {
    totalSessions: number;
    completedSessions: number;
    upcomingSessions: number;
    totalSpent: number;
    averageRating: number;
  };
  recentSessions: Array<{
    id: string;
    tutorName: string;
    scheduledAt: string;
    status: string;
    rating: number | null;
  }>;
  upcomingBookings: Array<{
    id: string;
    tutorName: string;
    scheduledAt: string;
    status: string;
  }>;
  recentReviews: Array<{
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    tutor: {
      name: string;
    };
  }>;
  recentTutors: Array<{
    id: string;
    name: string;
    email: string;
  }>;
}

export interface WalletData {
  balance: number;
  currency: string;
  lastUpdated: string;
}

export interface NotificationData {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
}

// API client with error handling and caching
class ApiClient {
  private baseUrl: string;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data, success: true };
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false,
      };
    }
  }

  private getCacheKey(endpoint: string, params?: Record<string, any>): string {
    const paramsString = params ? JSON.stringify(params) : '';
    return `${endpoint}${paramsString}`;
  }

  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.cacheTimeout;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private getCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.data;
    }
    if (cached) {
      this.cache.delete(key);
    }
    return null;
  }

  // Dashboard API
  async getDashboardData(): Promise<ApiResponse<DashboardData>> {
    const cacheKey = this.getCacheKey('/api/student/dashboard');
    const cached = this.getCache<DashboardData>(cacheKey);
    
    if (cached) {
      return { data: cached, success: true };
    }

    const response = await this.request<DashboardData>('/api/student/dashboard');
    
    if (response.success && response.data) {
      this.setCache(cacheKey, response.data);
    }

    return response;
  }

  // Wallet API
  async getWalletBalance(): Promise<ApiResponse<WalletData>> {
    const cacheKey = this.getCacheKey('/api/wallet/balance');
    const cached = this.getCache<WalletData>(cacheKey);
    
    if (cached) {
      return { data: cached, success: true };
    }

    const response = await this.request<WalletData>('/api/wallet/balance');
    
    if (response.success && response.data) {
      this.setCache(cacheKey, response.data);
    }

    return response;
  }

  // Notifications API
  async getNotifications(): Promise<ApiResponse<NotificationData[]>> {
    const cacheKey = this.getCacheKey('/api/notifications');
    const cached = this.getCache<NotificationData[]>(cacheKey);
    
    if (cached) {
      return { data: cached, success: true };
    }

    const response = await this.request<NotificationData[]>('/api/notifications');
    
    if (response.success && response.data) {
      this.setCache(cacheKey, response.data);
    }

    return response;
  }

  // Mark notification as read
  async markNotificationAsRead(notificationId: string): Promise<ApiResponse<void>> {
    const response = await this.request<void>(`/api/notifications/${notificationId}/read`, {
      method: 'PUT',
    });

    if (response.success) {
      // Invalidate notifications cache
      this.cache.delete(this.getCacheKey('/api/notifications'));
    }

    return response;
  }

  // Clear cache for specific endpoint
  clearCache(endpoint: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith(endpoint)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  // Clear all cache
  clearAllCache(): void {
    this.cache.clear();
  }

  // Force refresh data (bypass cache)
  async forceRefresh<T>(endpoint: string): Promise<ApiResponse<T>> {
    const cacheKey = this.getCacheKey(endpoint);
    this.cache.delete(cacheKey);
    return this.request<T>(endpoint);
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Utility functions for common API operations
export const api = {
  // Dashboard
  getDashboardData: () => apiClient.getDashboardData(),
  
  // Wallet
  getWalletBalance: () => apiClient.getWalletBalance(),
  
  // Notifications
  getNotifications: () => apiClient.getNotifications(),
  markNotificationAsRead: (id: string) => apiClient.markNotificationAsRead(id),
  
  // Cache management
  clearCache: (endpoint: string) => apiClient.clearCache(endpoint),
  clearAllCache: () => apiClient.clearAllCache(),
  forceRefresh: <T>(endpoint: string) => apiClient.forceRefresh<T>(endpoint),
};

// React hook for API calls with loading and error states
export const useApiCall = <T>(
  apiCall: () => Promise<ApiResponse<T>>,
  dependencies: any[] = []
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await apiCall();
        
        if (!mounted) return;

        if (response.success && response.data) {
          setData(response.data);
        } else {
          setError(response.error || 'Failed to fetch data');
        }
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, dependencies);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiCall();
      
      if (response.success && response.data) {
        setData(response.data);
      } else {
        setError(response.error || 'Failed to fetch data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  return { data, loading, error, refetch };
};

// Custom hook for dashboard data
export const useDashboardData = () => {
  return useApiCall(() => api.getDashboardData(), []);
};

// Custom hook for wallet balance
export const useWalletBalance = () => {
  return useApiCall(() => api.getWalletBalance(), []);
};

// Custom hook for notifications
export const useNotifications = () => {
  return useApiCall(() => api.getNotifications(), []);
}; 