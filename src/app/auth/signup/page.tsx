"use client"

export const dynamic = 'force-dynamic';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { ClipLoader } from "react-spinners";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import './signup-premium.css';

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("STUDENT");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { t, i18n } = useTranslation();
  
  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedLanguage', lng);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });
    setLoading(false);
    if (res.ok) {
      toast.success("Registration successful! Please sign in.");
      router.push("/auth/signin");
    } else {
      const data = await res.json();
      toast.error(data.error || "Registration failed");
    }
  }

  return (
    <main className="premium-signup-bg">
      {/* Premium Header */}
      <header className="premium-signup-header">
        <div className="container d-flex justify-content-between align-items-center">
          <Link href="/" className="premium-brand">
            LearnVastora
          </Link>
          <div className="premium-header-actions">
            {/* Language Switcher */}
            <div className="dropdown">
              <button
                className="premium-lang-btn dropdown-toggle"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <span role="img" aria-label="language">🌐</span>
                <span>{(i18n.language ? i18n.language.toUpperCase() : 'EN') || 'EN'}</span>
              </button>
              <ul className="dropdown-menu dropdown-menu-end">
                <li><button className="dropdown-item" onClick={() => changeLanguage('en')}>English</button></li>
                <li><button className="dropdown-item" onClick={() => changeLanguage('es')}>Español</button></li>
                <li><button className="dropdown-item" onClick={() => changeLanguage('fr')}>Français</button></li>
                <li><button className="dropdown-item" onClick={() => changeLanguage('ar')}>العربية</button></li>
                <li><button className="dropdown-item" onClick={() => changeLanguage('zh')}>中文</button></li>
                <li><button className="dropdown-item" onClick={() => changeLanguage('ja')}>日本語</button></li>
                <li><button className="dropdown-item" onClick={() => changeLanguage('ko')}>한국어</button></li>
              </ul>
            </div>
            <Link href="/auth/signin" className="premium-signin-btn">
              {t('signup_signin_link') || 'Sign In'}
            </Link>
          </div>
        </div>
      </header>

      {/* Premium Signup Container */}
      <div className="premium-signup-container">
        <div className="premium-signup-card">
          {/* Premium Signup Header */}
          <div className="premium-signup-header-content">
            <div className="premium-signup-icon">
              <i className="fas fa-user-plus"></i>
            </div>
            <h1 className="premium-signup-title">{t('signup_title')}</h1>
            <p className="premium-signup-subtitle">{t('signup_subtitle')}</p>
          </div>

          {/* Premium Form */}
          <form onSubmit={handleSubmit}>
            <div className="premium-form-group">
              <label htmlFor="name" className="premium-form-label">
                {t('signup_name_label')}
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="premium-form-input"
                placeholder={t('signup_name_placeholder')}
              />
            </div>

            <div className="premium-form-group">
              <label htmlFor="email" className="premium-form-label">
                {t('signup_email_label')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="premium-form-input"
                placeholder={t('signup_email_placeholder')}
              />
            </div>

            <div className="premium-form-group">
              <label htmlFor="password" className="premium-form-label">
                {t('signup_password_label')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="premium-form-input"
                placeholder={t('signup_password_placeholder')}
              />
            </div>

            <div className="premium-form-group">
              <label htmlFor="role" className="premium-form-label">
                {t('signup_role_label')}
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
                className="premium-form-select"
              >
                <option value="STUDENT">{t('signup_role_student')}</option>
                <option value="TUTOR">{t('signup_role_tutor')}</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="premium-submit-btn"
            >
              {loading ? (
                <div className="d-flex align-items-center justify-content-center">
                  <div className="premium-spinner"></div>
                  {t('signup_creating')}
                </div>
              ) : (
                t('signup_button')
              )}
            </button>
          </form>

          {/* Premium Links */}
          <div className="premium-signup-links">
            <p className="mb-0">
              {t('signup_already')} {" "}
              <Link href="/auth/signin" className="premium-signup-link">
                {t('signup_signin_link')}
              </Link>
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-4">
          <Link href="/" className="premium-back-link">
            <i className="fas fa-arrow-left"></i>
            {t('signup_back_home')}
          </Link>
        </div>
      </div>

      {/* Premium Footer */}
      <footer className="premium-signup-footer">
        <div className="container">
          <div className="premium-footer-brand">LearnVastora</div>
          <div className="premium-footer-links">
            <Link href="/" className="premium-footer-link">{t('footer_about')}</Link>
            <Link href="/privacy" className="premium-footer-link">{t('footer_privacy')}</Link>
            <Link href="/terms" className="premium-footer-link">{t('footer_terms')}</Link>
          </div>
          <div className="premium-footer-copyright">
            &copy; {new Date().getFullYear()} LearnVastora. {t('footer_android_ios_coming')}
          </div>
        </div>
      </footer>
    </main>
  );
} 