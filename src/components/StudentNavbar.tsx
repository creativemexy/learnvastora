"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from 'react-i18next';
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { useState, useEffect, useCallback } from "react";

import './PremiumNavbar.css';

interface StudentNavbarProps {
  title?: string;
}

interface UserProfile {
  photo?: string;
  name: string;
}

interface Notification {
  id: string;
  isRead: boolean;
  type: string;
}

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'bn', name: 'বাংলা', flag: '🇧🇩' },
  { code: 'hi', name: 'हिंदी', flag: '🇮🇳' },
  { code: 'ig', name: 'Igbo', flag: '🇳🇬' },
  { code: 'ha', name: 'Hausa', flag: '🇳🇬' },
  { code: 'yo', name: 'Yorùbá', flag: '🇳🇬' },
  { code: 'pcm', name: 'Pidgin', flag: '🇳🇬' }
];

export default function StudentNavbar({ title = "Vastora" }: StudentNavbarProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const { t, i18n } = useTranslation();

  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState('en');
  const [isClient, setIsClient] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [photoLoaded, setPhotoLoaded] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
    setCurrentLang(i18n.language || 'en');
  }, [i18n.language]);

  // Fetch notifications for dynamic badge count
  const fetchNotifications = useCallback(async () => {
    if (!session?.user) return;
    
    try {
      setLoadingNotifications(true);
      const response = await fetch('/api/notifications');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
        const unreadCount = data.filter((n: Notification) => !n.isRead).length;
        setNotificationCount(unreadCount);
      } else {
        console.error('Failed to fetch notifications');
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  }, [session?.user]);

  // Fetch notifications on mount and set up polling
  useEffect(() => {
    if (session?.user) {
      fetchNotifications();
      
      // Set up polling for real-time updates
      const interval = setInterval(fetchNotifications, 30000); // Poll every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [session?.user, fetchNotifications]);

  // Fetch user profile data including photo
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (session?.user?.email) {
        try {
          console.log('Fetching profile for:', session.user.email);
          const response = await fetch('/api/profile');
          if (response.ok) {
            const data = await response.json();
            console.log('Profile data loaded:', data.user);
            console.log('Photo URL:', data.user.photo);
            setUserProfile(data.user);
            setPhotoError(false);
            setPhotoLoaded(false);
          } else {
            console.error('Failed to fetch profile:', response.status);
            setPhotoError(true);
          }
        } catch (error) {
          console.error('Failed to fetch user profile:', error);
          setPhotoError(true);
        }
      }
    };

    fetchUserProfile();
  }, [session?.user?.email]);

  // Debug log for profile data
  useEffect(() => {
    console.log('Current userProfile:', userProfile);
    console.log('Photo loaded:', photoLoaded);
    console.log('Photo error:', photoError);
  }, [userProfile, photoLoaded, photoError]);
  
  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setCurrentLang(lng);
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedLanguage', lng);
    }
    setIsLanguageDropdownOpen(false);
  };

  const getCurrentLanguage = () => {
    return languages.find(lang => lang.code === currentLang) || languages[0];
  };

  // Prevent hydration mismatch by not rendering until client-side
  if (!isClient) {
    return (
      <nav className="premium-navbar">
        <div className="navbar-container">
          <div className="navbar-logo">
            <span className="logo-text">Vastora</span>
          </div>
          <div className="navbar-menu">
            {/* Placeholder for SSR */}
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="premium-navbar">
      <div className="navbar-container">
        {/* Logo */}
        <div className="navbar-logo">
          <span className="logo-text">Vastora</span>
        </div>
        
        {/* Navigation Menu */}
        <div className="navbar-menu">
          <Link href="/dashboard" className={`nav-item${pathname === '/dashboard' ? ' active' : ''}`}>
            {t('navbar.dashboard')}
          </Link>
          <Link href="/tutors" className={`nav-item${pathname === '/tutors' ? ' active' : ''}`}>
            {t('navbar.find_tutor')}
          </Link>
          <Link href="/bookings" className={`nav-item${pathname === '/bookings' ? ' active' : ''}`}>
            {t('navbar.learn')}
          </Link>
          <Link href="/progress" className={`nav-item${pathname === '/progress' ? ' active' : ''}`}>
            {t('navbar.progress')}
          </Link>
          <Link href="/calendar" className={`nav-item${pathname === '/calendar' ? ' active' : ''}`}>
            {t('navbar.calendar')}
          </Link>
          <Link href="/library" className={`nav-item${pathname === '/library' ? ' active' : ''}`}>
            {t('navbar.library')}
          </Link>
          <Link href="/wallet" className={`nav-item${pathname === '/wallet' ? ' active' : ''}`}>
            {t('navbar.wallet')}
          </Link>
        </div>
        
        {/* Right Side Actions */}
        <div className="navbar-actions">
          {/* Language Switcher */}
          <div className="language-switcher">
            <button 
              className="language-btn"
              onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
            >
              <span className="language-flag">{getCurrentLanguage().flag}</span>
              <span className="language-code">{currentLang.toUpperCase()}</span>
              <span className="dropdown-arrow">▼</span>
            </button>
            
            {isLanguageDropdownOpen && (
              <div className="language-dropdown">
                {languages.map((language) => (
                  <button
                    key={language.code}
                    className={`language-option ${currentLang === language.code ? 'active' : ''}`}
                    onClick={() => changeLanguage(language.code)}
                  >
                    <span className="language-flag">{language.flag}</span>
                    <span className="language-name">{language.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Dynamic Notification Icon */}
          <button 
            className="action-btn notification-btn"
            onClick={() => router.push("/notifications")}
          >
            <span className="btn-icon">🔔</span>
            {notificationCount > 0 && (
              <span className="notification-badge">
                {loadingNotifications ? (
                  <span className="notification-loading">⋯</span>
                ) : (
                  notificationCount > 99 ? '99+' : notificationCount
                )}
            </span>
            )}
          </button>
          
          {/* Subscribe Button */}
          <button 
            className="action-btn subscribe-btn"
            onClick={() => toast.success("Subscription feature coming soon!")}
          >
            Subscribe
          </button>
          
          {/* Messages Icon */}
          <button 
            className="action-btn"
            onClick={() => router.push("/messages")}
          >
            <span className="btn-icon">💬</span>
          </button>
          
          {/* Profile Button */}
          <button 
            className="action-btn profile-btn"
            onClick={() => router.push("/profile")}
            style={{ position: 'relative', width: 40, height: 40, padding: 0, overflow: 'hidden' }}
          >
            {userProfile?.photo && userProfile.photo.trim() !== "" && !photoError ? (
              <img 
                src={userProfile.photo} 
                alt={`${session?.user?.name || 'User'} Profile`}
                className="profile-photo"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: '50%',
                  border: '2px solid rgba(255, 255, 255, 0.8)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                }}
                onError={(e) => {
                  console.log('Profile photo failed to load:', userProfile.photo);
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  setPhotoError(true);
                }}
                onLoad={() => {
                  console.log('Profile photo loaded successfully:', userProfile.photo);
                  setPhotoLoaded(true);
                  setPhotoError(false);
                }}
              />
            ) : null}
            {/* Fallback initial - shown when no photo, photo fails to load, or photo hasn't loaded yet */}
            <span 
              className="profile-initial"
              style={{
                display: (!userProfile?.photo || userProfile.photo.trim() === "" || photoError) ? 'flex' : 'none',
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '16px',
                fontWeight: 'bold',
                border: '2px solid rgba(255, 255, 255, 0.8)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
              }}
            >
              {session?.user?.name ? session.user.name.charAt(0).toUpperCase() : 'U'}
            </span>
          </button>
          
          {/* Logout Button */}
          <button 
            className="action-btn logout-btn"
            onClick={() => {
              if (confirm(t('confirm_logout') || 'Are you sure you want to logout?')) {
                signOut({ callbackUrl: '/' });
              }
            }}
          >
            <span className="btn-icon">🚪</span>
            <span className="btn-text">{t('logout')}</span>
          </button>
        </div>
      </div>
      
      {/* Mobile Menu Toggle */}
      <button className="mobile-menu-toggle">
        <span></span>
        <span></span>
        <span></span>
      </button>
    </nav>
  );
} 