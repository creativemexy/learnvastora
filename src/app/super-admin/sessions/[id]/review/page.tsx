"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import '../../../../admin/sessions/admin-sessions.css';

// ... (reuse the same interfaces as admin)

export default function SuperAdminSessionReviewPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sessionData, setSessionData] = useState<any | null>(null);
  const [adminReviews, setAdminReviews] = useState<any[]>([]);
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
    if ((session.user as any)?.role !== "SUPER_ADMIN") {
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
        router.push('/super-admin/sessions');
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

  // ... (reuse formatDate, formatDuration, and the rest of the admin review page)

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
            <h1 className="admin-sessions-title">Super Admin: Session Review</h1>
            <p className="admin-sessions-subtitle">Review completed session before payment approval (Super Admin)</p>
          </div>
          <div className="admin-sessions-header-right">
            <Link href="/super-admin/sessions" className="admin-back-btn">
              <i className="fas fa-arrow-left"></i>
              Back to Sessions
            </Link>
          </div>
        </div>
      </div>
      {/* ... (reuse the rest of the admin review page UI) ... */}
    </div>
  );
}