"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import Link from "next/link";

interface OnlineStatus {
  isOnline: boolean;
  lastSeen: string;
}

interface TutorProfile {
  instantBookingEnabled: boolean;
  instantBookingPrice: number;
  responseTime: number;
}

export default function OnlineTogglePage() {
  const [onlineStatus, setOnlineStatus] = useState<OnlineStatus | null>(null);
  const [tutorProfile, setTutorProfile] = useState<TutorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/auth/signin");
      return;
    }

    fetchOnlineStatus();
    fetchTutorProfile();
  }, [session, status, router]);

  const fetchOnlineStatus = async () => {
    try {
      const response = await fetch("/api/tutor/online-status");
      if (response.ok) {
        const data = await response.json();
        setOnlineStatus(data);
      }
    } catch (error) {
      console.error("Error fetching online status:", error);
    }
  };

  const fetchTutorProfile = async () => {
    try {
      const response = await fetch("/api/tutor/profile");
      if (response.ok) {
        const data = await response.json();
        setTutorProfile(data);
      }
    } catch (error) {
      console.error("Error fetching tutor profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateOnlineStatus = async (isOnline: boolean) => {
    setSaving(true);
    try {
      const response = await fetch("/api/tutor/online-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOnline }),
      });

      if (response.ok) {
        setOnlineStatus({ ...onlineStatus!, isOnline });
        toast.success(`You are now ${isOnline ? 'online' : 'offline'}`);
      } else {
        toast.error("Failed to update online status");
      }
    } catch (error) {
      toast.error("Error updating online status");
    } finally {
      setSaving(false);
    }
  };

  const updateInstantBookingSettings = async (settings: Partial<TutorProfile>) => {
    setSaving(true);
    try {
      const response = await fetch("/api/tutor/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setTutorProfile({ ...tutorProfile!, ...settings });
        toast.success("Instant booking settings updated");
      } else {
        toast.error("Failed to update settings");
      }
    } catch (error) {
      toast.error("Error updating settings");
    } finally {
      setSaving(false);
    }
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
          <Link href="/tutor/dashboard" className="navbar-brand fw-bold">LanguageConnect</Link>
          <div className="navbar-nav ms-auto">
            <Link href="/tutor/dashboard" className="nav-link">
              <i className="bi bi-arrow-left me-2"></i>Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-8 col-lg-6">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white">
                <h2 className="h3 fw-bold text-primary mb-0">
                  <i className="bi bi-toggle-on me-2"></i>
                  Online Status & Instant Booking
                </h2>
              </div>
              <div className="card-body p-4">
                {/* Online Status Toggle */}
                <div className="mb-4">
                  <h6 className="fw-semibold mb-3">Online Status</h6>
                  <div className="d-flex align-items-center justify-content-between p-3 bg-light rounded">
                    <div>
                      <div className="fw-semibold">Go Online</div>
                      <small className="text-muted">
                        Students can see you and request instant bookings
                      </small>
                    </div>
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="onlineToggle"
                        checked={onlineStatus?.isOnline || false}
                        onChange={(e) => updateOnlineStatus(e.target.checked)}
                        disabled={saving}
                      />
                      <label className="form-check-label" htmlFor="onlineToggle">
                        {onlineStatus?.isOnline ? 'Online' : 'Offline'}
                      </label>
                    </div>
                  </div>
                  {onlineStatus?.lastSeen && (
                    <small className="text-muted">
                      Last seen: {new Date(onlineStatus.lastSeen).toLocaleString()}
                    </small>
                  )}
                </div>

                {/* Instant Booking Settings */}
                <div className="mb-4">
                  <h6 className="fw-semibold mb-3">Instant Booking Settings</h6>
                  
                  {/* Enable Instant Booking */}
                  <div className="mb-3">
                    <div className="d-flex align-items-center justify-content-between p-3 bg-light rounded">
                      <div>
                        <div className="fw-semibold">Enable Instant Booking</div>
                        <small className="text-muted">
                          Allow students to book sessions immediately
                        </small>
                      </div>
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="instantBookingToggle"
                          checked={tutorProfile?.instantBookingEnabled || false}
                          onChange={(e) => updateInstantBookingSettings({ instantBookingEnabled: e.target.checked })}
                          disabled={saving}
                        />
                        <label className="form-check-label" htmlFor="instantBookingToggle">
                          {tutorProfile?.instantBookingEnabled ? 'Enabled' : 'Disabled'}
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Instant Booking Price */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Instant Session Price ($)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={tutorProfile?.instantBookingPrice || 10}
                      onChange={(e) => updateInstantBookingSettings({ instantBookingPrice: parseFloat(e.target.value) })}
                      disabled={saving}
                      min="1"
                      step="0.01"
                    />
                    <div className="form-text">Price for instant booking sessions</div>
                  </div>

                  {/* Response Time */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Average Response Time (minutes)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={tutorProfile?.responseTime || 5}
                      onChange={(e) => updateInstantBookingSettings({ responseTime: parseInt(e.target.value) })}
                      disabled={saving}
                      min="1"
                      max="60"
                    />
                    <div className="form-text">How quickly you typically respond to booking requests</div>
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="alert alert-info">
                  <h6 className="fw-semibold mb-2">
                    <i className="bi bi-info-circle me-2"></i>
                    Current Status
                  </h6>
                  <div className="row">
                    <div className="col-6">
                      <small className="text-muted">Online Status:</small>
                      <div className="fw-semibold">
                        {onlineStatus?.isOnline ? (
                          <span className="text-success">
                            <i className="bi bi-circle-fill me-1"></i>Online
                          </span>
                        ) : (
                          <span className="text-muted">
                            <i className="bi bi-circle me-1"></i>Offline
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="col-6">
                      <small className="text-muted">Instant Booking:</small>
                      <div className="fw-semibold">
                        {tutorProfile?.instantBookingEnabled ? (
                          <span className="text-success">
                            <i className="bi bi-check-circle me-1"></i>Enabled
                          </span>
                        ) : (
                          <span className="text-muted">
                            <i className="bi bi-x-circle me-1"></i>Disabled
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tips */}
                <div className="mt-4 p-3 bg-warning bg-opacity-10 rounded">
                  <h6 className="fw-semibold text-warning mb-2">
                    <i className="bi bi-lightbulb me-2"></i>
                    Tips for Instant Booking
                  </h6>
                  <ul className="small text-muted mb-0">
                    <li>Stay online during your available hours</li>
                    <li>Set a competitive price for instant sessions</li>
                    <li>Respond quickly to booking requests</li>
                    <li>Keep your availability updated</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 