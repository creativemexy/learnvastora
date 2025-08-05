"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import '../../admin-sessions.css';

interface SessionRecording {
  id: string;
  url: string;
  fileName: string;
  createdAt: string;
}

interface Review {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
  photo?: string;
}

interface Session {
  id: string;
  status: string;
  scheduledAt: string;
  duration: number;
  price: number;
  createdAt: string;
  tutor: User;
  student: User;
  sessionRecordings: SessionRecording[];
  review?: Review;
  messages: Message[];
}

interface AdminReview {
  id: string;
  action: string;
  details: any;
  metadata: any;
  createdAt: string;
  admin: User;
}

export default function SessionReviewPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sessionData, setSessionData] = useState<Session | null>(null);
  const [adminReviews, setAdminReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reviewData, setReviewData] = useState({
    action: '',
    adminNotes: '',
    adminRating: 5
  });

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/auth/signin");
      return;
    }

    // Check if user is an admin
    if ((session.user as any)?.role !== "ADMIN" && (session.user as any)?.role !== "SUPER_ADMIN") {
      router.push("/");
      return;
    }

    fetchSessionDetails();
  }, [session, status, router, params.id]);

  const fetchSessionDetails = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/admin/sessions/${params.id}/review`);
      const data = await response.json();
      
      if (data.success) {
        setSessionData(data.data.booking);
        setAdminReviews(data.data.adminReviews);
      } else {
        console.error('Failed to fetch session details:', data.error);
      }
    } catch (error) {
      console.error('Error fetching session details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (!reviewData.action || !reviewData.adminNotes) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      
      const response = await fetch(`/api/admin/sessions/${params.id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reviewData),
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`Session ${reviewData.action}d successfully!`);
        router.push('/admin/sessions');
      } else {
        alert('Failed to review session: ' + data.error);
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  if (loading) {
    return (
      <div className="admin-sessions-page">
        <div className="admin-loading">
          <div className="admin-spinner"></div>
          <p>Loading session details...</p>
        </div>
      </div>
    );
  }

  if (!session || !sessionData) {
    return null;
  }

  return (
    <div className="admin-sessions-page">
      {/* Header */}
      <div className="admin-sessions-header">
        <div className="admin-sessions-header-content">
          <div className="admin-sessions-header-left">
            <h1 className="admin-sessions-title">Session Review</h1>
            <p className="admin-sessions-subtitle">Review completed session before payment approval</p>
          </div>
          <div className="admin-sessions-header-right">
            <Link href="/admin/sessions" className="admin-back-btn">
              <i className="fas fa-arrow-left"></i>
              Back to Sessions
            </Link>
          </div>
        </div>
      </div>

      <div className="session-review-container">
        {/* Session Details */}
        <div className="session-details-card">
          <h2>Session Information</h2>
          <div className="session-info-grid">
            <div className="info-item">
              <label>Session ID:</label>
              <span>{sessionData.id}</span>
            </div>
            <div className="info-item">
              <label>Date & Time:</label>
              <span>{formatDate(sessionData.scheduledAt)}</span>
            </div>
            <div className="info-item">
              <label>Duration:</label>
              <span>{formatDuration(sessionData.duration)}</span>
            </div>
            <div className="info-item">
              <label>Price:</label>
              <span>₦{sessionData.price.toLocaleString()}</span>
            </div>
            <div className="info-item">
              <label>Status:</label>
              <span className="status-badge completed">Completed</span>
            </div>
          </div>
        </div>

        {/* Participants */}
        <div className="participants-section">
          <div className="participant-card">
            <h3>Tutor</h3>
            <div className="participant-info">
              <div className="user-avatar">
                {sessionData.tutor.photo ? (
                  <img src={sessionData.tutor.photo} alt={sessionData.tutor.name} />
                ) : (
                  <span>{sessionData.tutor.name[0]}</span>
                )}
              </div>
              <div className="user-details">
                <div className="user-name">{sessionData.tutor.name}</div>
                <div className="user-email">{sessionData.tutor.email}</div>
              </div>
            </div>
          </div>

          <div className="participant-card">
            <h3>Student</h3>
            <div className="participant-info">
              <div className="user-avatar">
                {sessionData.student.photo ? (
                  <img src={sessionData.student.photo} alt={sessionData.student.name} />
                ) : (
                  <span>{sessionData.student.name[0]}</span>
                )}
              </div>
              <div className="user-details">
                <div className="user-name">{sessionData.student.name}</div>
                <div className="user-email">{sessionData.student.email}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Session Recordings */}
        {sessionData.sessionRecordings.length > 0 && (
          <div className="recordings-section">
            <h3>Session Recordings</h3>
            <div className="recordings-list">
              {sessionData.sessionRecordings.map((recording) => (
                <div key={recording.id} className="recording-item">
                  <div className="recording-info">
                    <i className="fas fa-video"></i>
                    <span>{recording.fileName}</span>
                    <small>{formatDate(recording.createdAt)}</small>
                  </div>
                  <a
                    href={recording.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="recording-link"
                  >
                    <i className="fas fa-external-link-alt"></i>
                    View Recording
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Student Review */}
        {sessionData.review && (
          <div className="review-section">
            <h3>Student Review</h3>
            <div className="student-review">
              <div className="review-rating">
                {[...Array(5)].map((_, i) => (
                  <i
                    key={i}
                    className={`fas fa-star ${i < sessionData.review!.rating ? 'filled' : ''}`}
                  ></i>
                ))}
                <span className="rating-text">{sessionData.review.rating}/5</span>
              </div>
              {sessionData.review.comment && (
                <div className="review-comment">
                  <p>{sessionData.review.comment}</p>
                  <small>{formatDate(sessionData.review.createdAt)}</small>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Messages */}
        {sessionData.messages.length > 0 && (
          <div className="messages-section">
            <h3>Session Messages</h3>
            <div className="messages-list">
              {sessionData.messages.map((message) => (
                <div key={message.id} className="message-item">
                  <div className="message-header">
                    <span className="message-sender">{message.sender.name}</span>
                    <span className="message-time">{formatDate(message.createdAt)}</span>
                  </div>
                  <div className="message-content">{message.content}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Admin Review Form */}
        <div className="admin-review-form">
          <h3>Admin Review</h3>
          <div className="form-group">
            <label>Action:</label>
            <select
              value={reviewData.action}
              onChange={(e) => setReviewData(prev => ({ ...prev, action: e.target.value }))}
              className="form-select"
            >
              <option value="">Select Action</option>
              <option value="approve">Approve Session</option>
              <option value="reject">Reject Session</option>
            </select>
          </div>

          <div className="form-group">
            <label>Admin Rating:</label>
            <div className="rating-input">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  className={`rating-star ${rating <= reviewData.adminRating ? 'filled' : ''}`}
                  onClick={() => setReviewData(prev => ({ ...prev, adminRating: rating }))}
                >
                  <i className="fas fa-star"></i>
                </button>
              ))}
              <span className="rating-text">{reviewData.adminRating}/5</span>
            </div>
          </div>

          <div className="form-group">
            <label>Admin Notes:</label>
            <textarea
              value={reviewData.adminNotes}
              onChange={(e) => setReviewData(prev => ({ ...prev, adminNotes: e.target.value }))}
              placeholder="Provide detailed notes about the session quality, issues found, or reasons for approval/rejection..."
              className="form-textarea"
              rows={4}
            />
          </div>

          <div className="form-actions">
            <button
              onClick={handleReviewSubmit}
              disabled={submitting || !reviewData.action || !reviewData.adminNotes}
              className="submit-btn"
            >
              {submitting ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Processing...
                </>
              ) : (
                <>
                  <i className="fas fa-check"></i>
                  Submit Review
                </>
              )}
            </button>
          </div>
        </div>

        {/* Previous Admin Reviews */}
        {adminReviews.length > 0 && (
          <div className="previous-reviews">
            <h3>Previous Admin Reviews</h3>
            <div className="reviews-list">
              {adminReviews.map((review) => (
                <div key={review.id} className="admin-review-item">
                  <div className="review-header">
                    <span className="review-admin">{review.admin.name}</span>
                    <span className="review-action">{review.action}</span>
                    <span className="review-time">{formatDate(review.createdAt)}</span>
                  </div>
                  {review.details.adminNotes && (
                    <div className="review-notes">
                      <p>{review.details.adminNotes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 