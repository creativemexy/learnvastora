"use client";

export const dynamic = 'force-dynamic';

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import NotificationIcon from "@/components/NotificationIcon";
import { format } from "date-fns";
import TutorNavBar from '@/components/TutorNavBar';

interface Session {
  id: string;
  scheduledAt: string;
  status: string;
  student: { name: string; email: string } | null;
  duration: number;
  subject?: string;
  notes?: string;
}

export default function TutorSessionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'cancelled'>('upcoming');

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
    
    fetchSessions();
  }, [session, status, router]);

  const fetchSessions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tutor/sessions");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch sessions");
      }
      const data = await res.json();
      setSessions(data || []);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { class: string; text: string } } = {
      PENDING: { class: "bg-warning", text: "Pending" },
      CONFIRMED: { class: "bg-success", text: "Confirmed" },
      IN_PROGRESS: { class: "bg-primary", text: "In Progress" },
      COMPLETED: { class: "bg-secondary", text: "Completed" },
      CANCELLED: { class: "bg-danger", text: "Cancelled" }
    };
    
    const statusInfo = statusMap[status] || { class: "bg-secondary", text: status };
    return <span className={`badge ${statusInfo.class}`}>{statusInfo.text}</span>;
  };

  const formatDateTime = (dateString: string) => {
    const d = new Date(dateString);
    return format(d, "MMM dd, yyyy 'at' h:mm a");
  };

  const getFilteredSessions = () => {
    switch (activeTab) {
      case 'upcoming':
        return sessions.filter(s => ['PENDING', 'CONFIRMED'].includes(s.status));
      case 'completed':
        return sessions.filter(s => s.status === 'COMPLETED');
      case 'cancelled':
        return sessions.filter(s => s.status === 'CANCELLED');
      default:
        return sessions;
    }
  };

  const handleJoinSession = (sessionId: string) => {
    router.push(`/sessions/${sessionId}`);
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      </div>
    );
  }

  const filteredSessions = getFilteredSessions();

  return (
    <div className="min-vh-100 cambly-bg d-flex flex-column">
      <TutorNavBar />
      
      <div className="container cambly-container mt-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="cambly-title mb-0">My Sessions</h2>
          <Link href="/tutor/schedule" className="btn cambly-btn">
            <i className="fas fa-calendar-plus me-2"></i>
            Schedule Session
          </Link>
        </div>

        {/* Stats Bar */}
        <div className="cambly-stats-bar mb-4">
          <div className="row text-center">
            <div className="col">
              <div className="cambly-stat">
                <div className="cambly-stat-number">{sessions.filter(s => ['PENDING', 'CONFIRMED'].includes(s.status)).length}</div>
                <div className="cambly-stat-label">Upcoming</div>
              </div>
            </div>
            <div className="col">
              <div className="cambly-stat">
                <div className="cambly-stat-number">{sessions.filter(s => s.status === 'COMPLETED').length}</div>
                <div className="cambly-stat-label">Completed</div>
              </div>
            </div>
            <div className="col">
              <div className="cambly-stat">
                <div className="cambly-stat-number">{sessions.filter(s => s.status === 'IN_PROGRESS').length}</div>
                <div className="cambly-stat-label">In Progress</div>
              </div>
            </div>
            <div className="col">
              <div className="cambly-stat">
                <div className="cambly-stat-number">{sessions.filter(s => s.status === 'CANCELLED').length}</div>
                <div className="cambly-stat-label">Cancelled</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <ul className="nav cambly-tabs mb-4">
          <li className="nav-item">
            <button 
              className={`nav-link cambly-tab${activeTab === 'upcoming' ? ' active' : ''}`} 
              onClick={() => setActiveTab('upcoming')}
            >
              Upcoming Sessions
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link cambly-tab${activeTab === 'completed' ? ' active' : ''}`} 
              onClick={() => setActiveTab('completed')}
            >
              Completed Sessions
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link cambly-tab${activeTab === 'cancelled' ? ' active' : ''}`} 
              onClick={() => setActiveTab('cancelled')}
            >
              Cancelled Sessions
            </button>
          </li>
        </ul>

        {/* Sessions List */}
        <div className="cambly-sessions-list">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-5">
              <div className="text-muted">
                <i className="fas fa-calendar-times fa-3x mb-3"></i>
                <h5>No {activeTab} sessions</h5>
                <p>You don&apos;t have any {activeTab} sessions at the moment.</p>
                {activeTab === 'upcoming' && (
                  <Link href="/tutor/schedule" className="btn cambly-btn">
                    Schedule a Session
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="row">
              {filteredSessions.map((session) => (
                <div key={session.id} className="col-12 mb-3">
                  <div className="card cambly-card">
                    <div className="card-body">
                      <div className="row align-items-center">
                        <div className="col-md-3">
                          <div className="d-flex align-items-center">
                            <div className="cambly-avatar me-3">
                              <i className="fas fa-user"></i>
                            </div>
                            <div>
                              <h6 className="mb-1">{session.student?.name || 'Student'}</h6>
                              <small className="text-muted">{session.student?.email}</small>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-3">
                          <div className="text-muted">
                            <i className="fas fa-clock me-2"></i>
                            {formatDateTime(session.scheduledAt)}
                          </div>
                          <div className="text-muted">
                            <i className="fas fa-hourglass-half me-2"></i>
                            {session.duration} minutes
                          </div>
                        </div>
                        <div className="col-md-2">
                          {getStatusBadge(session.status)}
                        </div>
                        <div className="col-md-2">
                          {session.subject && (
                            <div className="text-muted">
                              <i className="fas fa-book me-2"></i>
                              {session.subject}
                            </div>
                          )}
                        </div>
                        <div className="col-md-2 text-end">
                          {session.status === 'CONFIRMED' && (
                            <button 
                              className="btn cambly-btn btn-sm me-2"
                              onClick={() => handleJoinSession(session.id)}
                            >
                              <i className="fas fa-video me-1"></i>
                              Join
                            </button>
                          )}
                          <Link 
                            href={`/sessions/${session.id}`} 
                            className="btn cambly-btn-outline btn-sm"
                          >
                            <i className="fas fa-eye me-1"></i>
                            View
                          </Link>
                        </div>
                      </div>
                      {session.notes && (
                        <div className="mt-3 pt-3 border-top">
                          <small className="text-muted">
                            <i className="fas fa-sticky-note me-2"></i>
                            {session.notes}
                          </small>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 