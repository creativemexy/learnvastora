import React, { useMemo } from 'react';
import { ClassCard } from './ClassCard';

interface ClassesGridProps {
  bookings: Array<{
    id: string;
    studentName: string;
    scheduledAt: string;
    status: string;
  }>;
  searchQuery: string;
  formatDate: (dateString: string) => string;
  getStatusBadge: (status: string) => { class: string; text: string };
  onCancel?: (bookingId: string) => void;
  onReschedule?: (bookingId: string) => void;
  onMessage?: (bookingId: string) => void;
}

export const ClassesGrid: React.FC<ClassesGridProps> = ({
  bookings,
  searchQuery,
  formatDate,
  getStatusBadge,
  onCancel,
  onReschedule,
  onMessage
}) => {
  // Memoize filtered bookings for performance
  const filteredBookings = useMemo(() => {
    if (!searchQuery.trim()) {
      return bookings;
    }
    
    const query = searchQuery.toLowerCase();
    return bookings.filter(booking =>
      booking.studentName.toLowerCase().includes(query) ||
      booking.status.toLowerCase().includes(query)
    );
  }, [bookings, searchQuery]);
  
  if (filteredBookings.length === 0) {
    return (
      <div className="col-12 text-center text-white py-5">
        <i className="fas fa-calendar-times fa-3x mb-3"></i>
        <h4>
          {searchQuery.trim() ? 'No classes found' : 'No upcoming classes'}
        </h4>
        <p>
          {searchQuery.trim() 
            ? 'Try adjusting your search criteria' 
            : 'Your scheduled classes will appear here'
          }
        </p>
      </div>
    );
  }
  
  return (
    <div className="row g-4">
      {filteredBookings.map((booking, idx) => (
        <div key={booking.id} className="col-md-6 col-lg-4">
          <ClassCard
            booking={booking}
            formatDate={formatDate}
            getStatusBadge={getStatusBadge}
            onCancel={onCancel}
            onReschedule={onReschedule}
            onMessage={onMessage}
          />
        </div>
      ))}
    </div>
  );
}; 