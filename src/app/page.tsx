"use client";

export const dynamic = 'force-dynamic';

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "./landing-cambly.css";

interface LandingStats {
  totalTutors: number;
  totalStudents: number;
  totalSessions: number;
  totalLanguages: number;
  recentTestimonials: Array<{
    id: string;
    studentName: string;
    tutorName: string;
    language: string;
    rating: number;
    comment: string;
  }>;
}

export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<LandingStats>({
    totalTutors: 0,
    totalStudents: 0,
    totalSessions: 0,
    totalLanguages: 0,
    recentTestimonials: []
  });
  const [loading, setLoading] = useState(true);
  const [animatedStats, setAnimatedStats] = useState({
    tutors: 0,
    students: 0,
    sessions: 0,
    languages: 0
  });
  const { t, i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState(i18n.language || 'en');
  
  const changeLanguage = (lng: string) => {
    console.log('Changing language to:', lng);
    i18n.changeLanguage(lng);
    localStorage.setItem('selectedLanguage', lng);
    setCurrentLang(lng);
  };



  // Sync language state with i18n
  useEffect(() => {
    console.log('Current i18n language:', i18n.language);
    setCurrentLang(i18n.language || 'en');
    
    const handleLanguageChange = (lng: string) => {
      console.log('Language changed to:', lng);
      setCurrentLang(lng);
    };
    
    i18n.on('languageChanged', handleLanguageChange);
    
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  // Monitor currentLang changes
  useEffect(() => {
    console.log('currentLang state changed to:', currentLang);
  }, [currentLang]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const dropdown = document.querySelector('.lang-dropdown');
      const langBtn = document.querySelector('.lang-btn');
      
      if (dropdown && langBtn && !langBtn.contains(event.target as Node) && !dropdown.contains(event.target as Node)) {
        dropdown.classList.remove('show');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    
    if (session) {
      const userRole = (session.user as any)?.role;
      if (userRole === "TUTOR") {
        router.push("/tutor/dashboard");
      } else if (userRole === "STUDENT") {
        router.push("/bookings");
      }
    }

    fetch("/api/landing/stats")
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
        
        // Animate stats
        const animateStats = () => {
          const duration = 2000;
          const steps = 60;
          const stepDuration = duration / steps;
          
          let currentStep = 0;
          const interval = setInterval(() => {
            currentStep++;
            const progress = currentStep / steps;
            const easeOut = 1 - Math.pow(1 - progress, 3);
            
            setAnimatedStats({
              tutors: Math.floor(data.totalTutors * easeOut),
              students: Math.floor(data.totalStudents * easeOut),
              sessions: Math.floor(data.totalSessions * easeOut),
              languages: Math.floor(data.totalLanguages * easeOut)
            });
            
            if (currentStep >= steps) {
              clearInterval(interval);
            }
          }, stepDuration);
        };
        
        setTimeout(animateStats, 500);
      })
      .catch(() => setLoading(false));
  }, [session, status, router]);

  if (status === "loading" || (status !== 'authenticated' && loading)) {
    return (
      <div className="premium-loader">
        <div className="loader-content">
          <div className="loader-logo">LearnVastora</div>
          <div className="loader-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="premium-landing" key={currentLang}>
      {/* Premium Navbar */}
      <nav className="premium-navbar">
        <div className="nav-container">
          <div className="nav-brand">
            <div className="brand-logo">
              <div className="logo-icon">🎓</div>
              <span className="logo-text">LearnVastora</span>
            </div>
          </div>
          <div className="nav-actions">
            {!session ? (
              <div className="auth-buttons">
                <Link href="/auth/signin" className="btn-secondary">{t('sign_in')}</Link>
                <Link href="/auth/signup" className="btn-primary">{t('get_started')}</Link>
              </div>
            ) : (
              <Link href={(session.user as any)?.role === 'TUTOR' ? "/tutor/dashboard" : "/bookings"} className="btn-primary">
                {t('dashboard')}
              </Link>
            )}
            <div className="language-selector">
              <button 
                className="lang-btn"
                onClick={() => {
                  const dropdown = document.querySelector('.lang-dropdown');
                  dropdown?.classList.toggle('show');
                }}
              >
                {(() => {
                  const flagMap: { [key: string]: string } = {
                    'en': '🇺🇸', 'es': '🇪🇸', 'fr': '🇫🇷', 'ar': '🇸🇦', 'zh': '🇨🇳', 'ja': '🇯🇵', 'ko': '🇰🇷',
                    'ig': '🇳🇬', 'ha': '🇳🇬', 'yo': '🇳🇬', 'hi': '🇮🇳', 'bn': '🇧🇩', 'pt': '🇵🇹', 'ru': '🇷🇺',
                    'de': '🇩🇪', 'tr': '🇹🇷', 'it': '🇮🇹', 'pcm': '🇳🇬'
                  };
                  return flagMap[currentLang] || '🌐';
                })()} {currentLang.toUpperCase()}
              </button>
              <div className="lang-dropdown">
                <button onClick={() => { changeLanguage('en'); document.querySelector('.lang-dropdown')?.classList.remove('show'); }}>
                  🇺🇸 English
                </button>
                <button onClick={() => { changeLanguage('es'); document.querySelector('.lang-dropdown')?.classList.remove('show'); }}>
                  🇪🇸 Español
                </button>
                <button onClick={() => { changeLanguage('fr'); document.querySelector('.lang-dropdown')?.classList.remove('show'); }}>
                  🇫🇷 Français
                </button>
                <button onClick={() => { changeLanguage('ar'); document.querySelector('.lang-dropdown')?.classList.remove('show'); }}>
                  🇸🇦 العربية
                </button>
                <button onClick={() => { changeLanguage('zh'); document.querySelector('.lang-dropdown')?.classList.remove('show'); }}>
                  🇨🇳 中文
                </button>
                <button onClick={() => { changeLanguage('ja'); document.querySelector('.lang-dropdown')?.classList.remove('show'); }}>
                  🇯🇵 日本語
                </button>
                <button onClick={() => { changeLanguage('ko'); document.querySelector('.lang-dropdown')?.classList.remove('show'); }}>
                  🇰🇷 한국어
                </button>
                <button onClick={() => { changeLanguage('ig'); document.querySelector('.lang-dropdown')?.classList.remove('show'); }}>
                  🇳🇬 Igbo
                </button>
                <button onClick={() => { changeLanguage('ha'); document.querySelector('.lang-dropdown')?.classList.remove('show'); }}>
                  🇳🇬 Hausa
                </button>
                <button onClick={() => { changeLanguage('yo'); document.querySelector('.lang-dropdown')?.classList.remove('show'); }}>
                  🇳🇬 Yoruba
                </button>
                <button onClick={() => { changeLanguage('hi'); document.querySelector('.lang-dropdown')?.classList.remove('show'); }}>
                  🇮🇳 हिंदी
                </button>
                <button onClick={() => { changeLanguage('bn'); document.querySelector('.lang-dropdown')?.classList.remove('show'); }}>
                  🇧🇩 বাংলা
                </button>
                <button onClick={() => { changeLanguage('pt'); document.querySelector('.lang-dropdown')?.classList.remove('show'); }}>
                  🇵🇹 Português
                </button>
                <button onClick={() => { changeLanguage('ru'); document.querySelector('.lang-dropdown')?.classList.remove('show'); }}>
                  🇷🇺 Русский
                </button>
                <button onClick={() => { changeLanguage('de'); document.querySelector('.lang-dropdown')?.classList.remove('show'); }}>
                  🇩🇪 Deutsch
                </button>
                <button onClick={() => { changeLanguage('tr'); document.querySelector('.lang-dropdown')?.classList.remove('show'); }}>
                  🇹🇷 Türkçe
                </button>
                <button onClick={() => { changeLanguage('it'); document.querySelector('.lang-dropdown')?.classList.remove('show'); }}>
                  🇮🇹 Italiano
                </button>
                <button onClick={() => { changeLanguage('pcm'); document.querySelector('.lang-dropdown')?.classList.remove('show'); }}>
                  🇳🇬 Pidgin
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-background">
          <div className="hero-gradient"></div>
          <div className="hero-particles"></div>
        </div>
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
            {t('hero_title')}
              <span className="hero-highlight"> {t('hero_title_highlight')}</span>
          </h1>
            <p className="hero-subtitle">
            {t('hero_subtitle')}
          </p>
            <div className="hero-actions">
              <Link href="/auth/signup" className="cta-button">
                <span>{t('start_learning_free')}</span>
                <div className="button-glow"></div>
            </Link>
              <Link href="/tutors" className="secondary-button">
              {t('browse_tutors')}
            </Link>
          </div>
        </div>
          <div className="hero-visual">
            <div className="floating-cards">
              <div className="card card-1">
                <div className="card-avatar">👩‍🏫</div>
                <div className="card-content">
                  <h4>{t('expert_tutors')}</h4>
                  <p>{t('native_speakers')}</p>
                </div>
                    </div>
              <div className="card card-2">
                <div className="card-avatar">🌍</div>
                <div className="card-content">
                  <h4>{t('global_community')}</h4>
                  <p>{t('learn_anytime')}</p>
                </div>
                    </div>
              <div className="card card-3">
                <div className="card-avatar">📈</div>
                <div className="card-content">
                  <h4>{t('track_progress')}</h4>
                  <p>{t('see_your_growth')}</p>
                </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stats-container">
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-icon">👨‍🏫</div>
              <div className="stat-number">{animatedStats.tutors}+</div>
              <div className="stat-label">{t('expert_tutors')}</div>
            </div>
            <div className="stat-item">
              <div className="stat-icon">🌍</div>
              <div className="stat-number">{animatedStats.languages}+</div>
              <div className="stat-label">{t('languages')}</div>
            </div>
            <div className="stat-item">
              <div className="stat-icon">😊</div>
              <div className="stat-number">{animatedStats.students}+</div>
              <div className="stat-label">{t('happy_students')}</div>
            </div>
            <div className="stat-item">
              <div className="stat-icon">✅</div>
              <div className="stat-number">{animatedStats.sessions}+</div>
              <div className="stat-label">{t('sessions_completed')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="features-container">
          <div className="section-header">
            <h2>{t('why_choose')}</h2>
            <p>{t('why_choose_subtitle')}</p>
          </div>
          <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">
                <div className="icon-bg">🌐</div>
              </div>
              <h3>{t('native_speakers')}</h3>
              <p>{t('native_speakers_desc')}</p>
            </div>
              <div className="feature-card">
                <div className="feature-icon">
                <div className="icon-bg">🏆</div>
              </div>
              <h3>{t('certified_tutors')}</h3>
              <p>{t('certified_tutors_desc')}</p>
            </div>
              <div className="feature-card">
                <div className="feature-icon">
                <div className="icon-bg">⏰</div>
              </div>
              <h3>{t('flexible_scheduling')}</h3>
              <p>{t('flexible_scheduling_desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works-section">
        <div className="how-it-works-container">
          <div className="section-header">
            <h2>{t('how_it_works_title')}</h2>
            <p>{t('how_it_works_subtitle')}</p>
          </div>
          <div className="steps-container">
            <div className="step-item">
                <div className="step-number">1</div>
              <div className="step-content">
                <h3>{t('how_it_works_1_title')}</h3>
                <p>{t('how_it_works_1_desc')}</p>
              </div>
            </div>
            <div className="step-item">
                <div className="step-number">2</div>
              <div className="step-content">
                <h3>{t('how_it_works_2_title')}</h3>
                <p>{t('how_it_works_2_desc')}</p>
              </div>
            </div>
            <div className="step-item">
                <div className="step-number">3</div>
              <div className="step-content">
                <h3>{t('how_it_works_3_title')}</h3>
                <p>{t('how_it_works_3_desc')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="testimonials-section">
        <div className="testimonials-container">
          <div className="section-header">
            <h2>{t('testimonials_title')}</h2>
            <p>{t('testimonials_subtitle')}</p>
          </div>
          <div className="testimonials-grid">
            {stats.recentTestimonials.length > 0 ? (
              stats.recentTestimonials.map((testimonial) => (
                <div key={testimonial.id} className="testimonial-card">
                  <div className="testimonial-header">
                    <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(testimonial.studentName)}&background=random&size=64`} alt={testimonial.studentName} className="testimonial-avatar" />
                    <div className="testimonial-info">
                      <h4>{testimonial.studentName}</h4>
                      <p>Learning {testimonial.language}</p>
                    </div>
                  </div>
                  <p className="testimonial-text">&ldquo;{testimonial.comment}&rdquo;</p>
                  <div className="testimonial-rating">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <span key={i} className="star">⭐</span>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <>
                  <div className="testimonial-card">
                  <div className="testimonial-header">
                    <img src="https://ui-avatars.com/api/?name=Sarah+J&background=random&size=64" alt="Sarah Johnson" className="testimonial-avatar" />
                    <div className="testimonial-info">
                      <h4>Sarah Johnson</h4>
                      <p>Learning Spanish</p>
                    </div>
                  </div>
                  <p className="testimonial-text">&ldquo;This platform helped me become fluent in Spanish in just 6 months. My tutor was amazing and made learning fun!&rdquo;</p>
                  <div className="testimonial-rating">
                    <span className="star">⭐</span><span className="star">⭐</span><span className="star">⭐</span><span className="star">⭐</span><span className="star">⭐</span>
                  </div>
                </div>
                  <div className="testimonial-card">
                  <div className="testimonial-header">
                    <img src="https://ui-avatars.com/api/?name=Michael+C&background=random&size=64" alt="Michael Chen" className="testimonial-avatar" />
                    <div className="testimonial-info">
                      <h4>Michael Chen</h4>
                      <p>Learning French</p>
                    </div>
                  </div>
                  <p className="testimonial-text">&ldquo;The personalized approach and native speakers made all the difference. I can now confidently speak French in business meetings.&rdquo;</p>
                  <div className="testimonial-rating">
                    <span className="star">⭐</span><span className="star">⭐</span><span className="star">⭐</span><span className="star">⭐</span><span className="star">⭐</span>
                  </div>
                </div>
                  <div className="testimonial-card">
                  <div className="testimonial-header">
                    <img src="https://ui-avatars.com/api/?name=Emma+D&background=random&size=64" alt="Emma Davis" className="testimonial-avatar" />
                    <div className="testimonial-info">
                      <h4>Emma Davis</h4>
                      <p>Learning German</p>
                    </div>
                  </div>
                  <p className="testimonial-text">&ldquo;Flexible scheduling and excellent tutors. I learned German while working full-time. Highly recommend!&rdquo;</p>
                  <div className="testimonial-rating">
                    <span className="star">⭐</span><span className="star">⭐</span><span className="star">⭐</span><span className="star">⭐</span><span className="star">⭐</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-container">
          <div className="cta-content">
          <h2>{t('cta_title')}</h2>
          <p>{t('cta_subtitle')}</p>
            <Link href="/auth/signup" className="cta-button-large">
              <span>{t('cta_button')}</span>
              <div className="button-glow"></div>
          </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="premium-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <div className="brand-logo">
                <div className="logo-icon">🎓</div>
                <span className="logo-text">{t('platform_name')}</span>
              </div>
              <p>{t('footer_tagline')}</p>
            </div>
            <div className="footer-links">
              <div className="link-group">
                <h4>{t('footer_platform')}</h4>
                <Link href="/about">{t('footer_about')}</Link>
                <Link href="/tutors">{t('find_tutors')}</Link>
                <Link href="/how-it-works">{t('how_it_works_title')}</Link>
              </div>
              <div className="link-group">
                <h4>{t('footer_support')}</h4>
                <Link href="/help">{t('help')}</Link>
                <Link href="/contact">{t('contact_us')}</Link>
                <Link href="/faq">{t('faq')}</Link>
              </div>
              <div className="link-group">
                <h4>{t('footer_legal')}</h4>
                <Link href="/privacy">{t('footer_privacy')}</Link>
                <Link href="/terms">{t('footer_terms')}</Link>
                <Link href="/cookies">{t('cookie_policy')}</Link>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} {t('platform_name')}. {t('all_rights_reserved')}.</p>
            <div className="social-links">
              <a href="#" className="social-link">📱</a>
              <a href="#" className="social-link">📧</a>
              <a href="#" className="social-link">🐦</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 