import React from 'react';

interface ClassCardProps {
  id?: string;
  title?: string;
  student?: {
    name: string;
    email: string;
    photo?: string;
  };
  scheduledAt?: string;
  duration?: number;
  status?: string;
  price?: number;
  onClick?: () => void;
  // For compatibility with existing usage
  booking?: {
    id: string;
    studentName: string;
    scheduledAt: string;
    status: string;
  };
  formatDate?: (dateString: string) => string;
  getStatusBadge?: (status: string) => { class: string; text: string };
  onCancel?: (bookingId: string) => void;
  onReschedule?: (bookingId: string) => void;
  onMessage?: (bookingId: string) => void;
}

export const ClassCard: React.FC<ClassCardProps> = ({
  id,
  title,
  student,
  scheduledAt,
  duration,
  status,
  price,
  onClick,
  booking,
  formatDate,
  getStatusBadge,
  onCancel,
  onReschedule,
  onMessage
}) => {
  // Handle legacy booking prop structure
  const actualId = id || booking?.id;
  const actualTitle = title || `Session with ${booking?.studentName}`;
  const actualStudent = student || { name: booking?.studentName || 'Unknown', email: '', photo: undefined };
  const actualScheduledAt = scheduledAt || booking?.scheduledAt;
  const actualStatus = status || booking?.status;

  const formatDateTime = (dateString: string) => {
    if (formatDate) {
      return formatDate(dateString);
    }
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getStatusColor = (status: string) => {
    if (getStatusBadge) {
      return getStatusBadge(status).class;
    }
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    if (getStatusBadge) {
      return getStatusBadge(status).text;
    }
    return status;
  };

  return (
    <div 
      className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow cursor-pointer border border-gray-200"
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 truncate">{actualTitle}</h3>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(actualStatus || '')}`}>
          {getStatusText(actualStatus || '')}
        </span>
      </div>
      
      <div className="flex items-center space-x-3 mb-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold">
          {actualStudent.photo ? (
            <img src={actualStudent.photo} alt={actualStudent.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            actualStudent.name.charAt(0).toUpperCase()
          )}
        </div>
        <div>
          <p className="font-medium text-gray-900">{actualStudent.name}</p>
          <p className="text-sm text-gray-500">{actualStudent.email}</p>
        </div>
      </div>
      
      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-center space-x-2">
          <span className="text-gray-400">📅</span>
          <span>{formatDateTime(actualScheduledAt || '')}</span>
        </div>
        {duration && (
          <div className="flex items-center space-x-2">
            <span className="text-gray-400">⏱️</span>
            <span>{formatDuration(duration)}</span>
          </div>
        )}
        {price && (
          <div className="flex items-center space-x-2">
            <span className="text-gray-400">💰</span>
            <span>${price}</span>
          </div>
        )}
      </div>

      {/* Action buttons for legacy booking structure */}
      {booking && (onCancel || onReschedule || onMessage) && (
        <div className="flex justify-end space-x-2 mt-3 pt-3 border-t border-gray-200">
          {onMessage && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMessage(booking.id);
              }}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              💬 Message
            </button>
          )}
          {onReschedule && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReschedule(booking.id);
              }}
              className="text-yellow-600 hover:text-yellow-800 text-sm"
            >
              📅 Reschedule
            </button>
          )}
          {onCancel && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCancel(booking.id);
              }}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              ❌ Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
}; 