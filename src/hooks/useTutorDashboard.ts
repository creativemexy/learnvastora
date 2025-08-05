import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';

interface DashboardData {
  stats: {
    activeSessions: number;
    totalStudents: number;
    pendingBookings: number;
    totalHours: number;
    completedSessions: number;
    totalEarnings: number;
    balance: number;
    rating: number | null;
    payments: number;
  };
  recentSessions: Array<{
    id: string;
    studentName: string;
    scheduledAt: string;
    rating: number | null;
    comment: string | null;
  }>;
  upcomingBookings: Array<{
    id: string;
    studentName: string;
    scheduledAt: string;
    status: string;
  }>;
  recentReviews: Array<{
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    student: {
      name: string;
    };
  }>;
  allStudents: Array<{
    id: string;
    name: string;
    email: string;
    lastSession: string;
    totalSessions: number;
    isOnline: boolean;
  }>;
}

interface UseTutorDashboardOptions {
  enableAutoRefresh?: boolean;
  autoRefreshInterval?: number;
  enableRealTime?: boolean;
}

interface UseTutorDashboardReturn {
  // Data
  dashboardData: DashboardData | null;
  processedData: {
    students: Map<string, { name: string; online: boolean }>;
    bookingsByDate: Map<string, any[]>;
    sortedDates: string[];
  } | null;
  
  // State
  loading: boolean;
  error: string | null;
  isRefreshing: boolean;
  isAutoRefreshing: boolean;
  lastUpdated: Date | null;
  
  // Actions
  refresh: () => Promise<void>;
  retry: () => Promise<void>;
  
  // Utilities
  formatDate: (dateString: string) => string;
  getStatusBadge: (status: string) => { class: string; text: string };
}

const fetchDashboardData = async (): Promise<DashboardData> => {
  const response = await fetch('/api/tutor/dashboard', {
    headers: {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }
  
  return response.json();
};

export function useTutorDashboard(options: UseTutorDashboardOptions = {}): UseTutorDashboardReturn {
  const { 
    enableAutoRefresh = true, 
    autoRefreshInterval = 30000,
    enableRealTime = false 
  } = options;
  
  const { data: session } = useSession();
  
  // Core state
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Auto-refresh interval
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Fetch data function
  const fetchData = useCallback(async (isBackgroundRefresh = false) => {
    try {
      if (!isBackgroundRefresh) {
        setLoading(true);
        setError(null);
      } else {
        setIsRefreshing(true);
        setIsAutoRefreshing(true);
      }
      
      const data = await fetchDashboardData();
      setDashboardData(data);
      setLastUpdated(new Date());
      
      if (!isBackgroundRefresh) {
        toast.success('Dashboard data loaded successfully');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch dashboard data';
      setError(errorMessage);
      
      if (!isBackgroundRefresh) {
        toast.error(errorMessage);
      }
      
      console.error('Error fetching dashboard data:', err);
    } finally {
      if (!isBackgroundRefresh) {
        setLoading(false);
      }
      setIsRefreshing(false);
      setIsAutoRefreshing(false);
    }
  }, []);
  
  // Manual refresh
  const refresh = useCallback(async () => {
    await fetchData(false);
  }, [fetchData]);
  
  // Retry function
  const retry = useCallback(async () => {
    setError(null);
    await fetchData(false);
  }, [fetchData]);
  
  // Process data efficiently with memoization
  const processedData = useMemo(() => {
    if (!dashboardData) return null;
    
    // Process students from allStudents data
    const students = new Map<string, { name: string; online: boolean }>();
    
    // Add students from allStudents (from API)
    if (dashboardData.allStudents) {
      dashboardData.allStudents.forEach(student => {
        students.set(student.name, { 
          name: student.name, 
          online: student.isOnline || false 
        });
      });
    }
    
    // Fallback: Add students from upcoming bookings (online)
    if (students.size === 0) {
      dashboardData.upcomingBookings.forEach(booking => {
        if (booking.studentName && !students.has(booking.studentName)) {
          students.set(booking.studentName, { name: booking.studentName, online: true });
        }
      });
    }
    
    // Fallback: Add students from recent sessions (offline)
    if (students.size === 0) {
      dashboardData.recentSessions.forEach(session => {
        if (session.studentName && !students.has(session.studentName)) {
          students.set(session.studentName, { name: session.studentName, online: false });
        }
      });
    }
    
    // Process bookings by date
    const bookingsByDate = new Map<string, any[]>();
    dashboardData.upcomingBookings.forEach(booking => {
      const date = new Date(booking.scheduledAt).toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: '2-digit', 
        year: '2-digit' 
      });
      
      if (!bookingsByDate.has(date)) {
        bookingsByDate.set(date, []);
      }
      bookingsByDate.get(date)!.push(booking);
    });
    
    // Sort dates
    const sortedDates = Array.from(bookingsByDate.keys()).sort((a, b) => {
      const [da, ma, ya] = a.split('.');
      const [db, mb, yb] = b.split('.');
      const dateA = new Date(`20${ya}-${ma}-${da}`);
      const dateB = new Date(`20${yb}-${mb}-${db}`);
      return dateA.getTime() - dateB.getTime();
    });
    
    return {
      students,
      bookingsByDate,
      sortedDates
    };
  }, [dashboardData]);
  
  // Utility functions
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);
  
  const getStatusBadge = useCallback((status: string) => {
    const statusMap: { [key: string]: { class: string; text: string } } = {
      PENDING: { class: "pending", text: "Pending" },
      CONFIRMED: { class: "confirmed", text: "Confirmed" },
      IN_PROGRESS: { class: "confirmed", text: "In Progress" },
      COMPLETED: { class: "completed", text: "Completed" },
      CANCELLED: { class: "cancelled", text: "Cancelled" }
    };
    
    return statusMap[status] || { class: "completed", text: status };
  }, []);
  
  // Initial data fetch
  useEffect(() => {
    if (session) {
      fetchData(false);
    }
  }, [session, fetchData]);
  
  // Auto-refresh setup
  useEffect(() => {
    if (enableAutoRefresh && session) {
      const interval = setInterval(() => {
        fetchData(true);
      }, autoRefreshInterval);
      
      setRefreshInterval(interval);
      
      return () => {
        clearInterval(interval);
      };
    }
  }, [enableAutoRefresh, autoRefreshInterval, session, fetchData]);
  
  // Real-time updates (placeholder for WebSocket implementation)
  useEffect(() => {
    if (enableRealTime && session) {
      // TODO: Implement WebSocket connection for real-time updates
      console.log('Real-time updates enabled (WebSocket implementation needed)');
    }
  }, [enableRealTime, session]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [refreshInterval]);
  
  return {
    // Data
    dashboardData,
    processedData,
    
    // State
    loading,
    error,
    isRefreshing,
    isAutoRefreshing,
    lastUpdated,
    
    // Actions
    refresh,
    retry,
    
    // Utilities
    formatDate,
    getStatusBadge
  };
} 