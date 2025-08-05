"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import './forgot-password-premium.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState('en');
  const router = useRouter();
  const { t, i18n } = useTranslation();
  
  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setCurrentLang(lng);
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedLanguage', lng);
    }
    setIsLangMenuOpen(false);
  };

  useEffect(() => {
    setIsVisible(true);
    
    // Initialize language from localStorage
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('selectedLanguage');
      if (savedLang) {
        setCurrentLang(savedLang);
      }
    }
    
    // Click outside handler for language dropdown
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.lang-dropdown')) {
        setIsLangMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Update currentLang when i18n language changes
  useEffect(() => {
    setCurrentLang(i18n.language || 'en');
  }, [i18n.language]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Simulate API call for password reset
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success(t('forgot_password_success'));
      setEmail("");
    } catch (error) {
      toast.error(t('forgot_password_error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="premium-forgot-password-container">
      {/* Animated Background */}
      <div className="animated-background">
        <div className="floating-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
          <div className="shape shape-4"></div>
          <div className="shape shape-5"></div>
        </div>
      </div>

      {/* Language Switcher */}
      <div className="language-switcher">
        <div className="lang-dropdown">
          <button 
            className="lang-trigger"
            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
          >
            <span className="lang-flag">
              {currentLang === 'en' && '🇺🇸'}
              {currentLang === 'es' && '🇪🇸'}
              {currentLang === 'fr' && '🇫🇷'}
              {currentLang === 'de' && '🇩🇪'}
              {currentLang === 'pt' && '🇵🇹'}
              {currentLang === 'ru' && '🇷🇺'}
              {currentLang === 'tr' && '🇹🇷'}
              {currentLang === 'it' && '🇮🇹'}
              {currentLang === 'ar' && '🇸🇦'}
              {currentLang === 'zh' && '🇨🇳'}
              {currentLang === 'ja' && '🇯🇵'}
              {currentLang === 'ko' && '🇰🇷'}
              {currentLang === 'ig' && '🇳🇬'}
              {currentLang === 'ha' && '🇳🇬'}
              {currentLang === 'yo' && '🇳🇬'}
              {currentLang === 'hi' && '🇮🇳'}
              {currentLang === 'bn' && '🇧🇩'}
              {currentLang === 'pcm' && '🇳🇬'}
              {!['en', 'es', 'fr', 'de', 'pt', 'ru', 'tr', 'it', 'ar', 'zh', 'ja', 'ko', 'ig', 'ha', 'yo', 'hi', 'bn', 'pcm'].includes(currentLang) && '🇺🇸'}
            </span>
            <span className="lang-code">{currentLang.toUpperCase()}</span>
            <svg className={`lang-arrow ${isLangMenuOpen ? 'rotated' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className={`lang-menu ${isLangMenuOpen ? 'open' : ''}`}>
            <button onClick={() => changeLanguage('en')} className={`lang-option ${currentLang === 'en' ? 'active' : ''}`}>
              <span>🇺🇸</span> English
            </button>
            <button onClick={() => changeLanguage('es')} className={`lang-option ${currentLang === 'es' ? 'active' : ''}`}>
              <span>🇪🇸</span> Español
            </button>
            <button onClick={() => changeLanguage('fr')} className={`lang-option ${currentLang === 'fr' ? 'active' : ''}`}>
              <span>🇫🇷</span> Français
            </button>
            <button onClick={() => changeLanguage('de')} className={`lang-option ${currentLang === 'de' ? 'active' : ''}`}>
              <span>🇩🇪</span> Deutsch
            </button>
            <button onClick={() => changeLanguage('pt')} className={`lang-option ${currentLang === 'pt' ? 'active' : ''}`}>
              <span>🇵🇹</span> Português
            </button>
            <button onClick={() => changeLanguage('ru')} className={`lang-option ${currentLang === 'ru' ? 'active' : ''}`}>
              <span>🇷🇺</span> Русский
            </button>
            <button onClick={() => changeLanguage('tr')} className={`lang-option ${currentLang === 'tr' ? 'active' : ''}`}>
              <span>🇹🇷</span> Türkçe
            </button>
            <button onClick={() => changeLanguage('it')} className={`lang-option ${currentLang === 'it' ? 'active' : ''}`}>
              <span>🇮🇹</span> Italiano
            </button>
            <button onClick={() => changeLanguage('ar')} className={`lang-option ${currentLang === 'ar' ? 'active' : ''}`}>
              <span>🇸🇦</span> العربية
            </button>
            <button onClick={() => changeLanguage('zh')} className={`lang-option ${currentLang === 'zh' ? 'active' : ''}`}>
              <span>🇨🇳</span> 中文
            </button>
            <button onClick={() => changeLanguage('ja')} className={`lang-option ${currentLang === 'ja' ? 'active' : ''}`}>
              <span>🇯🇵</span> 日本語
            </button>
            <button onClick={() => changeLanguage('ko')} className={`lang-option ${currentLang === 'ko' ? 'active' : ''}`}>
              <span>🇰🇷</span> 한국어
            </button>
            <button onClick={() => changeLanguage('ig')} className={`lang-option ${currentLang === 'ig' ? 'active' : ''}`}>
              <span>🇳🇬</span> Igbo
            </button>
            <button onClick={() => changeLanguage('ha')} className={`lang-option ${currentLang === 'ha' ? 'active' : ''}`}>
              <span>🇳🇬</span> Hausa
            </button>
            <button onClick={() => changeLanguage('yo')} className={`lang-option ${currentLang === 'yo' ? 'active' : ''}`}>
              <span>🇳🇬</span> Yoruba
            </button>
            <button onClick={() => changeLanguage('hi')} className={`lang-option ${currentLang === 'hi' ? 'active' : ''}`}>
              <span>🇮🇳</span> हिंदी
            </button>
            <button onClick={() => changeLanguage('bn')} className={`lang-option ${currentLang === 'bn' ? 'active' : ''}`}>
              <span>🇧🇩</span> বাংলা
            </button>
            <button onClick={() => changeLanguage('pcm')} className={`lang-option ${currentLang === 'pcm' ? 'active' : ''}`}>
              <span>🇳🇬</span> Pidgin
            </button>
          </div>
        </div>
      </div>

      <div className="forgot-password-layout">
        {/* Left Side - Hero Section */}
        <div className="hero-section">
          <div className="hero-content">
            <div className="hero-icon">🔐</div>
            <h1 className="hero-title">{t('forgot_password_hero_title')}</h1>
            <p className="hero-subtitle">{t('forgot_password_hero_subtitle')}</p>
            <div className="hero-features">
              <div className="feature">
                <div className="feature-icon">📧</div>
                <div className="feature-text">{t('forgot_password_feature_1')}</div>
              </div>
              <div className="feature">
                <div className="feature-icon">⚡</div>
                <div className="feature-text">{t('forgot_password_feature_2')}</div>
              </div>
              <div className="feature">
                <div className="feature-icon">🔒</div>
                <div className="feature-text">{t('forgot_password_feature_3')}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="form-section">
          <div className={`form-container ${isVisible ? 'visible' : ''}`}>
            {/* Logo */}
            <div className="brand-logo">
              <div className="logo-icon">🎓</div>
              <span className="logo-text">LearnVastora</span>
            </div>

            {/* Header */}
            <div className="form-header">
              <h1 className="form-title">{t('forgot_password_title')}</h1>
              <p className="form-subtitle">{t('forgot_password_subtitle')}</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="forgot-password-form">
              <div className="form-group">
                <div className="input-wrapper">
                  <div className="input-icon">📧</div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="form-input"
                    placeholder={t('forgot_password_email_placeholder')}
                  />
                  <div className="input-focus-border"></div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="submit-button"
              >
                {loading ? (
                  <div className="button-loader">
                    <div className="spinner"></div>
                  </div>
                ) : (
                  <>
                    <span>{t('forgot_password_button')}</span>
                    <svg className="button-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </>
                )}
              </button>
            </form>

            {/* Back to Sign In */}
            <div className="back-to-signin">
              <span className="back-text">{t('forgot_password_back_text')}</span>
              <Link href="/auth/signin" className="back-link">
                {t('forgot_password_back_link')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 