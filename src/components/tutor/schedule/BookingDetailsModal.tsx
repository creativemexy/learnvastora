import React from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';

interface Booking {
  id: string;
  scheduledAt: string;
  status: string;
  student: { name: string; photo?: string } | null;
}

interface BookingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  formatDateTime: (dateString: string) => string;
  getStatusBadge: (status: string) => { class: string; text: string };
  onCancelBooking: () => void;
}

export function BookingDetailsModal({
  isOpen,
  onClose,
  booking,
  formatDateTime,
  getStatusBadge,
  onCancelBooking
}: BookingDetailsModalProps) {
  if (!isOpen || !booking) return null;

  const statusInfo = getStatusBadge(booking.status);

  return (
    <div className="ultra-modal-overlay" onClick={onClose}>
      <div className="ultra-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ultra-modal-header">
          <h3 className="ultra-modal-title">Reservation Details</h3>
          <button className="ultra-modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="ultra-modal-body">
          <div className="ultra-form-group">
            <label className="ultra-form-label">Student</label>
            <div className="ultra-booking-student-info">
              <Avatar 
                src={booking.student?.photo} 
                name={booking.student?.name || 'Student'} 
                size="md"
                className="ultra-booking-avatar"
              />
              <div className="ultra-form-input" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
                {booking.student?.name || 'Session'}
              </div>
            </div>
          </div>
          
          <div className="ultra-form-group">
            <label className="ultra-form-label">Time</label>
            <div className="ultra-form-input" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
              {formatDateTime(booking.scheduledAt)}
            </div>
          </div>
          
          <div className="ultra-form-group">
            <label className="ultra-form-label">Status</label>
            <div>
              <span className={statusInfo.class}>{statusInfo.text}</span>
            </div>
          </div>
        </div>
        
        <div className="ultra-modal-footer">
          <Link href={`/sessions/${booking.id}`} className="ultra-button primary">
            📋 View Details
          </Link>
          <button className="ultra-button danger" onClick={onCancelBooking}>
            ❌ Cancel
          </button>
          <button className="ultra-button secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
} 