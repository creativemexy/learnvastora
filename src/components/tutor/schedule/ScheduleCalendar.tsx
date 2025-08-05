import React from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay } from "date-fns";
import { Avatar } from '@/components/ui/avatar';

interface Booking {
  id: string;
  scheduledAt: string;
  status: string;
  student: { name: string; photo?: string } | null;
}

interface ScheduleCalendarProps {
  currentMonth: Date;
  activeTab: 'reservations' | 'priority' | 'available';
  upcomingBookings: Booking[];
  priorityHours: { [date: string]: string[] };
  availableTimes: { [date: string]: string[] };
  recurringSlots: { priorityHours: { [weekday: string]: string[] }, availableTimes: { [weekday: string]: string[] } };
  onDayClick: (date: Date, type: 'priority' | 'available') => void;
  onBookingClick: (booking: Booking) => void;
}

export function ScheduleCalendar({
  currentMonth,
  activeTab,
  upcomingBookings,
  priorityHours,
  availableTimes,
  recurringSlots,
  onDayClick,
  onBookingClick
}: ScheduleCalendarProps) {
  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // Generate calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
  
  const rows = [];
  let days = [];
  let day = startDate;

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      const formattedDate = format(day, "d");
      const cloneDay = day;
      const dateKey = format(cloneDay, 'yyyy-MM-dd');
      
      // Find bookings for this day
      const bookingsForDay = activeTab === 'reservations' ? upcomingBookings.filter(b => {
        const d = new Date(b.scheduledAt);
        return d.getFullYear() === cloneDay.getFullYear() &&
               d.getMonth() === cloneDay.getMonth() &&
               d.getDate() === cloneDay.getDate();
      }) : [];
      
      // Priority/Available slots for this day
      const priorityForDay = activeTab === 'priority' ? (priorityHours[dateKey] || []) : [];
      const availableForDay = activeTab === 'available' ? (availableTimes[dateKey] || []) : [];
      const recurringPriority = activeTab === 'priority' ? (recurringSlots.priorityHours[weekdays[cloneDay.getDay()]] || []) : [];
      const recurringAvailable = activeTab === 'available' ? (recurringSlots.availableTimes[weekdays[cloneDay.getDay()]] || []) : [];
      
      days.push(
        <td key={day.toString()} className={`ultra-calendar-cell ${!isSameMonth(day, monthStart) ? 'other-month' : ''} ${isSameDay(day, new Date()) ? 'today' : ''}`}>
          <div className="ultra-calendar-date">{formattedDate}</div>
          
          {/* Render reservations */}
          {bookingsForDay.map(booking => {
            const time = format(new Date(booking.scheduledAt), "h:mm a");
            return (
              <div key={booking.id} className="ultra-calendar-event" onClick={() => onBookingClick(booking)}>
                <div className="ultra-calendar-event-header">
                  <Avatar 
                    src={booking.student?.photo} 
                    name={booking.student?.name || 'Student'} 
                    size="sm"
                    className="ultra-calendar-avatar"
                  />
                  <span className="ultra-calendar-event-name">
                    {booking.student?.name || 'Session'}
                  </span>
                </div>
                <span className="ultra-calendar-event-time">{time}</span>
              </div>
            );
          })}
          
          {/* Render priority hours blocks */}
          {priorityForDay.map((slot, idx) => (
            <div key={slot+idx} className="ultra-calendar-event priority" onClick={() => onDayClick(cloneDay, 'priority')}>
              {slot}
            </div>
          ))}
          
          {/* Render available time blocks */}
          {availableForDay.map((slot, idx) => (
            <div key={slot+idx} className="ultra-calendar-event available" onClick={() => onDayClick(cloneDay, 'available')}>
              {slot}
            </div>
          ))}
          
          {/* Render recurring priority hours blocks */}
          {recurringPriority.map((slot, idx) => (
            <div key={slot+idx} className="ultra-calendar-event recurring priority">
              {slot} <span className="ultra-recurring-indicator">(recurring)</span>
            </div>
          ))}
          
          {/* Render recurring available time blocks */}
          {recurringAvailable.map((slot, idx) => (
            <div key={slot+idx} className="ultra-calendar-event available recurring">
              {slot} <span className="ultra-recurring-indicator">(recurring)</span>
            </div>
          ))}
          
          {/* Add button for empty day in priority/available tab */}
          {(activeTab === 'priority' && priorityForDay.length === 0 && recurringPriority.length === 0) && (
            <button className="ultra-calendar-add-button" onClick={() => onDayClick(cloneDay, 'priority')}>
              + Add Priority
            </button>
          )}
          {(activeTab === 'available' && availableForDay.length === 0 && recurringAvailable.length === 0) && (
            <button className="ultra-calendar-add-button" onClick={() => onDayClick(cloneDay, 'available')}>
              + Add Available
            </button>
          )}
        </td>
      );
      day = addDays(day, 1);
    }
    rows.push(<tr key={day.toString()}>{days}</tr>);
    days = [];
  }

  return (
    <div className="ultra-calendar-wrapper">
      <table className="ultra-calendar-table">
        <thead>
          <tr className="ultra-calendar-header">
            <th>Sun</th>
            <th>Mon</th>
            <th>Tue</th>
            <th>Wed</th>
            <th>Thu</th>
            <th>Fri</th>
            <th>Sat</th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );
} 