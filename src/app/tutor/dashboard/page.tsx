"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import TutorNavBar from '@/components/TutorNavBar';
import { useTutorDashboard } from '@/hooks/useTutorDashboard';
import { ErrorFallback } from '@/components/tutor/ErrorFallback';
import { DashboardStats } from '@/components/tutor/DashboardStats';
import { DashboardSidebar } from '@/components/tutor/DashboardSidebar';
import { ClassesGrid } from '@/components/tutor/ClassesGrid';
import { ClassesCalendar } from '@/components/tutor/ClassesCalendar';
import './dashboard-premium.css';

export default function TutorDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // UI state
  const [viewMode, setViewMode] = useState<'grid' | 'calendar'>('grid');
  const [searchQuery, setSearchQuery] = useState("");
  const [showCancelModal, setShowCancelModal] = useState<string | null>(null);
  
  // Use the enhanced dashboard hook
  const {
    dashboardData,
    processedData,
    loading,
    error,
    isRefreshing,
    isAutoRefreshing,
    lastUpdated,
    refresh,
    retry,
    formatDate,
    getStatusBadge
  } = useTutorDashboard({
    enableAutoRefresh: true,
    autoRefreshInterval: 30000,
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

  // Handle actions
  const handleCancelBooking = async (bookingId: string) => {
    try {
      const response = await fetch(`/api/tutor/bookings/${bookingId}/cancel`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to cancel booking');
      }

      toast.success('Session cancelled successfully');
      setShowCancelModal(null);
      await refresh(); // Refresh data after cancellation
    } catch (error) {
      console.error('Cancel booking error:', error);
      toast.error('Failed to cancel session');
    }
  };

  const handleRescheduleBooking = (bookingId: string) => {
    // Navigate to schedule page with booking ID
    router.push(`/tutor/schedule?booking=${bookingId}`);
  };

  const handleMessageStudent = (bookingId: string) => {
    // Navigate to messages page with booking context
    router.push(`/messages?booking=${bookingId}`);
  };

  const handleStudentClick = (studentName: string) => {
    // Filter by student name
    setSearchQuery(studentName);
  };

  // Loading state
  if (status === "loading" || loading) {
    return (
      <div className="ultra-premium-bg">
        <TutorNavBar />
        <div className="ultra-loading-container">
          <div className="ultra-spinner"></div>
          <p className="ultra-loading-text">Loading your premium dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="ultra-premium-bg">
        <TutorNavBar />
        <ErrorFallback 
          error={error} 
          onRetry={retry}
        />
      </div>
    );
  }

  // No session state
  if (!session) {
    return null;
  }

  return (
    <div className="ultra-premium-bg">
      <TutorNavBar />
      
      <div className="container-fluid ultra-dashboard-container" style={{ paddingTop: '80px' }}>
        {/* Dashboard Stats */}
        {dashboardData && (
          <DashboardStats 
            stats={dashboardData.stats}
            isAutoRefreshing={isAutoRefreshing}
            lastUpdated={lastUpdated}
          />
        )}

        <div className="row ultra-dashboard-content">
          {/* Sidebar */}
          <div className="col-lg-5">
            <DashboardSidebar 
              students={processedData?.students || new Map()}
              onStudentClick={handleStudentClick}
            />
          </div>

          {/* Main Content */}
          <div className="col-lg-7">
            <div className="ultra-main-content">
              {/* Header */}
              <div className="ultra-content-header">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <div>
                    <h1 className="ultra-page-title">My Classes</h1>
                    <p className="ultra-page-subtitle">
                      Manage your upcoming sessions and track your progress
                    </p>
                  </div>
                  
                  <div className="d-flex gap-3">
                    <button
                      className={`ultra-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                      onClick={() => setViewMode('grid')}
                    >
                      <i className="fas fa-th"></i>
                      Grid
                    </button>
                    <button
                      className={`ultra-view-btn ${viewMode === 'calendar' ? 'active' : ''}`}
                      onClick={() => setViewMode('calendar')}
                    >
                      <i className="fas fa-calendar"></i>
                      Calendar
                    </button>
                  </div>
                </div>

                {/* Search and Filters */}
                <div className="ultra-search-section">
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="fas fa-search"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control ultra-search-input"
                      placeholder="Search students, sessions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Content */}
              {viewMode === 'grid' ? (
                <ClassesGrid 
                  bookings={dashboardData?.upcomingBookings || []}
                  searchQuery={searchQuery}
                  onCancel={setShowCancelModal}
                  onReschedule={handleRescheduleBooking}
                  onMessage={handleMessageStudent}
                  formatDate={formatDate}
                  getStatusBadge={getStatusBadge}
                />
              ) : (
                <ClassesCalendar 
                  bookings={dashboardData?.upcomingBookings || []}
                  searchQuery={searchQuery}
                  onCancel={setShowCancelModal}
                  onReschedule={handleRescheduleBooking}
                  onMessage={handleMessageStudent}
                  formatDate={formatDate}
                  getStatusBadge={getStatusBadge}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Booking Modal */}
      {showCancelModal && (
        <div className="modal fade show" style={{ display: 'block' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Cancel Session</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowCancelModal(null)}
                ></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to cancel this session?</p>
                <p className="text-muted">This action cannot be undone.</p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCancelModal(null)}
                >
                  Keep Session
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => handleCancelBooking(showCancelModal)}
                >
                  Cancel Session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 