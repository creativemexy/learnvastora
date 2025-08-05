import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ClassCardProps {
  booking: {
    id: string;
    studentName: string;
    scheduledAt: string;
    status: string;
  };
  formatDate: (dateString: string) => string;
  getStatusBadge: (status: string) => { class: string; text: string };
  onCancel?: (bookingId: string) => void;
  onReschedule?: (bookingId: string) => void;
  onMessage?: (bookingId: string) => void;
}

export const ClassCard: React.FC<ClassCardProps> = ({
  booking,
  formatDate,
  getStatusBadge,
  onCancel,
  onReschedule,
  onMessage
}) => {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  
  const statusInfo = getStatusBadge(booking.status);
  
  const handleJoinSession = () => {
    if (typeof window !== 'undefined' && localStorage.getItem('stabilityTestPassed') !== 'true') {
      router.push(`/tutor/stability-test?redirect=/sessions/${booking.id}`);
    } else {
      router.push(`/sessions/${booking.id}`);
    }
  };
  
  const handleCancel = () => {
    if (onCancel) {
      onCancel(booking.id);
    }
  };
  
  const handleReschedule = () => {
    setShowMenu(false);
    if (onReschedule) {
      onReschedule(booking.id);
    }
  };
  
  const handleMessage = () => {
    setShowMenu(false);
    if (onMessage) {
      onMessage(booking.id);
    }
  };
  
  return (
    <div className="ultra-class-card">
      <div className="ultra-class-header">
        <div className="ultra-class-avatar">
          {booking.studentName[0]}
        </div>
        <div className="ultra-class-info">
          <h5>{booking.studentName}</h5>
          <small>Student</small>
        </div>
      </div>
      
      <div className="ultra-class-details">
        <div className="ultra-class-date">
          <i className="fas fa-clock"></i>
          {formatDate(booking.scheduledAt)}
        </div>
        <div className="mt-2">
          <span className={`ultra-status-badge ${statusInfo.class}`}>
            {statusInfo.text}
          </span>
        </div>
      </div>
      
      <div className="ultra-class-actions">
        <button
          className="ultra-action-btn primary"
          title="Join Session"
          onClick={handleJoinSession}
        >
          <i className="fas fa-video"></i>
        </button>
        
        <button 
          className="ultra-action-btn"
          title="More Options"
          onClick={() => setShowMenu(!showMenu)}
        >
          <i className="fas fa-ellipsis-h"></i>
        </button>
        
        <button 
          className="ultra-action-btn danger"
          title="Cancel Session"
          onClick={handleCancel}
        >
          <i className="fas fa-times"></i>
        </button>
      </div>
      
      {/* Dropdown Menu */}
      {showMenu && (
        <div className="ultra-dropdown-menu">
          <button className="ultra-dropdown-item" onClick={handleReschedule}>
            <i className="fas fa-calendar-alt me-2"></i>
            Reschedule
          </button>
          <button className="ultra-dropdown-item" onClick={handleMessage}>
            <i className="fas fa-comment me-2"></i>
            Message Student
          </button>
        </div>
      )}
    </div>
  );
}; 