import React from 'react';
import { format, startOfDay, endOfDay } from "date-fns";
import { Avatar } from '@/components/ui/avatar';

interface Booking {
  id: string;
  scheduledAt: string;
  status: string;
  student: { name: string; photo?: string } | null;
}

interface ScheduleDailyViewProps {
  currentDate: Date;
  activeTab: 'reservations' | 'priority' | 'available';
  upcomingBookings: Booking[];
  priorityHours: { [date: string]: string[] };
  availableTimes: { [date: string]: string[] };
  recurringSlots: { priorityHours: { [weekday: string]: string[] }, availableTimes: { [weekday: string]: string[] } };
  onDayClick: (date: Date, type: 'priority' | 'available') => void;
  onBookingClick: (booking: Booking) => void;
}

export function ScheduleDailyView({
  currentDate,
  activeTab,
  upcomingBookings,
  priorityHours,
  availableTimes,
  recurringSlots,
  onDayClick,
  onBookingClick
}: ScheduleDailyViewProps) {
  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // Generate daily view data
  const dayStart = startOfDay(currentDate);
  const dayEnd = endOfDay(currentDate);
  const dayKey = format(currentDate, 'yyyy-MM-dd');
  const dayBookings = activeTab === 'reservations' ? upcomingBookings.filter(b => {
    const d = new Date(b.scheduledAt);
    return d.getFullYear() === currentDate.getFullYear() &&
           d.getMonth() === currentDate.getMonth() &&
           d.getDate() === currentDate.getDate();
  }) : [];
  const dayPriority = activeTab === 'priority' ? (priorityHours[dayKey] || []) : [];
  const dayAvailable = activeTab === 'available' ? (availableTimes[dayKey] || []) : [];
  const dayRecurringPriority = activeTab === 'priority' ? (recurringSlots.priorityHours[weekdays[currentDate.getDay()]] || []) : [];
  const dayRecurringAvailable = activeTab === 'available' ? (recurringSlots.availableTimes[weekdays[currentDate.getDay()]] || []) : [];

  // Generate time slots for daily view (6 AM to 10 PM, 30-minute intervals)
  const timeSlots = [];
  const startHour = 6;
  const endHour = 22;
  const intervalMinutes = 30;
  
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += intervalMinutes) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const nextMinute = minute + intervalMinutes;
      const nextHour = nextMinute >= 60 ? hour + 1 : hour;
      const nextMinuteAdjusted = nextMinute >= 60 ? nextMinute - 60 : nextMinute;
      const nextTime = `${nextHour.toString().padStart(2, '0')}:${nextMinuteAdjusted.toString().padStart(2, '0')}`;
      const timeRange = `${time}-${nextTime}`;
      
      // Find events for this time slot
      const events = [
        ...dayBookings.filter(b => {
          const bookingTime = new Date(b.scheduledAt);
          const bookingHour = bookingTime.getHours();
          const bookingMinute = bookingTime.getMinutes();
          return bookingHour === hour && bookingMinute >= minute && bookingMinute < minute + intervalMinutes;
        }),
        ...dayPriority.filter(slot => {
          const slotStart = slot.split('-')[0];
          return slotStart === time;
        }),
        ...dayAvailable.filter(slot => {
          const slotStart = slot.split('-')[0];
          return slotStart === time;
        }),
        ...dayRecurringPriority.filter(slot => {
          const slotStart = slot.split('-')[0];
          return slotStart === time;
        }),
        ...dayRecurringAvailable.filter(slot => {
          const slotStart = slot.split('-')[0];
          return slotStart === time;
        })
      ];
      
      timeSlots.push({
        time,
        timeRange,
        events,
        hour,
        minute
      });
    }
  }

  return (
    <div className="ultra-daily-view">
      <div className="ultra-daily-timeline">
        {timeSlots.map((slot, index) => {
          const isHourHeader = slot.minute === 0;
          const isPast = new Date() > new Date(currentDate.setHours(slot.hour, slot.minute));
          const isCurrent = Math.abs(new Date().getTime() - new Date(currentDate.setHours(slot.hour, slot.minute)).getTime()) < 30 * 60 * 1000;
          
          return (
            <div 
              key={index} 
              className={`ultra-daily-time-slot ${isHourHeader ? 'hour-header' : ''} ${isPast ? 'past' : ''} ${isCurrent ? 'current' : ''}`}
            >
              <div className="ultra-daily-time-info">
                <div className="ultra-daily-time">{slot.time}</div>
                {!isHourHeader && (
                  <div className="ultra-daily-time-label">30min</div>
                )}
              </div>
              <div className="ultra-daily-events">
                {slot.events.length > 0 ? (
                  slot.events.map((event: Booking | string, eventIndex) => {
                    if (typeof event === 'object' && event !== null && 'id' in event) {
                      // It's a booking/session
                      const booking = event as Booking;
                      const time = format(new Date(booking.scheduledAt), "h:mm a");
                      return (
                        <div key={eventIndex} className="ultra-daily-event session" onClick={() => onBookingClick(booking)}>
                          <div className="ultra-daily-event-header">
                            <Avatar 
                              src={booking.student?.photo} 
                              name={booking.student?.name || 'Student'} 
                              size="sm"
                              className="ultra-daily-avatar"
                            />
                            <span className="ultra-daily-event-name">
                              {booking.student?.name || 'Session'}
                            </span>
                          </div>
                          <span className="ultra-daily-session-duration">30min</span>
                        </div>
                      );
                    } else {
                      // It's a slot
                      const slotStr = event as string;
                      return (
                        <div key={eventIndex} className="ultra-daily-event available">
                          {slotStr}
                          <span className="ultra-daily-session-duration">30min</span>
                        </div>
                      );
                    }
                  })
                ) : (
                  <div className="ultra-daily-empty">
                    {isHourHeader ? `${slot.hour}:00 - No sessions` : 'Available for 30min session'}
                  </div>
                )}
                {!isHourHeader && slot.events.length === 0 && (
                  <button 
                    className="ultra-daily-add-button"
                    onClick={() => onDayClick(currentDate, 'priority')}
                  >
                    + Add Session
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 