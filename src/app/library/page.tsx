"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import StudentNavbar from "@/components/StudentNavbar";
import '@/styles/library.css';

export default function LibraryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  
  // UI state
  const [isVisible, setIsVisible] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Data state
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Authentication and routing
  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/auth/signin");
      return;
    }

    if ((session.user as any)?.role !== "STUDENT") {
      router.push("/");
      return;
    }
  }, [session, status, router]);

  // Animation effects
  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Fetch resources
  const fetchResources = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/library');
      if (response.ok) {
        const data = await response.json();
        setResources(data.resources || []);
      } else {
        setError('Failed to fetch resources');
      }
    } catch (err) {
      setError('Error fetching resources');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  if (status === "loading" || loading) {
    return (
      <div className="library-container">
        <StudentNavbar />
        <div className="library-content">
          <div className="loading-spinner">
            <div className="spinner-ring"></div>
            <div className="spinner-text">Loading library...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="library-container">
      <div className="animated-background">
        <div className="floating-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
          <div className="shape shape-4"></div>
          <div className="shape shape-5"></div>
        </div>
      </div>
      <StudentNavbar />
      <div className="library-content">
        <div className={`hero-section ${isVisible ? 'visible' : ''}`}>
          <div className="hero-content">
            <div className="hero-icon">📚</div>
            <h1 className="hero-title">{t('library_section.title')}</h1>
            <p className="hero-subtitle">{t('library_section.subtitle')}</p>
            <div className="hero-stats">
              <div className="stat-item">
                <span className="stat-number">{resources.length}</span>
                <span className="stat-label">Resources</span>
              </div>
            </div>
          </div>
        </div>

        <div className={`resources-section ${isVisible ? 'visible' : ''}`}>
          <div className="resources-header">
            <h2 className="section-title">Learning Resources</h2>
            <div className="resources-count">
              {resources.length} resources
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {resources.length > 0 ? (
            <div className="resources-container grid-view">
              {resources.map((resource, index) => (
                <div key={resource.id} className="resource-card">
                  <div className="resource-content">
                    <h3 className="resource-title">{resource.title}</h3>
                    <p className="resource-description">{resource.description}</p>
                    <div className="resource-meta">
                      <span className="difficulty-badge">{resource.difficulty}</span>
                      <span className="duration-badge">{resource.duration} min</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📚</div>
              <h3>No resources found</h3>
              <p>Try adjusting your search or filter criteria</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 