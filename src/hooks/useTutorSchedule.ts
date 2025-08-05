import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addWeeks, subWeeks, startOfDay, endOfDay } from "date-fns";

interface Booking {
  id: string;
  scheduledAt: string;
  status: string;
  student: { name: string } | null;
}

interface Slot {
  id: string;
  tutorId: string;
  date?: string | null;
  dayOfWeek?: number | null;
  startTime: string;
  endTime: string;
  type: 'priority' | 'available';
  isRecurring: boolean;
}

interface ScheduleData {
  upcomingBookings: Booking[];
  availability: string;
  slots: Slot[];
}

interface UseTutorScheduleOptions {
  enableAutoRefresh?: boolean;
  autoRefreshInterval?: number;
  enableRealTime?: boolean;
}

interface UseTutorScheduleReturn {
  // Data
  scheduleData: ScheduleData | null;
  processedData: {
    bookingsByDate: Map<string, Booking[]>;
    priorityHours: { [date: string]: string[] };
    availableTimes: { [date: string]: string[] };
    recurringSlots: { priorityHours: { [weekday: string]: string[] }, availableTimes: { [weekday: string]: string[] } };
    weeklyTemplate: { priorityHours: { [weekday: string]: string[] }, availableTimes: { [weekday: string]: string[] } };
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
  addSlot: (slot: Partial<Slot>) => Promise<void>;
  editSlot: (id: string, updates: Partial<Slot>) => Promise<void>;
  deleteSlot: (id: string) => Promise<void>;
  updateAvailability: (availability: string) => Promise<void>;
  cancelBooking: (bookingId: string) => Promise<void>;
  
  // Utilities
  formatDateTime: (dateString: string) => string;
  getStatusBadge: (status: string) => { class: string; text: string };
  parseSlot: (slot: string) => [string, string] | null;
  isOverlap: (a: [string, string], b: [string, string]) => boolean;
  checkSlotConflicts: (slot: string, dayKey: string, type: 'priority' | 'available', isRecurring: boolean, recurringWeekday: string) => string;
}

const fetchScheduleData = async (): Promise<ScheduleData> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const [scheduleRes, slotsRes] = await Promise.all([
      fetch('/api/tutor/schedule', {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        next: { revalidate: 30 }, // Cache for 30 seconds
        signal: controller.signal
      }),
      fetch('/api/tutor/slots', {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        next: { revalidate: 30 }, // Cache for 30 seconds
        signal: controller.signal
      })
    ]);
    
    clearTimeout(timeoutId);
    
    if (!scheduleRes.ok) {
      const errorText = await scheduleRes.text();
      throw new Error(`Schedule API Error: ${errorText}`);
    }
    
    if (!slotsRes.ok) {
      const errorText = await slotsRes.text();
      throw new Error(`Slots API Error: ${errorText}`);
    }
    
    const [scheduleData, slotsData] = await Promise.all([
      scheduleRes.json(),
      slotsRes.json()
    ]);
    
    return {
      upcomingBookings: scheduleData.upcomingBookings || [],
      availability: scheduleData.availability || "",
      slots: slotsData || []
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw error;
  }
};

export function useTutorSchedule(options: UseTutorScheduleOptions = {}): UseTutorScheduleReturn {
  const { 
    enableAutoRefresh = true, 
    autoRefreshInterval = 30000,
    enableRealTime = false 
  } = options;
  
  const { data: session } = useSession();
  
  // Core state
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Processed data
  const processedData = useMemo(() => {
    if (!scheduleData) return null;

    const bookingsByDate = new Map<string, Booking[]>();
    const priorityHours: { [date: string]: string[] } = {};
    const availableTimes: { [date: string]: string[] } = {};
    const recurringSlots = { priorityHours: {} as { [weekday: string]: string[] }, availableTimes: {} as { [weekday: string]: string[] } };
    const weeklyTemplate = { priorityHours: {} as { [weekday: string]: string[] }, availableTimes: {} as { [weekday: string]: string[] } };

    // Process bookings by date
    scheduleData.upcomingBookings.forEach(booking => {
      const dateKey = format(new Date(booking.scheduledAt), 'yyyy-MM-dd');
      if (!bookingsByDate.has(dateKey)) {
        bookingsByDate.set(dateKey, []);
      }
      bookingsByDate.get(dateKey)!.push(booking);
    });

    // Process slots
    scheduleData.slots.forEach(slot => {
      if (slot.isRecurring) {
        const weekday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][slot.dayOfWeek || 0];
        const timeRange = `${slot.startTime}-${slot.endTime}`;
        
        if (slot.type === 'priority') {
          if (!recurringSlots.priorityHours[weekday]) {
            recurringSlots.priorityHours[weekday] = [];
          }
          recurringSlots.priorityHours[weekday].push(timeRange);
        } else {
          if (!recurringSlots.availableTimes[weekday]) {
            recurringSlots.availableTimes[weekday] = [];
          }
          recurringSlots.availableTimes[weekday].push(timeRange);
        }
      } else if (slot.date) {
        const timeRange = `${slot.startTime}-${slot.endTime}`;
        if (slot.type === 'priority') {
          if (!priorityHours[slot.date]) {
            priorityHours[slot.date] = [];
          }
          priorityHours[slot.date].push(timeRange);
        } else {
          if (!availableTimes[slot.date]) {
            availableTimes[slot.date] = [];
          }
          availableTimes[slot.date].push(timeRange);
        }
      }
    });

    return {
      bookingsByDate,
      priorityHours,
      availableTimes,
      recurringSlots,
      weeklyTemplate
    };
  }, [scheduleData]);

  // Fetch data function
  const fetchData = useCallback(async (isAutoRefresh = false) => {
    try {
      if (isAutoRefresh) {
        setIsAutoRefreshing(true);
      } else if (!isRefreshing) {
        setIsRefreshing(true);
      }
      
      setError(null);
      const data = await fetchScheduleData();
      setScheduleData(data);
      setLastUpdated(new Date());
      
      // No toast notifications for any refresh to prevent spam
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch schedule data';
      setError(errorMessage);
      if (!isAutoRefresh) {
        toast.error(errorMessage);
      }
    } finally {
      setIsRefreshing(false);
      setIsAutoRefreshing(false);
    }
  }, []); // Remove isRefreshing from dependencies to prevent infinite loop

  // Initial load
  useEffect(() => {
    if (session?.user) {
      setLoading(true);
      fetchData().finally(() => setLoading(false));
    }
  }, [session?.user]); // Only depend on session.user, not fetchData

  // Auto-refresh
  useEffect(() => {
    if (!enableAutoRefresh || !session?.user) return;

    const interval = setInterval(() => {
      fetchData(true);
    }, autoRefreshInterval);

    return () => clearInterval(interval);
  }, [enableAutoRefresh, autoRefreshInterval, session?.user]); // Remove fetchData from dependencies

  // Actions
  const refresh = useCallback(async () => {
    await fetchData();
  }, []); // Remove fetchData dependency

  const retry = useCallback(async () => {
    setError(null);
    await fetchData();
  }, []); // Remove fetchData dependency

  const addSlot = useCallback(async (slot: Partial<Slot>) => {
    const res = await fetch("/api/tutor/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(slot)
    });
    if (!res.ok) throw new Error("Failed to add slot");
    await fetchData();
  }, []); // Remove fetchData dependency

  const editSlot = useCallback(async (id: string, updates: Partial<Slot>) => {
    const res = await fetch(`/api/tutor/slots/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error("Failed to update slot");
    await fetchData();
  }, []); // Remove fetchData dependency

  const deleteSlot = useCallback(async (id: string) => {
    const res = await fetch(`/api/tutor/slots/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete slot");
    await fetchData();
  }, []); // Remove fetchData dependency

  const updateAvailability = useCallback(async (availability: string) => {
    const res = await fetch("/api/tutor/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ availability })
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to update schedule");
    }
    await fetchData();
  }, []); // Remove fetchData dependency

  const cancelBooking = useCallback(async (bookingId: string) => {
    const res = await fetch(`/api/bookings/${bookingId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CANCELLED' })
    });
    if (!res.ok) throw new Error('Failed to cancel booking');
    await fetchData();
  }, []); // Remove fetchData dependency

  // Utilities
  const formatDateTime = useCallback((dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  const getStatusBadge = useCallback((status: string) => {
    const statusMap: { [key: string]: { class: string; text: string } } = {
      PENDING: { class: "ultra-status-badge pending", text: "Pending" },
      CONFIRMED: { class: "ultra-status-badge confirmed", text: "Confirmed" },
      IN_PROGRESS: { class: "ultra-status-badge confirmed", text: "In Progress" },
      COMPLETED: { class: "ultra-status-badge completed", text: "Completed" },
      CANCELLED: { class: "ultra-status-badge cancelled", text: "Cancelled" }
    };
    
    return statusMap[status] || { class: "ultra-status-badge completed", text: status };
  }, []);

  const parseSlot = useCallback((slot: string): [string, string] | null => {
    const match = slot.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const start = match[1].padStart(2, '0') + ':' + match[2];
    const end = match[3].padStart(2, '0') + ':' + match[4];
    return [start, end] as [string, string];
  }, []);

  const isOverlap = useCallback((a: [string, string], b: [string, string]) => {
    return a[0] < b[1] && b[0] < a[1];
  }, []);

  const checkSlotConflicts = useCallback((slot: string, dayKey: string, type: 'priority' | 'available', isRecurring: boolean, recurringWeekday: string) => {
    const parsed = parseSlot(slot);
    if (!parsed) return 'Invalid format. Use HH:mm-HH:mm.';
    if (parsed[0] >= parsed[1]) return 'Start time must be before end time.';
    
    if (!processedData) return '';
    
    // Check against one-off slots for this day
    const slots = (type === 'priority' ? processedData.priorityHours : processedData.availableTimes)[dayKey] || [];
    for (const s of slots) {
      if (s === slot) continue;
      const p = parseSlot(s);
      if (p && isOverlap(parsed, p)) return 'Overlaps with another slot.';
    }
    
    // Check against recurring slots for this weekday
    const recSlots = (type === 'priority' ? processedData.recurringSlots.priorityHours : processedData.recurringSlots.availableTimes)[recurringWeekday] || [];
    for (const s of recSlots) {
      if (s === slot) continue;
      const p = parseSlot(s);
      if (p && isOverlap(parsed, p)) return 'Overlaps with a recurring slot.';
    }
    
    return '';
  }, [processedData, parseSlot, isOverlap]);

  return {
    scheduleData,
    processedData,
    loading,
    error,
    isRefreshing,
    isAutoRefreshing,
    lastUpdated,
    refresh,
    retry,
    addSlot,
    editSlot,
    deleteSlot,
    updateAvailability,
    cancelBooking,
    formatDateTime,
    getStatusBadge,
    parseSlot,
    isOverlap,
    checkSlotConflicts
  };
} 