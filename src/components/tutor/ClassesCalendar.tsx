import React, { useMemo } from 'react';
import { ClassCard } from './ClassCard';

interface ClassesCalendarProps {
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

export const ClassesCalendar: React.FC<ClassesCalendarProps> = ({
  bookings,
  searchQuery,
  formatDate,
  getStatusBadge,
  onCancel,
  onReschedule,
  onMessage
}) => {
  // Memoize processed data for performance
  const { filteredBookings, bookingsByDate, sortedDates } = useMemo(() => {
    // Filter bookings by search query
    const filtered = searchQuery.trim() 
      ? bookings.filter(booking =>
          booking.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          booking.status.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : bookings;
    
    // Group by date
    const byDate = new Map<string, typeof bookings>();
    filtered.forEach(booking => {
      const date = new Date(booking.scheduledAt).toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: '2-digit', 
        year: '2-digit' 
      });
      
      if (!byDate.has(date)) {
        byDate.set(date, []);
      }
      byDate.get(date)!.push(booking);
    });
    
    // Sort dates
    const sorted = Array.from(byDate.keys()).sort((a, b) => {
      const [da, ma, ya] = a.split('.');
      const [db, mb, yb] = b.split('.');
      const dateA = new Date(`20${ya}-${ma}-${da}`);
      const dateB = new Date(`20${yb}-${mb}-${db}`);
      return dateA.getTime() - dateB.getTime();
    });
    
    return { filteredBookings: filtered, bookingsByDate: byDate, sortedDates: sorted };
  }, [bookings, searchQuery]);
  
  if (filteredBookings.length === 0) {
    return (
      <div className="text-center text-white py-5 w-100">
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
    <div className="ultra-calendar-container">
      {sortedDates.map((date, idx) => (
        <div key={idx} className="ultra-calendar-day">
          <div className="ultra-calendar-date">{date}</div>
          {bookingsByDate.get(date)!.map((booking, cidx) => (
            <div key={cidx} className="ultra-class-card mb-3">
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
      ))}
    </div>
  );
}; 