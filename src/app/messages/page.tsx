"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StudentNavbar from "@/components/StudentNavbar";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import './messages-premium.css';

interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  senderRole: 'STUDENT' | 'TUTOR';
  bookingId: string;
  createdAt: string;
  isRead: boolean;
  attachments?: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
  }>;
}

interface Conversation {
  id: string;
  bookingId: string;
  tutorName: string;
  tutorAvatar?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  booking: {
    scheduledAt: string;
    status: string;
    topic?: string;
  };
  isOnline?: boolean;
  lastSeen?: string;
}

export default function MessagesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useTranslation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messagingAllowed, setMessagingAllowed] = useState(false);
  const [timeUntilSession, setTimeUntilSession] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check if messaging is allowed (10 minutes before session)
  const checkMessagingAllowed = useCallback((conversation: Conversation) => {
    if (!conversation.booking.scheduledAt) return false;
    
    const sessionTime = new Date(conversation.booking.scheduledAt);
    const now = new Date();
    const timeDiff = sessionTime.getTime() - now.getTime();
    const minutesUntilSession = Math.floor(timeDiff / (1000 * 60));
    
    // Allow messaging 10 minutes before session
    const allowed = minutesUntilSession <= 10 && minutesUntilSession >= -60; // Allow 10 min before to 1 hour after
    
    if (allowed) {
      if (minutesUntilSession > 0) {
        setTimeUntilSession(`${minutesUntilSession} ${t('messages.minutes')} ${t('messages.time_until_session')}`);
      } else if (minutesUntilSession < 0) {
        const hoursAfter = Math.abs(Math.floor(minutesUntilSession / 60));
        setTimeUntilSession(`${t('messages.session_ended')} ${hoursAfter} ${hoursAfter > 1 ? t('messages.hours_ago') : t('messages.hour_ago')}`);
      } else {
        setTimeUntilSession(t('messages.session_in_progress'));
      }
    } else {
      setTimeUntilSession(`${t('messages.messaging_opens_in')} ${minutesUntilSession - 10} ${t('messages.minutes')}`);
    }
    
    setMessagingAllowed(allowed);
    return allowed;
  }, [t]);

  // Fetch conversations from API
  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/conversations');
      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }
      
      const data = await response.json();
      
      // Transform API data to match our interface
      const transformedConversations: Conversation[] = data.map((conv: any) => ({
        id: conv.id,
        bookingId: conv.bookingId,
        tutorName: conv.tutorName,
        tutorAvatar: conv.tutorAvatar,
        lastMessage: conv.lastMessage,
        lastMessageTime: conv.lastMessageTime,
        unreadCount: conv.unreadCount,
        booking: {
          scheduledAt: conv.booking.scheduledAt,
          status: conv.booking.status,
          topic: conv.booking.topic
        },
        isOnline: false, // Will be updated with real-time data
        lastSeen: new Date().toISOString()
      }));
      
      setConversations(transformedConversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      setError('Failed to load conversations');
      toast.error("Failed to load conversations");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch messages for a specific conversation
  const fetchMessages = useCallback(async (bookingId: string) => {
    try {
      // Silent fetch - no loading state
      const response = await fetch(`/api/messages?bookingId=${bookingId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();
      const transformedMessages: Message[] = data.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        senderId: msg.senderId,
        senderName: msg.sender.name,
        senderRole: msg.sender.role,
        bookingId: msg.bookingId,
        createdAt: msg.createdAt,
        isRead: msg.isRead,
        attachments: msg.attachments || []
      }));

      setMessages(transformedMessages);
      setError(null);
    } catch (error) {
      console.error("Error fetching messages:", error);
      setError("Failed to load messages");
    }
  }, []);

  // Send a new message
  const sendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || sending) return;
    
    // Check if messaging is allowed
    if (!messagingAllowed) {
      toast.error('Messaging is only available 10 minutes before your session');
      return;
    }

    try {
      setSending(true);
      
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
        bookingId: selectedConversation.bookingId,
          content: newMessage.trim()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const newMessageData = await response.json();
      
      // Add the new message to the messages list
      const transformedMessage: Message = {
        id: newMessageData.id,
        content: newMessageData.content,
        senderId: newMessageData.senderId,
        senderName: newMessageData.sender.name,
        senderRole: newMessageData.sender.role,
        bookingId: newMessageData.bookingId,
        createdAt: newMessageData.createdAt,
        isRead: true,
        attachments: []
      };

      setMessages(prev => [...prev, transformedMessage]);
      setNewMessage('');
      
      // Update conversation last message
      setConversations(prev => 
        prev.map(conv => 
          conv.id === selectedConversation.id 
            ? { 
                ...conv, 
                lastMessage: newMessage.trim(), 
                lastMessageTime: new Date().toISOString(), 
                unreadCount: 0 
              }
            : conv
        )
      );

      toast.success("Message sent!");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  }, [newMessage, selectedConversation, sending, messagingAllowed]);

  // Start polling for real-time updates
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = setInterval(async () => {
      // Silent background refresh - no loading states or UI changes
      try {
        if (selectedConversation) {
          // Fetch messages silently
          const response = await fetch(`/api/messages?bookingId=${selectedConversation.bookingId}`);
          if (response.ok) {
            const data = await response.json();
            const transformedMessages: Message[] = data.map((msg: any) => ({
              id: msg.id,
              content: msg.content,
              senderId: msg.senderId,
              senderName: msg.sender.name,
              senderRole: msg.sender.role,
              bookingId: msg.bookingId,
              createdAt: msg.createdAt,
              isRead: msg.isRead,
              attachments: msg.attachments || []
            }));
            
            // Only update if messages have changed (silent update)
            setMessages(prev => {
              if (JSON.stringify(prev) !== JSON.stringify(transformedMessages)) {
                return transformedMessages;
              }
              return prev;
            });
          }
        }

        // Only update conversations if not currently in a conversation to avoid UI flicker
        if (!selectedConversation) {
          const response = await fetch('/api/conversations');
          if (response.ok) {
            const data = await response.json();
            const transformedConversations: Conversation[] = data.map((conv: any) => ({
              id: conv.id,
              bookingId: conv.bookingId,
              tutorName: conv.tutorName,
              tutorAvatar: conv.tutorAvatar,
              lastMessage: conv.lastMessage,
              lastMessageTime: conv.lastMessageTime,
              unreadCount: conv.unreadCount,
              booking: {
                scheduledAt: conv.booking.scheduledAt,
                status: conv.booking.status,
                topic: conv.booking.topic
              },
              isOnline: conv.isOnline || false,
              lastSeen: conv.lastSeen || new Date().toISOString()
            }));
            
            // Only update if conversations have changed (silent update)
            setConversations(prev => {
              if (JSON.stringify(prev) !== JSON.stringify(transformedConversations)) {
                return transformedConversations;
              }
              return prev;
            });
          }
        }
      } catch (error) {
        // Silent error handling - no UI feedback
        console.error('Background refresh error:', error);
      }
    }, 5000); // Poll every 5 seconds silently
  }, [selectedConversation]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Format time for display with more detail
  const formatTime = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffHours < 48) return "Yesterday";
    return date.toLocaleDateString();
  }, []);

  // Format message time for display
  const formatMessageTime = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  // Filter conversations based on search
  const filteredConversations = conversations.filter(conv =>
    conv.tutorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle typing indicator
  const handleTyping = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    // In a real implementation, you would emit a typing event to the server
    // For now, we'll just update the local state
  }, []);

  // Handle conversation selection
  const handleConversationSelect = useCallback((conversation: Conversation) => {
    console.log('Selecting conversation:', conversation);
    setSelectedConversation(conversation);
    setNewMessage(''); // Clear input when switching conversations
    setError(null);
    
    // Check if messaging is allowed for this conversation
    checkMessagingAllowed(conversation);
  }, [checkMessagingAllowed]);

  // Handle message input with auto-resize
  const handleMessageInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    // Auto-resize the input (if using textarea)
    if (messageInputRef.current) {
      messageInputRef.current.style.height = 'auto';
      messageInputRef.current.style.height = messageInputRef.current.scrollHeight + 'px';
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    console.log('Session status:', status);
    console.log('Session data:', session);
    
    if (status === "loading") return;
    
    if (!session) {
      console.log('No session, redirecting to signin');
      router.push("/auth/signin");
      return;
    }

    console.log('User role:', (session.user as any)?.role);
    if ((session.user as any)?.role !== "STUDENT") {
      console.log('Not a student, redirecting to home');
      router.push("/");
      return;
    }

    console.log('Fetching conversations...');
    fetchConversations();
  }, [session, status, router, fetchConversations]);

  // Fetch messages when conversation is selected
  useEffect(() => {
    console.log('Selected conversation changed:', selectedConversation);
    if (selectedConversation) {
      console.log('Fetching messages for bookingId:', selectedConversation.bookingId);
      fetchMessages(selectedConversation.bookingId);
    } else {
      console.log('No conversation selected, clearing messages');
      setMessages([]);
    }
  }, [selectedConversation, fetchMessages]);

  // Start/stop polling based on conversation selection
  useEffect(() => {
    if (selectedConversation) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => stopPolling();
  }, [selectedConversation, startPolling, stopPolling]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  if (status === "loading" || loading) {
    return (
      <div className="premium-loading-container">
        <div className="premium-loading-content">
          <div className="premium-spinner">
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
          </div>
          <h3>Loading Messages</h3>
          <p>Preparing your premium messaging experience...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="messages-page-wrapper">
      <StudentNavbar />
      <div className="premium-messages-container">
        
        <div className="premium-messages-layout">
          {/* Premium Conversations Sidebar */}
          <div className="premium-conversations-sidebar">
            <div className="premium-sidebar-header">
              <div className="premium-header-content">
                <h2 className="premium-title">
                  <span className="premium-icon">💬</span>
                  Messages
                </h2>
                <div className="premium-badge">
                  {conversations.reduce((acc, conv) => acc + conv.unreadCount, 0)}
                </div>
              </div>
              <div className="premium-search-container">
                <div className="premium-search-input">
                  <span className="search-icon">🔍</span>
                <input
                  type="text"
                    placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                    className="premium-search-field"
                />
                </div>
              </div>
            </div>
            
            <div className="premium-conversations-list">
              {error && (
                <div className="premium-error-message">
                  <span className="error-icon">⚠️</span>
                  <p>{error}</p>
                  <button 
                    onClick={fetchConversations}
                    className="premium-retry-btn"
                  >
                    Retry
                  </button>
                </div>
              )}
              
                {filteredConversations.map(conversation => (
                  <div
                    key={conversation.id}
                    className={`premium-conversation-item ${selectedConversation?.id === conversation.id ? 'premium-active' : ''}`}
                    onClick={() => handleConversationSelect(conversation)}
                    style={{ cursor: 'pointer' }}
                  >
                  <div className="premium-conversation-avatar">
                        {conversation.tutorAvatar ? (
                          <img 
                            src={conversation.tutorAvatar} 
                            alt={conversation.tutorName}
                        className="premium-avatar-image"
                          />
                        ) : (
                      <div className="premium-avatar-placeholder">
                            {conversation.tutorName.charAt(0)}
                          </div>
                        )}
                    {conversation.isOnline && (
                      <div className="premium-online-indicator"></div>
                          )}
                        </div>
                  <div className="premium-conversation-content">
                    <div className="premium-conversation-header">
                      <h4 className="premium-tutor-name">{conversation.tutorName}</h4>
                      <span className="premium-time">{formatTime(conversation.lastMessageTime)}</span>
                    </div>
                    <p className="premium-last-message">{conversation.lastMessage}</p>
                    <div className="premium-conversation-footer">
                      <span className="premium-topic">{conversation.booking.topic || 'General Session'}</span>
                      {conversation.unreadCount > 0 && (
                        <div className="premium-unread-badge">{conversation.unreadCount}</div>
                      )}
                      </div>
                    </div>
                  </div>
                ))}
                
              {filteredConversations.length === 0 && !error && (
                <div className="premium-empty-state">
                  <div className="premium-empty-icon">💬</div>
                  <h3>No conversations found</h3>
                  <p>Start a conversation with your tutors to begin messaging</p>
                  </div>
                )}
              </div>
            </div>

          {/* Premium Messages Area */}
          <div className="premium-messages-area">
              {selectedConversation ? (
                <>
                {/* Premium Conversation Header */}
                <div className="premium-messages-header">
                  <div className="premium-header-info">
                    <div className="premium-header-avatar">
                          {selectedConversation.tutorAvatar ? (
                            <img 
                              src={selectedConversation.tutorAvatar} 
                              alt={selectedConversation.tutorName}
                          className="premium-header-avatar-image"
                            />
                          ) : (
                        <div className="premium-header-avatar-placeholder">
                              {selectedConversation.tutorName.charAt(0)}
                            </div>
                          )}
                      {selectedConversation.isOnline && (
                        <div className="premium-header-online-indicator"></div>
                          )}
                        </div>
                    <div className="premium-header-details">
                      <h3 className="premium-header-name">{selectedConversation.tutorName}</h3>
                      <div className="premium-header-status">
                        <span className="premium-topic">{selectedConversation.booking.topic || 'General Session'}</span>
                        <span className="premium-status-dot">•</span>
                        <span className={`premium-status ${selectedConversation.booking.status === 'COMPLETED' ? 'completed' : 'upcoming'}`}>
                          {selectedConversation.booking.status === 'COMPLETED' ? 'Completed' : 'Upcoming'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="premium-header-actions">
                    <button 
                      className="premium-action-btn premium-video-btn"
                      onClick={() => {
                        console.log('Test: Fetching messages for bookingId:', selectedConversation.bookingId);
                        fetchMessages(selectedConversation.bookingId);
                      }}
                    >
                      <span className="action-icon">📹</span>
                      <span className="action-text">Test Fetch</span>
                    </button>
                    <button className="premium-action-btn premium-more-btn">
                      <span className="action-icon">⋯</span>
                    </button>
                  </div>
                </div>

                {/* Premium Messages */}
                <div className="premium-messages-container">
                  <div className="premium-messages-list">
                    {messagesLoading && (
                      <div className="premium-loading-messages">
                        <div className="premium-spinner">
                          <div className="spinner-ring"></div>
                          <div className="spinner-ring"></div>
                          <div className="spinner-ring"></div>
                        </div>
                        <p>Loading messages...</p>
                      </div>
                    )}
                    
                    {!messagesLoading && !messagingAllowed && selectedConversation && (
                      <div className="premium-messaging-status">
                        <div className="premium-status-icon">⏰</div>
                        <h3>{t('messages.messaging_unavailable')}</h3>
                        <p>{timeUntilSession}</p>
                        <p className="premium-status-note">
                          {t('messages.messaging_unavailable_note')}
                        </p>
                      </div>
                    )}
                    
                    {!messagesLoading && messagingAllowed && messages.map(message => (
                      <div
                        key={message.id}
                        className={`premium-message ${message.senderRole === 'STUDENT' ? 'premium-message-sent' : 'premium-message-received'}`}
                      >
                        <div className="premium-message-bubble">
                          <div className="premium-message-content">{message.content}</div>
                          <div className="premium-message-time">{formatMessageTime(message.createdAt)}</div>
                          {message.senderRole === 'STUDENT' && (
                            <div className="premium-message-status">
                              {message.isRead ? '✓✓' : '✓'}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {!messagesLoading && messagingAllowed && messages.length === 0 && (
                      <div className="premium-empty-messages">
                        <div className="premium-empty-icon">💬</div>
                        <h3>No messages yet</h3>
                        <p>Start the conversation with {selectedConversation.tutorName}</p>
                        <p>Debug: messages.length = {messages.length}, messagesLoading = {messagesLoading.toString()}</p>
                      </div>
                    )}
                    
                    {isTyping && (
                      <div className="premium-message premium-message-received">
                        <div className="premium-typing-indicator">
                          <div className="typing-dot"></div>
                          <div className="typing-dot"></div>
                          <div className="typing-dot"></div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                  </div>

                {/* Premium Message Input */}
                <div className="premium-message-input">
                  <div className="premium-input-container">
                    <button 
                      className="premium-attachment-btn"
                      onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                      disabled={!messagingAllowed}
                    >
                      <span className="attachment-icon">📎</span>
                    </button>
                    <div className="premium-input-wrapper">
                        <input
                        ref={messageInputRef}
                          type="text"
                        placeholder={messagingAllowed ? t('messages.type_message') : t('messages.messaging_disabled')}
                          value={newMessage}
                          onChange={handleMessageInput}
                          disabled={sending || !messagingAllowed}
                        className="premium-message-field"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage(e);
                          }
                        }}
                        />
                        <button
                        className="premium-emoji-btn"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        disabled={!messagingAllowed}
                      >
                        <span className="emoji-icon">😊</span>
                      </button>
                    </div>
                    <button
                      onClick={sendMessage}
                          disabled={!newMessage.trim() || sending || !messagingAllowed}
                      className="premium-send-btn"
                        >
                          {sending ? (
                      <div className="premium-send-spinner"></div>
                        ) : (
                      <span className="send-icon">➤</span>
                        )}
                      </button>
                    </div>
                </div>
              </>
            ) : (
            <div className="premium-welcome-screen">
              <div className="premium-welcome-content">
                <div className="premium-welcome-icon">💬</div>
                <h2>Welcome to Premium Messaging</h2>
                <p>Select a conversation to start messaging with your tutors</p>
                <div className="premium-welcome-features">
                  <div className="premium-feature">
                    <span className="feature-icon">🔒</span>
                    <span>End-to-end encryption</span>
                  </div>
                  <div className="premium-feature">
                    <span className="feature-icon">⚡</span>
                    <span>Real-time messaging</span>
                  </div>
                  <div className="premium-feature">
                    <span className="feature-icon">📱</span>
                    <span>Cross-platform sync</span>
                  </div>
                </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 