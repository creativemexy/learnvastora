"use client";

export const dynamic = 'force-dynamic';

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import './super-admin-dashboard.css';

interface SuperAdminStats {
  totalUsers: number;
  totalTutors: number;
  totalStudents: number;
  totalSessions: number;
  totalRevenue: number;
  activeUsers: number;
  pendingApprovals: number;
  systemHealth: string;
  totalAdmins: number;
  platformUptime: number;
  securityAlerts: number;
  dataUsage: number;
}

interface SystemAlert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  lastActive: string;
  permissions: string[];
  status: 'active' | 'inactive' | 'suspended';
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
  isOnline: boolean;
  lastSeen: string;
  createdAt: string;
  photo?: string;
  profile: {
    language?: string;
    country?: string;
    bio?: string;
    languageLevel?: string;
  };
  tutorProfile?: {
    subjects: string[];
    hourlyRate: number;
    isApproved: boolean;
    totalSessions: number;
    rating: number;
  };
  stats: {
    totalBookings: number;
    totalReviews: number;
    totalPayments: number;
    totalMessages: number;
  };
}

interface Conversation {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  userPhoto?: string;
  isOnline: boolean;
  lastSeen: string;
  lastMessage: string;
  lastMessageTime: string;
  totalMessages: number;
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  sender: {
    id: string;
    name: string;
    email: string;
    role: string;
    photo?: string;
  };
  bookingId: string;
  createdAt: string;
}

interface GlobalSettings {
  platform: {
    name: string;
    description: string;
    version: string;
    maintenanceMode: boolean;
    maintenanceMessage: string;
    maxFileSize: number;
    allowedFileTypes: string[];
    sessionTimeout: number;
    maxSessionsPerUser: number;
  };
  features: {
    instantBooking: boolean;
    videoRecording: boolean;
    groupSessions: boolean;
    mobileApp: boolean;
    notifications: boolean;
    badges: boolean;
    reviews: boolean;
    payments: boolean;
  };
  security: {
    twoFactorAuth: boolean;
    passwordMinLength: number;
    sessionTimeout: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
    sslRequired: boolean;
    apiRateLimit: number;
  };
  payments: {
    currency: string;
    taxRate: number;
    platformFee: number;
    minimumWithdrawal: number;
    maximumWithdrawal: number;
    autoPayout: boolean;
    payoutSchedule: string;
    supportedGateways: string[];
  };
  notifications: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    pushEnabled: boolean;
    defaultEmailTemplate: string;
    smsProvider: string;
    notificationSchedule: string;
  };
  analytics: {
    trackingEnabled: boolean;
    googleAnalyticsId: string;
    facebookPixelId: string;
    dataRetentionDays: number;
    anonymizeData: boolean;
  };
  support: {
    supportEmail: string;
    supportPhone: string;
    liveChatEnabled: boolean;
    helpCenterUrl: string;
    ticketSystem: string;
    autoResponseEnabled: boolean;
  };
}

export default function SuperAdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useTranslation();
  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showBulkMessage, setShowBulkMessage] = useState(false);
  const [bulkMessage, setBulkMessage] = useState('');
  const [selectedUsersForBulk, setSelectedUsersForBulk] = useState<string[]>([]);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState('platform');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingSettings, setEditingSettings] = useState<Partial<GlobalSettings>>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: string; data: any } | null>(null);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/auth/signin");
      return;
    }

    // Check if user is a super admin
    if ((session.user as any)?.role !== "SUPER_ADMIN") {
      router.push("/");
      return;
    }

    fetchSuperAdminData();

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchSuperAdminData, 30000);

    return () => clearInterval(interval);
  }, [session, status, router]);

  const fetchSuperAdminData = async () => {
    try {
      setLoading(true);
      
      // Fetch super admin statistics
      const statsResponse = await fetch('/api/admin/analytics?type=overview&period=30d');
      const statsData = await statsResponse.json();
      
      // Fetch super admin specific data
      const superAdminResponse = await fetch('/api/super-admin?action=overview');
      const superAdminData = await superAdminResponse.json();
      
      // Fetch admin users
      const adminsResponse = await fetch('/api/super-admin?action=admins');
      const adminsData = await adminsResponse.json();
      
      // Fetch system alerts
      const alertsResponse = await fetch('/api/super-admin?action=system');
      const alertsData = await alertsResponse.json();
      
      if (statsData.success) {
        setStats({
          totalUsers: statsData.data.totalUsers,
          totalTutors: statsData.data.totalTutors,
          totalStudents: statsData.data.totalStudents,
          totalSessions: statsData.data.totalSessions,
          totalRevenue: statsData.data.totalRevenue,
          activeUsers: statsData.data.activeUsers,
          pendingApprovals: superAdminData.success ? superAdminData.data.pendingApprovals : 0,
          systemHealth: superAdminData.success ? superAdminData.data.systemHealth : 'Unknown',
          totalAdmins: superAdminData.success ? superAdminData.data.totalAdmins : 0,
          platformUptime: superAdminData.success ? superAdminData.data.platformUptime : 0,
          securityAlerts: superAdminData.success ? superAdminData.data.securityAlerts : 0,
          dataUsage: superAdminData.success ? superAdminData.data.dataUsage : 0
        });
      }

      if (adminsData.success) {
        setAdminUsers(adminsData.data);
      } else {
        setAdminUsers([]);
      }

      if (alertsData.success) {
        setSystemAlerts(alertsData.data.alerts || []);
      } else {
        setSystemAlerts([]);
      }

    } catch (error) {
      console.error('Error fetching super admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      });
      
      if (userSearch) params.append('search', userSearch);
      if (userRoleFilter) params.append('role', userRoleFilter);
      if (userStatusFilter) params.append('status', userStatusFilter);

      const response = await fetch(`/api/super-admin/users?${params}`);
      const data = await response.json();

      if (data.success) {
        setUsers(data.data.users);
        setTotalPages(data.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/super-admin/messages?action=conversations');
      const data = await response.json();

      if (data.success) {
        setConversations(data.data.conversations);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const fetchMessages = async (userId: string) => {
    try {
      const response = await fetch(`/api/super-admin/messages?action=messages&userId=${userId}`);
      const data = await response.json();

      if (data.success) {
        setMessages(data.data.messages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const updateUser = async (userId: string, updates: any) => {
    try {
      const response = await fetch(`/api/super-admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      const data = await response.json();

      if (data.success) {
        showNotification('success', 'User updated successfully');
        fetchUsers(); // Refresh the user list
      } else {
        showNotification('error', data.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      showNotification('error', 'Failed to update user. Please try again.');
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/super-admin/users/${userId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        showNotification('success', 'User deleted successfully');
        fetchUsers(); // Refresh the user list
      } else {
        showNotification('error', data.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      showNotification('error', 'Failed to delete user. Please try again.');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;

    try {
      setSendingMessage(true);
      const response = await fetch('/api/super-admin/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          content: newMessage
        })
      });

      const data = await response.json();

      if (data.success) {
        setNewMessage('');
        showNotification('success', 'Message sent successfully');
        fetchMessages(selectedUser.id); // Refresh messages
      } else {
        showNotification('error', data.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      showNotification('error', 'Failed to send message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  const sendBulkMessage = async () => {
    if (!bulkMessage.trim() || selectedUsersForBulk.length === 0) return;

    try {
      setSendingMessage(true);
      const response = await fetch('/api/super-admin/messages/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: selectedUsersForBulk,
          content: bulkMessage
        })
      });

      const data = await response.json();

      if (data.success) {
        setBulkMessage('');
        setSelectedUsersForBulk([]);
        setShowBulkMessage(false);
        showNotification('success', `Message sent to ${selectedUsersForBulk.length} users`);
      } else {
        showNotification('error', data.error || 'Failed to send bulk message');
      }
    } catch (error) {
      console.error('Error sending bulk message:', error);
      showNotification('error', 'Failed to send bulk message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  const fetchGlobalSettings = async () => {
    try {
      setSettingsLoading(true);
      const response = await fetch('/api/super-admin/settings');
      const data = await response.json();

      if (data.success) {
        setGlobalSettings(data.data);
        setEditingSettings(data.data);
      }
    } catch (error) {
      console.error('Error fetching global settings:', error);
    } finally {
      setSettingsLoading(false);
    }
  };

  const updateGlobalSettings = async (category: string, settings: any) => {
    try {
      setSettingsLoading(true);
      const response = await fetch('/api/super-admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, settings })
      });

      const data = await response.json();

      if (data.success) {
        setGlobalSettings(data.data);
        setEditingSettings(data.data);
        showNotification('success', 'Settings updated successfully!');
      } else {
        showNotification('error', 'Failed to update settings: ' + data.error);
      }
    } catch (error) {
      console.error('Error updating global settings:', error);
      showNotification('error', 'Failed to update settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  const resetSettingsToDefaults = async () => {
    try {
      setSettingsLoading(true);
      const response = await fetch('/api/super-admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_to_defaults' })
      });

      const data = await response.json();

      if (data.success) {
        setGlobalSettings(data.result);
        setEditingSettings(data.result);
        showNotification('success', 'Settings reset to defaults successfully!');
      } else {
        showNotification('error', 'Failed to reset settings: ' + data.error);
      }
    } catch (error) {
      console.error('Error resetting settings:', error);
      showNotification('error', 'Failed to reset settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  const exportSettings = async () => {
    try {
      const response = await fetch('/api/super-admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'export_settings' })
      });

      const data = await response.json();

      if (data.success) {
        const blob = new Blob([JSON.stringify(data.result, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `learnvastora-settings-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotification('success', 'Settings exported successfully');
      } else {
        showNotification('error', 'Failed to export settings');
      }
    } catch (error) {
      console.error('Error exporting settings:', error);
      showNotification('error', 'Failed to export settings. Please try again.');
    }
  };

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const settings = JSON.parse(e.target?.result as string);
        
        const response = await fetch('/api/super-admin/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'import_settings', settings })
        });

        const data = await response.json();

        if (data.success) {
          setGlobalSettings(data.result);
          setEditingSettings(data.result);
          showNotification('success', 'Settings imported successfully');
        } else {
          showNotification('error', data.error || 'Failed to import settings');
        }
      } catch (error) {
        console.error('Error importing settings:', error);
        showNotification('error', 'Failed to import settings. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  // Load data when tab changes
  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'messages') {
      fetchConversations();
    } else if (activeTab === 'settings') {
      fetchGlobalSettings();
    }
  }, [activeTab, currentPage, userSearch, userRoleFilter, userStatusFilter]);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'info': return 'ℹ️';
      default: return '📝';
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'success': return '#28a745';
      case 'warning': return '#ffc107';
      case 'error': return '#dc3545';
      case 'info': return '#17a2b8';
      default: return '#6c757d';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return '#dc3545';
      case 'high': return '#fd7e14';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60 * 1000) return 'Just now';
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}m ago`;
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}h ago`;
    return date.toLocaleDateString();
  };

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleConfirmAction = (type: string, data: any, message: string) => {
    setConfirmAction({ type, data });
    setShowConfirmDialog(true);
  };

  const executeConfirmedAction = async () => {
    if (!confirmAction) return;

    try {
      switch (confirmAction.type) {
        case 'deleteUser':
          await deleteUser(confirmAction.data);
          showNotification('success', 'User deleted successfully');
          break;
        case 'resetSettings':
          await resetSettingsToDefaults();
          showNotification('success', 'Settings reset to defaults');
          break;
        case 'bulkMessage':
          await sendBulkMessage();
          showNotification('success', 'Bulk message sent successfully');
          break;
        default:
          break;
      }
    } catch (error) {
      showNotification('error', 'Action failed. Please try again.');
    } finally {
      setShowConfirmDialog(false);
      setConfirmAction(null);
    }
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
    if (!autoRefresh) {
      showNotification('info', 'Auto-refresh enabled. Data will update every 30 seconds.');
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchSuperAdminData();
      setLastRefresh(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  if (status === "loading" || loading) {
    return (
      <div className="super-admin-dashboard">
        <div className="super-admin-loading">
          <div className="super-admin-spinner"></div>
          <p>Loading super admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="super-admin-dashboard">
      {/* Notification Toast */}
      {notification && (
        <div className={`super-admin-notification ${notification.type}`}>
          <div className="super-admin-notification-content">
            <i className={`fas fa-${notification.type === 'success' ? 'check-circle' : notification.type === 'error' ? 'exclamation-circle' : 'info-circle'}`}></i>
