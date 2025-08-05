"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { Modal, Button } from "react-bootstrap";
import '../bookings-cambly.css';
import StudentNavbar from "@/components/StudentNavbar";

interface Booking {
  id: string;
  scheduledAt: string;
  status: string;
  createdAt: string;
  tutor: {
    name: string;
    email: string;
    tutorProfile?: {
      bio?: string;
      skills?: string[];
    };
    id?: string; // Added id to the tutor interface
  };
  paymentMethod?: string;
  paymentReference?: string;
  paidAt?: string;
}

export default function BookingHistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [filter, setFilter] = useState("all"); // all, upcoming, completed, cancelled
  
  // Review state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/auth/signin");
      return;
    }

    if ((session.user as any)?.role !== "STUDENT") {
      router.push("/");
      return;
    }

    // Fetch booking history
    fetch("/api/bookings/history")
      .then(res => res.json())
      .then(data => {
        setBookings(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [session, status, router]);

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this booking?")) {
      return;
    }

    setCancelling(bookingId);

    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" })
      });

      if (response.ok) {
        // Update the booking status in the local state
        setBookings(prevBookings => 
          prevBookings.map(booking => 
            booking.id === bookingId 
              ? { ...booking, status: "CANCELLED" }
              : booking
          )
        );
        toast.success("Booking cancelled successfully");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to cancel booking");
      }
    } catch (error) {
      toast.error("Error cancelling booking");
    } finally {
      setCancelling(null);
    }
  };

  const handleLeaveReview = (booking: Booking) => {
    setSelectedBooking(booking);
    setReviewRating(5);
    setReviewComment("");
    setShowReviewModal(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedBooking) return;

    setSubmittingReview(true);

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          rating: reviewRating,
          comment: reviewComment
        })
      });

      if (response.ok) {
        toast.success("Review submitted successfully!");
        setShowReviewModal(false);
        setSelectedBooking(null);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to submit review");
      }
    } catch (error) {
      toast.error("Error submitting review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const filteredBookings = bookings.filter(booking => {
    if (filter === "all") return true;
    if (filter === "upcoming") return booking.status === "CONFIRMED" && new Date(booking.scheduledAt) > new Date();
    if (filter === "completed") return booking.status === "COMPLETED";
    if (filter === "cancelled") return booking.status === "CANCELLED";
    return true;
  });

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { class: string; text: string } } = {
      PENDING: { class: "bg-warning", text: "Pending" },
      CONFIRMED: { class: "bg-success", text: "Confirmed" },
      COMPLETED: { class: "bg-primary", text: "Completed" },
      CANCELLED: { class: "bg-danger", text: "Cancelled" }
    };
    
    const statusInfo = statusMap[status] || { class: "bg-secondary", text: status };
    return <span className={`badge ${statusInfo.class}`}>{statusInfo.text}</span>;
  };

  const getPaymentStatus = (booking: Booking) => {
    if (booking.paidAt) {
      return <span className="badge bg-success">Paid</span>;
    }
    if (booking.paymentReference) {
      return <span className="badge bg-warning">Processing</span>;
    }
    return <span className="badge bg-secondary">Pending</span>;
  };

  const formatDateTime = (dateString: string) => {
    const d = new Date(dateString);
    return format(d, "MMM dd, yyyy 'at' h:mm a");
  };

  const upcomingBookings = bookings.filter(b => 
    b.status === "CONFIRMED" && new Date(b.scheduledAt) > new Date()
  );
  
  const completedBookings = bookings.filter(b => b.status === "COMPLETED");
  const cancelledBookings = bookings.filter(b => b.status === "CANCELLED");
  const totalHours = completedBookings.length;

  // Calculate languages learned from completed bookings
  const languagesLearned = useMemo(() => {
    const languages = new Set<string>();
    completedBookings.forEach(booking => {
      // Extract language from tutor skills or use a default
      if (booking.tutor.tutorProfile?.skills) {
        booking.tutor.tutorProfile.skills.forEach(skill => {
          if (skill.toLowerCase().includes('english') || skill.toLowerCase().includes('spanish') || 
              skill.toLowerCase().includes('french') || skill.toLowerCase().includes('german') ||
              skill.toLowerCase().includes('chinese') || skill.toLowerCase().includes('japanese') ||
              skill.toLowerCase().includes('korean') || skill.toLowerCase().includes('arabic')) {
            languages.add(skill);
          }
        });
      }
    });
    return languages.size;
  }, [completedBookings]);

  // Calculate streaks and badges
  const sessionDates = useMemo(() => completedBookings.map(b => new Date(b.scheduledAt)), [completedBookings]);
  const streak = useMemo(() => {
    if (sessionDates.length === 0) return 0;
    sessionDates.sort((a, b) => b.getTime() - a.getTime());
    let currentStreak = 1;
    for (let i = 1; i < sessionDates.length; i++) {
      const diff = (sessionDates[i-1].getTime() - sessionDates[i].getTime()) / (1000 * 60 * 60 * 24);
      if (diff <= 1.5) currentStreak++;
      else break;
    }
    return currentStreak;
  }, [sessionDates]);
  const badges = useMemo(() => {
    const badgesArr = [];
    if (completedBookings.length >= 10) badgesArr.push('10 Sessions');
    if (totalHours >= 5) badgesArr.push('5 Hours');
    if (languagesLearned >= 2) badgesArr.push('2 Languages');
    return badgesArr;
  }, [completedBookings, totalHours, languagesLearned]);

  const handleDownloadHistory = () => {
    const csv = bookings.map(b => `${b.tutor.name},${b.scheduledAt},${b.status}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'session-history.csv';
    a.click();
    URL.revokeObjectURL(url);
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
    <div className="min-vh-100 cambly-bg d-flex flex-column">
      {/* LearnVastora Navbar */}
      <StudentNavbar />

      <div className="container cambly-container mt-4">
        {/* Streaks & Badges */}
        <div className="mb-4 d-flex flex-wrap align-items-center gap-3">
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-warning text-dark" style={{ fontSize: 18, borderRadius: 12 }}><i className="bi bi-fire me-1"></i>Streak: {streak} days</span>
            {badges.map(badge => (
              <span key={badge} className="badge bg-success" style={{ fontSize: 16, borderRadius: 12 }}><i className="bi bi-award me-1"></i>{badge}</span>
            ))}
          </div>
          <button className="btn cambly-btn-outline btn-sm ms-auto" onClick={handleDownloadHistory}><i className="bi bi-download me-1"></i>Download CSV</button>
        </div>
        {/* Timeline/List of Sessions */}
        <div className="timeline-list">
          {completedBookings.map((booking, idx) => (
            <div key={booking.id} className="card cambly-card mb-4 p-3 d-flex flex-row align-items-center gap-4 shadow-sm" style={{ borderRadius: 18, background: '#fff8f0', animation: 'fadeIn 0.3s' }}>
              <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(booking.tutor.name)}&background=ff9800&color=fff&bold=true`} alt={booking.tutor.name} className="rounded-circle" style={{ width: 56, height: 56, border: '2px solid #ff9800', objectFit: 'cover' }} />
              <div className="flex-grow-1">
                <div className="fw-bold" style={{ color: '#ff9800' }}>{booking.tutor.name}</div>
                <div className="text-muted small mb-1">{formatDateTime(booking.scheduledAt)} &bull; 1 hour</div>
                <div className="mb-2"><span className="badge bg-primary me-2">Completed</span>{getPaymentStatus(booking)}</div>
                {/* AI summary placeholder */}
                <div className="bg-light p-2 rounded mb-2"><i className="bi bi-journal-text text-warning me-2"></i>AI Summary: <span className="text-dark">(Summary will appear here.)</span></div>
                {/* Review placeholder */}
                <div className="mb-2"><i className="bi bi-star-fill text-warning me-1"></i>Review: <span className="text-dark">(Your review will appear here.)</span></div>
              </div>
              <div className="d-flex flex-column gap-2">
                {booking.tutor.id && (
                  <Link href={`/tutors/${booking.tutor.id}/book`} className="btn cambly-btn-outline btn-sm"><i className="bi bi-arrow-repeat me-1"></i>Book Again</Link>
                )}
                <button className="btn btn-outline-secondary btn-sm" onClick={() => handleLeaveReview(booking)}><i className="bi bi-pencil-square me-1"></i>Leave Review</button>
              </div>
            </div>
          ))}
          {completedBookings.length === 0 && (
            <div className="text-muted text-center py-5">
              <i className="bi bi-calendar-x fs-1 d-block mb-2"></i>
              <div className="fw-bold">No completed sessions yet</div>
              <div className="small">Your completed sessions will appear here.</div>
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      <Modal show={showReviewModal} onHide={() => setShowReviewModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Leave a Review</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedBooking && (
            <>
              <div className="mb-3">
                <label className="form-label">Rating</label>
                <div className="d-flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`btn btn-outline-warning ${reviewRating >= star ? 'active' : ''}`}
                      onClick={() => setReviewRating(star)}
                    >
                      <i className="fas fa-star"></i>
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label">Comment</label>
                <textarea
                  className="form-control"
                  rows={4}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share your experience with this tutor..."
                />
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowReviewModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="warning" 
            onClick={handleSubmitReview}
            disabled={submittingReview}
          >
            {submittingReview ? 'Submitting...' : 'Submit Review'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
} 