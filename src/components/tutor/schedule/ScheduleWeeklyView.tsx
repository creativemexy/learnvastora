import React from 'react';
import { format, startOfWeek, endOfWeek, addDays, isSameDay } from "date-fns";
import { Avatar } from '@/components/ui/avatar';

interface Booking {
  id: string;
  scheduledAt: string;
  status: string;
  student: { name: string; photo?: string } | null;
}

interface ScheduleWeeklyViewProps {
  currentWeek: Date;
  activeTab: 'reservations' | 'priority' | 'available';
  upcomingBookings: Booking[];
  priorityHours: { [date: string]: string[] };
  availableTimes: { [date: string]: string[] };
  recurringSlots: { priorityHours: { [weekday: string]: string[] }, availableTimes: { [weekday: string]: string[] } };
  onDayClick: (date: Date, type: 'priority' | 'available') => void;
  onBookingClick: (booking: Booking) => void;
}

export function ScheduleWeeklyView({
  currentWeek,
  activeTab,
  upcomingBookings,
  priorityHours,
  availableTimes,
  recurringSlots,
  onDayClick,
  onBookingClick
}: ScheduleWeeklyViewProps) {
  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // Generate weekly view data
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 0 });
  const weekDays = [];
  
  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i);
    const dateKey = format(day, 'yyyy-MM-dd');
    const bookingsForDay = activeTab === 'reservations' ? upcomingBookings.filter(b => {
      const d = new Date(b.scheduledAt);
      return d.getFullYear() === day.getFullYear() &&
             d.getMonth() === day.getMonth() &&
             d.getDate() === day.getDate();
    }) : [];
    const priorityForDay = activeTab === 'priority' ? (priorityHours[dateKey] || []) : [];
    const availableForDay = activeTab === 'available' ? (availableTimes[dateKey] || []) : [];
    const recurringPriority = activeTab === 'priority' ? (recurringSlots.priorityHours[weekdays[day.getDay()]] || []) : [];
    const recurringAvailable = activeTab === 'available' ? (recurringSlots.availableTimes[weekdays[day.getDay()]] || []) : [];
    
    weekDays.push({
      date: day,
      dateKey,
      bookings: bookingsForDay,
      priority: priorityForDay,
      available: availableForDay,
      recurringPriority,
      recurringAvailable
    });
  }

  return (
    <div className="ultra-weekly-view">
      <div className="ultra-weekly-grid">
        {weekDays.map((dayData, index) => (
          <div 
            key={index} 
            className={`ultra-weekly-day ${isSameDay(dayData.date, new Date()) ? 'today' : ''}`}
            onClick={() => onDayClick(dayData.date, 'priority')}
          >
            <div className="ultra-weekly-day-header">
              <div className="ultra-weekly-day-name">{format(dayData.date, 'EEE')}</div>
              <div className="ultra-weekly-day-date">{format(dayData.date, 'd')}</div>
            </div>
            <div className="ultra-weekly-events">
              {dayData.bookings.map(booking => {
                const time = format(new Date(booking.scheduledAt), "h:mm a");
                return (
                  <div key={booking.id} className="ultra-weekly-event" onClick={(e) => {
                    e.stopPropagation();
                    onBookingClick(booking);
                  }}>
                    <div className="ultra-weekly-event-header">
                      <Avatar 
                        src={booking.student?.photo} 
                        name={booking.student?.name || 'Student'} 
                        size="sm"
                        className="ultra-weekly-avatar"
                      />
                      <span className="ultra-weekly-event-name">
                        {booking.student?.name || 'Session'}
                      </span>
                    </div>
                    <span className="ultra-weekly-event-time">({time})</span>
                  </div>
                );
              })}
              {dayData.priority.map((slot, idx) => (
                <div key={slot+idx} className="ultra-weekly-event priority">
                  {slot}
                </div>
              ))}
              {dayData.available.map((slot, idx) => (
                <div key={slot+idx} className="ultra-weekly-event available">
                  {slot}
                </div>
              ))}
              {dayData.recurringPriority.map((slot, idx) => (
                <div key={slot+idx} className="ultra-weekly-event recurring priority">
                  {slot} <span className="ultra-recurring-indicator">(recurring)</span>
                </div>
              ))}
              {dayData.recurringAvailable.map((slot, idx) => (
                <div key={slot+idx} className="ultra-weekly-event available recurring">
                  {slot} <span className="ultra-recurring-indicator">(recurring)</span>
                </div>
              ))}
              {dayData.bookings.length === 0 && dayData.priority.length === 0 && 
               dayData.available.length === 0 && dayData.recurringPriority.length === 0 && 
               dayData.recurringAvailable.length === 0 && (
                <div className="ultra-weekly-empty">No events</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 