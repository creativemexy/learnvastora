"use client";

export const dynamic = 'force-dynamic';

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { addMonths, subMonths, format, addWeeks, subWeeks, addDays } from "date-fns";
import TutorNavBar from '@/components/TutorNavBar';
import { useTutorSchedule } from '@/hooks/useTutorSchedule';
import { ScheduleCalendar } from '@/components/tutor/schedule/ScheduleCalendar';
import { ScheduleWeeklyView } from '@/components/tutor/schedule/ScheduleWeeklyView';
import { ScheduleDailyView } from '@/components/tutor/schedule/ScheduleDailyView';
import { SlotManagementModal } from '@/components/tutor/schedule/SlotManagementModal';
import { BookingDetailsModal } from '@/components/tutor/schedule/BookingDetailsModal';
import './schedule-premium.css';

interface Booking {
  id: string;
  scheduledAt: string;
  status: string;
  student: { name: string; photo?: string } | null;
}

export default function TutorSchedulePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // UI state
  const [activeTab, setActiveTab] = useState<'reservations' | 'priority' | 'available'>('reservations');
  const [viewMode, setViewMode] = useState<'monthly' | 'weekly' | 'daily'>('monthly');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [currentDate, setCurrentDate] = useState(new Date());

  // Modal state
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showSlotModal, setShowSlotModal] = useState(false);

  // Slot management state
  const [editSlotsDate, setEditSlotsDate] = useState<string | null>(null);
  const [editSlots, setEditSlots] = useState<string[]>([]);
  const [editType, setEditType] = useState<'priority' | 'available' | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringWeekday, setRecurringWeekday] = useState('Monday');
  const [slotError, setSlotError] = useState<string>("");

  // Weekly template state
  const [weeklyTemplate, setWeeklyTemplate] = useState<{ priorityHours: { [weekday: string]: string[] }, availableTimes: { [weekday: string]: string[] } }>({ priorityHours: {}, availableTimes: {} });
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Use the enhanced schedule hook
  const {
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
  } = useTutorSchedule({
    enableAutoRefresh: false, // Completely disabled auto-refresh
    autoRefreshInterval: 120000, // Increased to 2 minutes to reduce load
    enableRealTime: false
  });

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

  // Handle booking click
  const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowBookingModal(true);
  };

  // Handle day click for slot management
  const handleDayClick = (date: Date, type: 'priority' | 'available') => {
    const key = format(date, 'yyyy-MM-dd');
    setEditSlotsDate(key);
    setEditType(type);
    setEditSlots(type === 'priority' ? (processedData?.priorityHours[key] || []) : (processedData?.availableTimes[key] || []));
    setIsRecurring(false);
    setRecurringWeekday(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()]);
    setShowSlotModal(true);
  };

  // Handle slot management
  const handleSaveSlots = () => {
    if (!editSlotsDate || !editType) return;
    
    // TODO: Implement slot saving logic
    toast.success('Slots saved successfully');
    setShowSlotModal(false);
    setEditSlotsDate(null);
    setEditType(null);
    setEditSlots([]);
  };

  const handleAddRecurringSlot = () => {
    if (!editType) return;
    // TODO: Implement recurring slot logic
    toast.success('Recurring slot added');
  };

  const handleDeleteRecurringSlot = (type: 'priority' | 'available', weekday: string, slot: string) => {
    // TODO: Implement delete recurring slot logic
    toast.success('Recurring slot deleted');
  };

  // Handle booking cancellation
  const handleCancelBooking = async () => {
    if (!selectedBooking) return;
    try {
      await cancelBooking(selectedBooking.id);
      toast.success('Booking cancelled successfully');
      setShowBookingModal(false);
      setSelectedBooking(null);
    } catch (err: any) {
      toast.error(err.message || 'Error cancelling booking');
    }
  };

  // Weekly template actions
  const handlePasteWeeklyTemplate = () => {
    // TODO: Implement paste template logic
    toast.success('Weekly template pasted');
  };

  const handleClearWeek = () => {
    // TODO: Implement clear week logic
    toast.success('Week cleared');
  };

  // Update slot error on changes
  useEffect(() => {
    if (!showSlotModal || !editType) { 
      setSlotError(""); 
      return; 
    }
    if (editSlots.length > 0 && editSlots[0]) {
      const err = checkSlotConflicts(editSlots[0], editSlotsDate || '', editType, isRecurring, recurringWeekday);
      setSlotError(err);
    } else {
      setSlotError("");
    }
  }, [showSlotModal, editSlots, editType, isRecurring, recurringWeekday, editSlotsDate, checkSlotConflicts]);

  const canSaveSlot = !slotError && editSlots.every(s => s && !checkSlotConflicts(s, editSlotsDate || '', editType!, isRecurring, recurringWeekday));

  // Loading state with timeout
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  
  useEffect(() => {
    if (loading && !loadingTimeout) {
      const timeout = setTimeout(() => {
        setLoadingTimeout(true);
      }, 15000); // 15 second timeout

      return () => clearTimeout(timeout);
    }
  }, [loading, loadingTimeout]);

  if (status === "loading" || (loading && !loadingTimeout)) {
    return (
      <div className="ultra-premium-bg">
        <TutorNavBar />
        <div className="ultra-loading-container">
          <div className="ultra-spinner"></div>
          <p className="ultra-loading-text">Loading your schedule...</p>
          <div className="ultra-loading-subtitle">
            <small>This may take a few moments</small>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="ultra-premium-bg">
        <TutorNavBar />
        <div className="ultra-error-container">
          <div className="ultra-error-content">
            <div className="ultra-error-icon">⚠️</div>
            <h2 className="ultra-error-title">Schedule Error</h2>
            <p className="ultra-error-message">{error}</p>
            <div className="ultra-error-actions">
              <button className="ultra-error-btn primary" onClick={retry}>
                Try Again
              </button>
              <button className="ultra-error-btn secondary" onClick={() => router.push('/tutor/dashboard')}>
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback state - show page with empty data if loading times out
  if (loadingTimeout && !scheduleData) {
    return (
      <div className="ultra-premium-bg">
        <TutorNavBar />
        
        <div className="ultra-premium-main" style={{ paddingTop: '80px' }}>
          {/* Header */}
          <div className="ultra-main-header">
            <div>
              <h1 className="ultra-main-title">Schedule Management</h1>
              <p className="ultra-main-subtitle">Professional calendar with advanced booking controls</p>
            </div>
            
            <div className="ultra-header-actions">
              <button 
                className="ultra-refresh-btn" 
                onClick={refresh}
                disabled={isRefreshing}
              >
                <i className={`fas fa-sync-alt ${isRefreshing ? 'fa-spin' : ''}`}></i>
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Show empty calendar with retry option */}
          <div className="ultra-empty-state">
            <div className="ultra-empty-content">
              <div className="ultra-empty-icon">📅</div>
              <h3 className="ultra-empty-title">Schedule Data Unavailable</h3>
              <p className="ultra-empty-message">
                Unable to load schedule data. This might be due to a network issue or server problem.
              </p>
              <div className="ultra-empty-actions">
                <button className="ultra-error-btn primary" onClick={retry}>
                  Try Again
                </button>
                <button className="ultra-error-btn secondary" onClick={() => router.push('/tutor/dashboard')}>
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ultra-premium-bg">
      <TutorNavBar />
      
      <div className="ultra-premium-main" style={{ paddingTop: '80px' }}>
        {/* Header */}
        <div className="ultra-main-header">
          <div>
            <h1 className="ultra-main-title">Schedule Management</h1>
            <p className="ultra-main-subtitle">Professional calendar with advanced booking controls</p>
          </div>
          
          <div className="ultra-header-actions">
            {lastUpdated && (
              <div className="ultra-last-updated subtle">
                Updated: {lastUpdated.toLocaleTimeString()}
              </div>
            )}
            <button 
              className="ultra-refresh-btn" 
              onClick={refresh}
              disabled={isRefreshing}
            >
              <i className={`fas fa-sync-alt ${isRefreshing ? 'fa-spin' : ''}`}></i>
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Premium Tabs */}
        <div className="ultra-premium-tabs">
          <button 
            className={`ultra-premium-tab ${activeTab === 'reservations' ? 'active' : ''}`}
            onClick={() => setActiveTab('reservations')}
          >
            <span className="tab-icon">📅</span>
            <span className="tab-label">Reservations</span>
          </button>
          
          <button 
            className={`ultra-premium-tab ${activeTab === 'priority' ? 'active' : ''}`}
            onClick={() => setActiveTab('priority')}
          >
            <span className="tab-icon">⭐</span>
            <span className="tab-label">Priority Hours</span>
          </button>
          
          <button 
            className={`ultra-premium-tab ${activeTab === 'available' ? 'active' : ''}`}
            onClick={() => setActiveTab('available')}
          >
            <span className="tab-icon">🕒</span>
            <span className="tab-label">Available Time</span>
          </button>
        </div>

        {/* View Mode Tabs */}
        <div className="ultra-view-toggle">
          <button 
            className={`ultra-view-btn ${viewMode === 'monthly' ? 'active' : ''}`}
            onClick={() => setViewMode('monthly')}
          >
            <span className="view-icon">📅</span>
            Monthly
          </button>
          
          <button 
            className={`ultra-view-btn ${viewMode === 'weekly' ? 'active' : ''}`}
            onClick={() => setViewMode('weekly')}
          >
            <span className="view-icon">📊</span>
            Weekly
          </button>
          
          <button 
            className={`ultra-view-btn ${viewMode === 'daily' ? 'active' : ''}`}
            onClick={() => setViewMode('daily')}
          >
            <span className="view-icon">📋</span>
            Daily
          </button>
        </div>

        {/* Calendar Controls */}
        <div className="ultra-calendar-controls">
          <div className="ultra-controls-left">
            <button className="ultra-control-button" onClick={handlePasteWeeklyTemplate}>
              📋 Paste Template
            </button>
            <button className="ultra-control-button" onClick={() => setShowTemplateModal(true)}>
              ⚙️ Edit Template
            </button>
            <button className="ultra-control-button danger" onClick={handleClearWeek}>
              🗑️ Clear Week
            </button>
          </div>
          
          {/* Navigation */}
          <div className="ultra-calendar-nav">
            {viewMode === 'monthly' && (
              <>
                <button className="ultra-nav-button" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                  ‹
                </button>
                <h2 className="ultra-calendar-title">{format(currentMonth, 'MMMM yyyy')}</h2>
                <button className="ultra-nav-button" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  ›
                </button>
              </>
            )}
            
            {viewMode === 'weekly' && (
              <>
                <button className="ultra-nav-button" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
                  ‹
                </button>
                <h2 className="ultra-calendar-title">
                  {format(currentWeek, 'MMM d')} - {format(addWeeks(currentWeek, 1), 'MMM d, yyyy')}
                </h2>
                <button className="ultra-nav-button" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
                  ›
                </button>
              </>
            )}
            
            {viewMode === 'daily' && (
              <>
                <button className="ultra-nav-button" onClick={() => setCurrentDate(addDays(currentDate, -1))}>
                  ‹
                </button>
                <h2 className="ultra-calendar-title">{format(currentDate, 'EEEE, MMMM d, yyyy')}</h2>
                <button className="ultra-nav-button" onClick={() => setCurrentDate(addDays(currentDate, 1))}>
                  ›
                </button>
              </>
            )}
          </div>
        </div>

        {/* View Content */}
        {viewMode === 'monthly' && processedData && (
          <ScheduleCalendar
            currentMonth={currentMonth}
            activeTab={activeTab}
            upcomingBookings={scheduleData?.upcomingBookings || []}
            priorityHours={processedData.priorityHours}
            availableTimes={processedData.availableTimes}
            recurringSlots={processedData.recurringSlots}
            onDayClick={handleDayClick}
            onBookingClick={handleBookingClick}
          />
        )}

        {viewMode === 'weekly' && processedData && (
          <ScheduleWeeklyView
            currentWeek={currentWeek}
            activeTab={activeTab}
            upcomingBookings={scheduleData?.upcomingBookings || []}
            priorityHours={processedData.priorityHours}
            availableTimes={processedData.availableTimes}
            recurringSlots={processedData.recurringSlots}
            onDayClick={handleDayClick}
            onBookingClick={handleBookingClick}
          />
        )}

        {viewMode === 'daily' && processedData && (
          <ScheduleDailyView
            currentDate={currentDate}
            activeTab={activeTab}
            upcomingBookings={scheduleData?.upcomingBookings || []}
            priorityHours={processedData.priorityHours}
            availableTimes={processedData.availableTimes}
            recurringSlots={processedData.recurringSlots}
            onDayClick={handleDayClick}
            onBookingClick={handleBookingClick}
          />
        )}
      </div>

      {/* Modals */}
      <BookingDetailsModal
        isOpen={showBookingModal}
        onClose={() => {
          setShowBookingModal(false);
          setSelectedBooking(null);
        }}
        booking={selectedBooking}
        formatDateTime={formatDateTime}
        getStatusBadge={getStatusBadge}
        onCancelBooking={handleCancelBooking}
      />

      <SlotManagementModal
        isOpen={showSlotModal}
        onClose={() => {
          setShowSlotModal(false);
          setEditSlotsDate(null);
          setEditType(null);
          setEditSlots([]);
        }}
        editSlotsDate={editSlotsDate}
        editType={editType}
        editSlots={editSlots}
        isRecurring={isRecurring}
        recurringWeekday={recurringWeekday}
        slotError={slotError}
        canSaveSlot={canSaveSlot}
        recurringSlots={processedData?.recurringSlots || { priorityHours: {}, availableTimes: {} }}
        onSaveSlots={handleSaveSlots}
        onAddRecurringSlot={handleAddRecurringSlot}
        onDeleteRecurringSlot={handleDeleteRecurringSlot}
        onSlotsChange={setEditSlots}
        onRecurringChange={setIsRecurring}
        onRecurringWeekdayChange={setRecurringWeekday}
      />
    </div>
  );
} 