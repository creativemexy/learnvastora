"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import './payment-success.css';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [amount, setAmount] = useState(0);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, message: t('notifications.new_tutor_available'), time: "2 min ago", read: false },
    { id: 2, message: t('notifications.payment_successful'), time: "5 min ago", read: false },
    { id: 3, message: t('notifications.session_reminder'), time: "1 hour ago", read: true }
  ]);

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
    { code: 'zh', name: '中文', flag: '🇨🇳' }
  ];

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const changeLanguage = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
    setShowLanguageDropdown(false);
  };

  const markNotificationAsRead = (id: number) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const reference = searchParams?.get('reference');
    const trxref = searchParams?.get('trxref');

    if (!reference || !trxref) {
      toast.error(t('payment_success.invalid_payment_response'));
      router.push("/wallet");
      return;
    }

    // Verify payment with Paystack
    verifyPayment(reference);
  }, [searchParams, router, t]);

  const verifyPayment = async (reference: string) => {
    try {
      const response = await fetch("/api/wallet/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference }),
      });

      if (!response.ok) {
        throw new Error("Payment verification failed");
      }

      const data = await response.json();
      
      if (data.success) {
        setSuccess(true);
        setAmount(data.amount);
        toast.success(t('wallet_payment_flow_keys.funds_added_successfully'));
      } else {
        setSuccess(false);
        toast.error(t('payment_success.payment_processing_failed'));
      }
    } catch (error) {
      console.error("Payment verification error:", error);
      setSuccess(false);
      toast.error(t('wallet_payment_flow_keys.error_adding_funds'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-vh-100 learnvastora-bg d-flex flex-column">
        <header className="learnvastora-header">
          <nav className="learnvastora-navbar">
            <Link href="/" className="learnvastora-logo">
              Vastora
            </Link>
            
            <ul className="learnvastora-nav-menu">
              <li><Link href="/dashboard">{t('navbar.dashboard')}</Link></li>
              <li><Link href="/tutors">{t('navbar.find_tutor')}</Link></li>
              <li><Link href="/learn">{t('navbar.learn')}</Link></li>
              <li><Link href="/progress">{t('navbar.progress')}</Link></li>
              <li><Link href="/calendar">{t('navbar.calendar')}</Link></li>
              <li><Link href="/library">{t('navbar.library')}</Link></li>
              <li><Link href="/wallet">{t('navbar.wallet')}</Link></li>
            </ul>
            
            <div className="learnvastora-nav-right">
              <div className="learnvastora-language-selector">
                <i className="fas fa-globe"></i>
                <span>EN</span>
                <i className="fas fa-chevron-down"></i>
              </div>
              
              <button className="learnvastora-notification-btn">
                Subscribe
                <span className="learnvastora-notification-badge">3</span>
              </button>
              
              <div className="learnvastora-separator"></div>
              
              <button className="learnvastora-logout-btn">
                {t('navbar.logout')}
              </button>
            </div>
          </nav>
        </header>
        
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-12 col-md-8 col-lg-6 text-center">
              <div className="mt-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">{t('payment_success.verifying_payment')}</span>
                </div>
                <h3 className="mt-3">{t('payment_success.verifying_payment')}</h3>
                <p>{t('payment_success.please_wait')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 learnvastora-bg d-flex flex-column">
      <header className="learnvastora-header">
        <nav className="learnvastora-navbar">
          <Link href="/" className="learnvastora-logo">
            LearnVastora
          </Link>
          
          <ul className="learnvastora-nav-menu">
            <li><Link href="/dashboard">{t('navbar.dashboard')}</Link></li>
            <li><Link href="/tutors">{t('navbar.find_tutor')}</Link></li>
            <li><Link href="/learn">{t('navbar.learn')}</Link></li>
            <li><Link href="/progress">{t('navbar.progress')}</Link></li>
            <li><Link href="/calendar">{t('navbar.calendar')}</Link></li>
            <li><Link href="/library">{t('navbar.library')}</Link></li>
            <li><Link href="/wallet">{t('navbar.wallet')}</Link></li>
          </ul>
          
          <div className="learnvastora-nav-right">
            {/* Language Selector */}
            <div className="learnvastora-language-selector" onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}>
              <span>{currentLanguage.flag}</span>
              <span>{currentLanguage.code.toUpperCase()}</span>
              <i className={`fas fa-chevron-down ${showLanguageDropdown ? 'rotate' : ''}`}></i>
              
              {showLanguageDropdown && (
                <div className="learnvastora-dropdown">
                  {languages.map(language => (
                    <div 
                      key={language.code}
                      className={`learnvastora-dropdown-item ${language.code === currentLanguage.code ? 'active' : ''}`}
                      onClick={() => changeLanguage(language.code)}
                    >
                      <span>{language.flag}</span>
                      <span>{language.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Notification Icon */}
            <div className="learnvastora-notification-container">
              <button 
                className="learnvastora-notification-btn"
                onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
              >
                <i className="fas fa-bell"></i>
                {unreadCount > 0 && (
                  <span className="learnvastora-notification-badge">{unreadCount}</span>
                )}
              </button>
              
              {showNotificationDropdown && (
                <div className="learnvastora-notification-dropdown">
                  <div className="learnvastora-notification-header">
                    <h6>{t('navbar.notifications')}</h6>
                    <button 
                      className="learnvastora-mark-all-read"
                      onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                    >
                      {t('navbar.mark_all_read')}
                    </button>
                  </div>
                  
                  <div className="learnvastora-notification-list">
                    {notifications.length > 0 ? (
                      notifications.map(notification => (
                        <div 
                          key={notification.id}
                          className={`learnvastora-notification-item ${!notification.read ? 'unread' : ''}`}
                          onClick={() => markNotificationAsRead(notification.id)}
                        >
                          <div className="learnvastora-notification-content">
                            <p>{notification.message}</p>
                            <small>{notification.time}</small>
                          </div>
                          {!notification.read && <div className="learnvastora-notification-dot"></div>}
                        </div>
                      ))
                    ) : (
                      <div className="learnvastora-no-notifications">
                        <p>{t('navbar.no_notifications')}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="learnvastora-separator"></div>
            
            <button className="learnvastora-logout-btn">
              {t('navbar.logout')}
            </button>
          </div>
        </nav>
      </header>
      
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-6">
            <div className="text-center mt-5">
              {success ? (
                <div className="payment-success-card">
                  <div className="success-icon">
                    <i className="fas fa-check-circle"></i>
                  </div>
                  <h2 className="text-success mb-3">{t('payment_success.payment_successful')}</h2>
                  <p className="lead mb-4">
                    {t('payment_success.wallet_credited')} ₦{amount.toLocaleString()}
                  </p>
                  <div className="success-details">
                    <p>{t('payment_success.funds_usage')}</p>
                    <p>{t('payment_success.transaction_recorded')}</p>
                  </div>
                  <div className="mt-4">
                    <Link href="/wallet" className="btn btn-primary me-3">
                      <i className="fas fa-wallet me-2"></i>
                      {t('payment_success.view_wallet')}
                    </Link>
                    <Link href="/tutors" className="btn btn-outline-primary">
                      <i className="fas fa-search me-2"></i>
                      {t('payment_success.find_tutors')}
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="payment-error-card">
                  <div className="error-icon">
                    <i className="fas fa-times-circle"></i>
                  </div>
                  <h2 className="text-danger mb-3">{t('payment_success.payment_failed')}</h2>
                  <p className="lead mb-4">
                    {t('payment_success.payment_issue')}
                  </p>
                  <div className="error-details">
                    <p>{t('payment_success.try_again_message')}</p>
                  </div>
                  <div className="mt-4">
                    <Link href="/wallet" className="btn btn-primary me-3">
                      <i className="fas fa-wallet me-2"></i>
                      {t('payment_success.back_to_wallet')}
                    </Link>
                    <button 
                      className="btn btn-outline-primary"
                      onClick={() => window.history.back()}
                    >
                      <i className="fas fa-arrow-left me-2"></i>
                      {t('payment_success.try_again')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 