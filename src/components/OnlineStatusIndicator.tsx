"use client";

import { useState, useEffect } from "react";

interface OnlineStatusProps {
  tutorId: string;
  showDetails?: boolean;
}

export default function OnlineStatusIndicator({ tutorId, showDetails = false }: OnlineStatusProps) {
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [isAvailableForInstant, setIsAvailableForInstant] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/tutors/online-status?tutorIds=${tutorId}`);
        if (response.ok) {
          const data = await response.json();
          const tutor = data.tutors.find((t: any) => t.id === tutorId);
          if (tutor) {
            setIsOnline(tutor.isOnline);
            setLastSeen(tutor.lastSeen);
            setIsAvailableForInstant(tutor.isAvailableForInstant);
          }
        }
      } catch (error) {
        // handle error
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [tutorId]);

  if (loading) {
    return (
      <div className="d-flex align-items-center">
        <div className="spinner-border spinner-border-sm text-muted me-2" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <small className="text-muted">Checking status...</small>
      </div>
    );
  }

  const getStatusColor = () => {
    if (isAvailableForInstant) return "success";
    if (isOnline) return "warning";
    return "secondary";
  };

  const getStatusText = () => {
    if (isAvailableForInstant) return "Available for instant booking";
    if (isOnline) return "Online";
    return "Offline";
  };

  const getStatusIcon = () => {
    if (isAvailableForInstant) return "bi-lightning-charge";
    if (isOnline) return "bi-circle-fill";
    return "bi-circle";
  };

  return (
    <div className="d-flex align-items-center">
      <div className={`badge bg-${getStatusColor()} d-flex align-items-center me-2`}>
        <i className={`bi ${getStatusIcon()} me-1`}></i>
        {getStatusText()}
      </div>
      {showDetails && lastSeen && (
        <small className="text-muted">
          Last seen: {new Date(lastSeen).toLocaleTimeString()}
        </small>
      )}
    </div>
  );
} 