"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  type: string;
}

interface Message {
  id: string;
  content: string;
  sender: {
    name: string;
  };
  createdAt: string;
}

export default function NotificationIcon() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (session?.user) {
      fetchNotifications();
      fetchMessages();
    }
  }, [session]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/notifications", {
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
        updateUnreadCount(data, messages);
      } else {
        console.error("Failed to fetch notifications:", response.status);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch("/api/messages/unread", {
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
        updateUnreadCount(notifications, data);
      } else {
        console.error("Failed to fetch messages:", response.status);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const updateUnreadCount = (notifs: Notification[], msgs: Message[]) => {
    const unreadNotifications = notifs.filter(n => !n.isRead).length;
    const unreadMessages = msgs.length;
    setUnreadCount(unreadNotifications + unreadMessages);
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PUT",
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        // Update the notification locally instead of refetching
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? { ...notif, isRead: true }
              : notif
          )
        );
        updateUnreadCount(notifications, messages);
      } else {
        console.error("Failed to mark notification as read:", response.status);
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const refreshNotifications = () => {
    fetchNotifications();
    fetchMessages();
  };

  const closeDropdown = () => {
    setShowDropdown(false);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "SESSION_REMINDER":
        return "bi-calendar-event";
      case "SESSION_CANCELLED":
        return "bi-calendar-x";
      case "SESSION_RESCHEDULED":
        return "bi-calendar-check";
      case "PAYMENT_RECEIVED":
        return "bi-cash";
      case "REVIEW_RECEIVED":
        return "bi-star";
      case "INSTANT_BOOKING_REQUEST":
        return "bi-lightning";
      case "INSTANT_BOOKING_ACCEPTED":
        return "bi-check-circle";
      default:
        return "bi-bell";
    }
  };

  if (!session?.user) return null;

  return (
    <div className="position-relative">
      <style jsx>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .notification-dropdown {
          background: white;
          border: 1px solid rgba(0,0,0,0.1);
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }
        .notification-item {
          transition: background-color 0.2s ease;
        }
        .notification-item:hover {
          background-color: rgba(0,0,0,0.05);
        }
      `}</style>
      <button
        className="btn btn-link text-white position-relative"
        onClick={() => setShowDropdown(!showDropdown)}
        style={{ textDecoration: 'none' }}
      >
        <i className="bi bi-bell fs-5"></i>
        {unreadCount > 0 && (
          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div ref={dropdownRef} className="position-absolute top-100 end-0 mt-2 dropdown-menu show notification-dropdown" style={{ minWidth: '350px', maxHeight: '400px', overflowY: 'auto', zIndex: 1050 }}>
          <div className="dropdown-header d-flex justify-content-between align-items-center p-3 border-bottom">
            <h6 className="mb-0 fw-bold">Notifications</h6>
            <div className="d-flex gap-2">
              <button 
                className="btn btn-sm btn-outline-primary" 
                onClick={refreshNotifications}
                disabled={loading}
              >
                <i className={`bi ${loading ? 'bi-arrow-clockwise spin' : 'bi-arrow-clockwise'}`}></i>
              </button>
              <Link href="/notifications" className="btn btn-sm btn-outline-secondary text-decoration-none">
                View All
              </Link>
            </div>
          </div>
          
          <div className="dropdown-divider"></div>
          
          {notifications.length === 0 && messages.length === 0 ? (
            <div className="text-center py-3">
              <i className="bi bi-bell text-muted" style={{fontSize: '2rem'}}></i>
              <p className="text-muted mb-0 mt-2">No new notifications</p>
            </div>
          ) : (
            <div>
              {/* Recent Notifications */}
              {notifications.slice(0, 5).map((notification) => (
                <div key={notification.id} className="dropdown-item py-2 notification-item">
                  <div className="d-flex align-items-start">
                    <div className="flex-shrink-0 me-2">
                      <i className={`bi ${getNotificationIcon(notification.type)} text-primary`}></i>
                    </div>
                    <div className="flex-grow-1">
                      <div className="d-flex justify-content-between align-items-start">
                        <h6 className="mb-1 small fw-semibold">{notification.title}</h6>
                        <small className="text-muted">{formatTime(notification.createdAt)}</small>
                      </div>
                      <p className="mb-1 small text-muted">{notification.message}</p>
                      {!notification.isRead && (
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => markAsRead(notification.id)}
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Recent Messages */}
              {messages.slice(0, 3).map((message) => (
                <div key={message.id} className="dropdown-item py-2 notification-item">
                  <div className="d-flex align-items-start">
                    <div className="flex-shrink-0 me-2">
                      <i className="bi bi-chat-dots text-success"></i>
                    </div>
                    <div className="flex-grow-1">
                      <div className="d-flex justify-content-between align-items-start">
                        <h6 className="mb-1 small fw-semibold">New message from {message.sender.name}</h6>
                        <small className="text-muted">{formatTime(message.createdAt)}</small>
                      </div>
                      <p className="mb-1 small text-muted">{message.content.substring(0, 50)}...</p>
                    </div>
                  </div>
                </div>
              ))}

              <div className="dropdown-divider"></div>
              
              <div className="dropdown-item text-center">
                <Link href="/notifications" className="btn btn-outline-primary btn-sm">
                  <i className="bi bi-bell me-2"></i>
                  View All Notifications
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 