"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import Link from "next/link";

interface PendingBooking {
  id: string;
  scheduledAt: string;
  createdAt: string;
  student: {
    id: string;
    name: string;
    email: string;
  };
  isInstant: boolean;
}

export default function PendingRequestsPage() {
  const [pendingBookings, setPendingBookings] = useState<PendingBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/auth/signin");
      return;
    }

    fetchPendingRequests();
  }, [session, status, router]);

  const fetchPendingRequests = async () => {
    try {
      const response = await fetch("/api/tutor/pending-bookings");
      if (response.ok) {
        const data = await response.json();
        setPendingBookings(data);
      } else {
        toast.error("Failed to fetch pending requests");
      }
    } catch (error) {
      toast.error("Error fetching pending requests");
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (bookingId: string, action: "accept" | "decline", reason?: string) => {
    setResponding(bookingId);

    try {
      const response = await fetch(`/api/bookings/${bookingId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        // Remove the booking from the list
        setPendingBookings(prev => prev.filter(booking => booking.id !== bookingId));
      } else {
        toast.error(data.error || "Failed to respond to booking");
      }
    } catch (error) {
      toast.error("Error responding to booking");
    } finally {
      setResponding(null);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-vh-100 bg-light">
      {/* Header */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <div className="container">
          <Link href="/" className="navbar-brand fw-bold">LanguageConnect</Link>
          <div className="navbar-nav ms-auto">
            <Link href="/tutor/dashboard" className="nav-link">
              <i className="bi bi-arrow-left me-2"></i>Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <div className="container py-5">
        <div className="row">
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h1 className="h2 fw-bold text-primary mb-2">
                  <i className="bi bi-clock me-2"></i>
                  Pending Requests
                </h1>
                <p className="text-muted mb-0">Respond to student booking requests</p>
              </div>
              <button 
                className="btn btn-outline-primary"
                onClick={fetchPendingRequests}
              >
                <i className="bi bi-arrow-clockwise me-2"></i>
                Refresh
              </button>
            </div>

            {pendingBookings.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-check-circle display-1 text-success"></i>
                <h4 className="mt-3 text-success">No pending requests</h4>
                <p className="text-muted">All booking requests have been handled</p>
              </div>
            ) : (
              <div className="row g-4">
                {pendingBookings.map((booking) => (
                  <div key={booking.id} className="col-md-6 col-lg-4">
                    <div className="card border-0 shadow-sm h-100">
                      <div className="card-body">
                        {/* Student Info */}
                        <div className="d-flex align-items-center mb-3">
                          <div className="flex-shrink-0">
                            <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center" style={{width: '50px', height: '50px'}}>
                              <i className="bi bi-person text-white"></i>
                            </div>
                          </div>
                          <div className="flex-grow-1 ms-3">
                            <h6 className="fw-semibold mb-1">{booking.student.name}</h6>
                            <small className="text-muted">{booking.student.email}</small>
                          </div>
                        </div>

                        {/* Booking Details */}
                        <div className="mb-3">
                          <div className="d-flex align-items-center mb-2">
                            <i className="bi bi-calendar text-primary me-2"></i>
                            <span className="small">Scheduled: {formatTime(booking.scheduledAt)}</span>
                          </div>
                          <div className="d-flex align-items-center mb-2">
                            <i className="bi bi-clock text-warning me-2"></i>
                            <span className="small">Requested: {formatTime(booking.createdAt)}</span>
                          </div>
                          {booking.isInstant && (
                            <div className="d-flex align-items-center">
                              <i className="bi bi-lightning-charge text-danger me-2"></i>
                              <span className="small text-danger fw-semibold">Instant Booking</span>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="d-grid gap-2">
                          <button
                            className="btn btn-success"
                            onClick={() => handleResponse(booking.id, "accept")}
                            disabled={responding === booking.id}
                          >
                            {responding === booking.id ? (
                              <>
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                Processing...
                              </>
                            ) : (
                              <>
                                <i className="bi bi-check-circle me-2"></i>
                                Accept
                              </>
                            )}
                          </button>
                          <button
                            className="btn btn-outline-danger"
                            onClick={() => handleResponse(booking.id, "decline")}
                            disabled={responding === booking.id}
                          >
                            {responding === booking.id ? (
                              <>
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                Processing...
                              </>
                            ) : (
                              <>
                                <i className="bi bi-x-circle me-2"></i>
                                Decline
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 