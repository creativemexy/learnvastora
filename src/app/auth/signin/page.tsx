"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import './signin-premium.css';

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
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
    setIsLangMenuOpen(false); // Close dropdown after selection
    console.log('Language changed to:', lng); // Debug log
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
    
    // Auto-rotate carousel
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % 3);
    }, 5000);
    
    // Click outside handler for language dropdown
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.lang-dropdown')) {
        setIsLangMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      clearInterval(interval);
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
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.ok) {
      toast.success("Signed in successfully!");
      try {
        const sessionRes = await fetch('/api/auth/session');
        const session = await sessionRes.json();
        const userRole = session?.user?.role;
        
        if (userRole === 'SUPER_ADMIN') {
          router.push('/super-admin');
        } else if (userRole === 'ADMIN') {
          router.push('/admin');
        } else if (userRole === 'TUTOR') {
          router.push('/tutor/dashboard');
        } else if (userRole === 'STUDENT') {
          router.push('/bookings');
        } else {
          router.push('/');
        }
      } catch (error) {
        console.error('Error getting session:', error);
        router.push('/');
      }
    } else {
      toast.error("Invalid email or password");
    }
  }

  async function handleGoogle() {
    await signIn("google", { callbackUrl: "/" });
  }

  const slides = [
    {
      image: "/slider-tutor.jpg",
      title: t('signin_slide_tutor_title'),
      description: t('signin_slide_tutor_desc'),
      icon: "👨‍🏫"
    },
    {
      image: "/slider-student.jpg", 
      title: t('signin_slide_student_title'),
      description: t('signin_slide_student_desc'),
      icon: "🎓"
    },
    {
      image: "/slider-session.jpg",
      title: t('signin_slide_session_title'), 
      description: t('signin_slide_session_desc'),
      icon: "💻"
    }
  ];

  return (
    <div className="premium-signin-container">
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

      <div className="signin-layout">
        {/* Left Side - Hero Carousel */}
        <div className="hero-section">
          <div className="carousel-container">
            {slides.map((slide, index) => (
              <div 
                key={index}
                className={`carousel-slide ${index === currentSlide ? 'active' : ''}`}
                style={{ backgroundImage: `url(${slide.image})` }}
              >
                <div className="slide-overlay">
                  <div className="slide-content">
                    <div className="slide-icon">{slide.icon}</div>
                    <h2 className="slide-title">{slide.title}</h2>
                    <p className="slide-description">{slide.description}</p>
              </div>
            </div>
              </div>
            ))}
            
            {/* Carousel Indicators */}
            <div className="carousel-indicators">
              {slides.map((_, index) => (
                <button
                  key={index}
                  className={`indicator ${index === currentSlide ? 'active' : ''}`}
                  onClick={() => setCurrentSlide(index)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right Side - Sign In Form */}
        <div className="form-section">
          <div className={`form-container ${isVisible ? 'visible' : ''}`}>
            {/* Logo */}
            <div className="brand-logo">
              <div className="logo-icon">🎓</div>
              <span className="logo-text">LearnVastora</span>
            </div>

            {/* Welcome Text */}
            <div className="welcome-section">
              <h1 className="welcome-title">{t('signin_title')}</h1>
              <p className="welcome-subtitle">{t('signin_subtitle')}</p>
      </div>

            {/* Sign In Form */}
            <form onSubmit={handleSubmit} className="signin-form">
              <div className="form-group">
                <div className="input-wrapper">
                  <div className="input-icon">📧</div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                    className="form-input"
                placeholder={t('signin_email_placeholder')}
              />
                  <div className="input-focus-border"></div>
                </div>
            </div>

              <div className="form-group">
                <div className="input-wrapper">
                  <div className="input-icon">🔒</div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                    className="form-input"
                placeholder={t('signin_password_placeholder')}
              />
                  <div className="input-focus-border"></div>
            </div>
              </div>

              <div className="form-options">
                <label className="checkbox-wrapper">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={() => setRememberMe(!rememberMe)}
                    className="checkbox-input"
                  />
                  <span className="checkbox-custom"></span>
                  <span className="checkbox-label">{t('signin_remember')}</span>
                </label>
                <Link href="/auth/forgot-password" className="forgot-link">
                  {t('signin_forgot')}
                </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
                className="signin-button"
            >
              {loading ? (
                  <div className="button-loader">
                    <div className="spinner"></div>
                  </div>
                ) : (
                  <>
                    <span>{t('signin_button')}</span>
                    <svg className="button-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </>
                )}
            </button>
          </form>

            {/* Divider */}
            <div className="divider">
              <span className="divider-text">{t('signin_or')}</span>
          </div>

            {/* Google Sign In */}
            <button onClick={handleGoogle} className="google-button">
              <svg className="google-icon" width="20" height="20" viewBox="0 0 48 48">
              <g>
                <path fill="#4285F4" d="M24 9.5c3.54 0 6.7 1.22 9.19 3.23l6.85-6.85C35.64 2.36 30.18 0 24 0 14.82 0 6.73 5.82 2.69 14.09l7.98 6.2C12.13 13.13 17.56 9.5 24 9.5z"/>
                <path fill="#34A853" d="M46.1 24.55c0-1.64-.15-3.22-.42-4.74H24v9.01h12.42c-.54 2.9-2.18 5.36-4.65 7.01l7.19 5.59C43.98 37.13 46.1 31.3 46.1 24.55z"/>
                <path fill="#FBBC05" d="M10.67 28.29c-1.13-3.36-1.13-6.93 0-10.29l-7.98-6.2C.89 16.18 0 19.98 0 24c0 4.02.89 7.82 2.69 12.2l7.98-6.2z"/>
                <path fill="#EA4335" d="M24 48c6.18 0 11.64-2.04 15.53-5.55l-7.19-5.59c-2.01 1.35-4.59 2.14-8.34 2.14-6.44 0-11.87-3.63-14.33-8.79l-7.98 6.2C6.73 42.18 14.82 48 24 48z"/>
              </g>
            </svg>
              <span>{t('signin_google')}</span>
          </button>

            {/* Sign Up Link */}
            <div className="signup-prompt">
              <span className="prompt-text">{t('signin_no_account')}</span>
              <Link href="/auth/signup" className="signup-link">
                {t('signin_signup_link')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 