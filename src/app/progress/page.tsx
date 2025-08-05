"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

export const dynamic = 'force-dynamic';

import Link from "next/link";
import StudentNavbar from "@/components/StudentNavbar";
import './progress-learnvastora.css';

interface ProgressStats {
  totalSessions: number;
  upcomingSessions: number;
  totalHours: number;
  currentStreak: number;
  longestStreak: number;
  averageRating: number;
  totalReviews: number;
  languagesLearned: number;
  tutorsWorkedWith: number;
  weeklyProgress: Array<{
    week: string;
    sessions: number;
    hours: number;
    rating: number;
  }>;
  monthlyProgress: Array<{
    month: string;
    sessions: number;
    hours: number;
    rating: number;
  }>;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'streak' | 'sessions' | 'rating' | 'language' | 'special';
  isUnlocked: boolean;
  progress: number; // 0-100
  target: number;
  current: number;
  unlockedAt?: string;
}

interface LearningGoal {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  unit: string;
  deadline?: string;
  isCompleted: boolean;
  category: string;
}

export default function ProgressPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [progressStats, setProgressStats] = useState<ProgressStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [learningGoals, setLearningGoals] = useState<LearningGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'goals' | 'analytics'>('overview');
  const [isVisible, setIsVisible] = useState(false);
  const [animateCards, setAnimateCards] = useState(false);
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  useEffect(() => {
    console.log('🔍 Session status:', status);
    console.log('🔍 Session data:', session);
    
    if (status === "loading") {
      console.log('⏳ Session loading...');
      return;
    }
    
    if (!session) {
      console.log('❌ No session found, redirecting to signin');
      router.push("/auth/signin");
      return;
    }

    console.log('👤 User role:', (session.user as any)?.role);
    
    if ((session.user as any)?.role !== "STUDENT") {
      console.log('❌ User is not a student, redirecting to home');
      router.push("/");
      return;
    }

    console.log('✅ Session validated, fetching progress data');
    fetchProgressData();
  }, [session, status, router]);

  useEffect(() => {
    setIsVisible(true);
    setAnimateCards(true);
  }, []);

  const fetchProgressData = async (isBackgroundRefresh = false) => {
    try {
      // Check cache before making API call
      const now = Date.now();
      if (isBackgroundRefresh && (now - lastFetchTime) < CACHE_DURATION) {
        return; // Use cached data
      }

      if (!isBackgroundRefresh) setLoading(true);
      setError(null);
      
      console.log('🔄 Fetching progress data...');
      
      const response = await fetch('/api/progress', {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('📊 Received data:', data);
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (!data.progressStats) {
        throw new Error('Invalid response: missing progressStats');
      }
      
      setProgressStats(data.progressStats);
      setAchievements(data.achievements || []);
      setLearningGoals(data.learningGoals || []);
      setLastFetchTime(now);
      
      console.log('✅ Progress data updated successfully');
      
      // Show success message for new achievements
      const newlyUnlockedAchievements = (data.achievements || []).filter((achievement: Achievement) => 
        achievement.isUnlocked && achievement.unlockedAt && 
        new Date(achievement.unlockedAt).getTime() > Date.now() - 60000 // Unlocked in the last minute
      );
      
      if (newlyUnlockedAchievements.length > 0) {
        newlyUnlockedAchievements.forEach((achievement: Achievement) => {
          toast.success(`🎉 Achievement Unlocked: ${achievement.title}!`);
        });
      }
      
    } catch (error) {
      console.error("❌ Error fetching progress data:", error);
      console.error("❌ Error stack:", error instanceof Error ? error.stack : 'No stack trace');
      const errorMessage = error instanceof Error ? error.message : "Failed to load progress data";
      setError(errorMessage);
      if (!isBackgroundRefresh) toast.error(errorMessage);
    } finally {
      if (!isBackgroundRefresh) setLoading(false);
    }
  };

  // Auto-refresh data every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (session && !loading) {
        fetchProgressData(true); // Background refresh
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [session, loading]);

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const getAchievementColor = (category: string) => {
    switch (category) {
      case 'streak': return 'warning';
      case 'sessions': return 'primary';
      case 'rating': return 'success';
      case 'language': return 'info';
      case 'special': return 'danger';
      default: return 'secondary';
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const formatRating = (rating: number) => {
    return rating.toFixed(1);
  };

  if (status === "loading" || loading) {
    return (
      <div className="learnvastora-bg">
        <div className="premium-loading-container">
          <div className="loading-spinner">
            <div className="spinner-ring"></div>
            <div className="spinner-text">{t('loading')}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="learnvastora-bg">
      <StudentNavbar />
      
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-xl-10 col-lg-11">
            {/* Header */}
            <div className={`learnvastora-header-box ${isVisible ? 'visible' : ''}`}>
              <h1 className="learnvastora-title">{t('progress.title')}</h1>
              <p className="learnvastora-subtitle">{t('progress.track_your_learning_journey')}</p>
            </div>

            {/* Error Display */}
            {error && (
              <div className="alert alert-danger mb-4" role="alert">
                <div className="d-flex align-items-center">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  <div>
                    <strong>Error:</strong> {error}
                    <button 
                      className="btn btn-sm btn-outline-danger ms-3"
                      onClick={() => fetchProgressData()}
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Tabs */}
            <div className={`learnvastora-tabs-section ${isVisible ? 'visible' : ''}`}>
              <ul className="nav nav-tabs">
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                  >
                    <i className="bi bi-graph-up"></i>
                    {t('progress.overview')}
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'achievements' ? 'active' : ''}`}
                    onClick={() => setActiveTab('achievements')}
                  >
                    <i className="bi bi-trophy"></i>
                    {t('progress.achievements')}
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'goals' ? 'active' : ''}`}
                    onClick={() => setActiveTab('goals')}
                  >
                    <i className="bi bi-target"></i>
                    {t('progress.goals')}
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'analytics' ? 'active' : ''}`}
                    onClick={() => setActiveTab('analytics')}
                  >
                    <i className="bi bi-bar-chart"></i>
                    {t('progress.analytics')}
                  </button>
                </li>
              </ul>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && progressStats && (
              <div className={`learnvastora-overview-section ${isVisible ? 'visible' : ''}`}>
                {/* Key Stats */}
                <div className="row g-4 mb-4">
                  <div className="col-md-3">
                    <div className={`learnvastora-stat-card ${animateCards ? 'animate-in' : ''}`} style={{ animationDelay: '0.1s' }}>
                      <div className="learnvastora-stat-icon">
                        <i className="bi bi-calendar-check"></i>
                      </div>
                      <div className="learnvastora-stat-content">
                        <h3 className="learnvastora-stat-number">{formatNumber(progressStats.totalSessions)}</h3>
                        <p className="learnvastora-stat-label">{t('progress.total_sessions')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className={`learnvastora-stat-card ${animateCards ? 'animate-in' : ''}`} style={{ animationDelay: '0.2s' }}>
                      <div className="learnvastora-stat-icon">
                        <i className="bi bi-calendar-plus"></i>
                      </div>
                      <div className="learnvastora-stat-content">
                        <h3 className="learnvastora-stat-number">{formatNumber(progressStats.upcomingSessions)}</h3>
                        <p className="learnvastora-stat-label">{t('progress.upcoming_sessions')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className={`learnvastora-stat-card ${animateCards ? 'animate-in' : ''}`} style={{ animationDelay: '0.3s' }}>
                      <div className="learnvastora-stat-icon">
                        <i className="bi bi-clock"></i>
                      </div>
                      <div className="learnvastora-stat-content">
                        <h3 className="learnvastora-stat-number">{formatNumber(progressStats.totalHours)}</h3>
                        <p className="learnvastora-stat-label">{t('progress.total_hours')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className={`learnvastora-stat-card ${animateCards ? 'animate-in' : ''}`} style={{ animationDelay: '0.4s' }}>
                      <div className="learnvastora-stat-icon">
                        <i className="bi bi-fire"></i>
                      </div>
                      <div className="learnvastora-stat-content">
                        <h3 className="learnvastora-stat-number">{formatNumber(progressStats.currentStreak)}</h3>
                        <p className="learnvastora-stat-label">{t('progress.day_streak')}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress Summary */}
                <div className="row g-4">
                  <div className="col-md-6">
                    <div className={`learnvastora-card ${animateCards ? 'animate-in' : ''}`} style={{ animationDelay: '0.5s' }}>
                      <h5 className="learnvastora-card-title">
                        <i className="bi bi-graph-up"></i>
                        {t('progress.weekly_progress')}
                      </h5>
                      <div className="learnvastora-progress-chart">
                        {progressStats.weeklyProgress.map((week, index) => (
                          <div key={index} className="progress-item">
                            <div className="progress-label">{week.week}</div>
                            <div className="progress-bar-container">
                              <div 
                                className="progress-bar" 
                                style={{width: `${(week.sessions / 5) * 100}%`}}
                              ></div>
                            </div>
                            <div className="progress-value">{week.sessions} {t('progress.sessions')}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className={`learnvastora-card ${animateCards ? 'animate-in' : ''}`} style={{ animationDelay: '0.6s' }}>
                      <h5 className="learnvastora-card-title">
                        <i className="bi bi-people"></i>
                        {t('progress.learning_diversity')}
                      </h5>
                      <div className="learnvastora-diversity-stats">
                        <div className="diversity-item">
                          <div className="diversity-icon">
                            <i className="bi bi-globe"></i>
                          </div>
                          <div className="diversity-content">
                            <h6>{formatNumber(progressStats.languagesLearned)}</h6>
                            <p>{t('progress.languages_learned')}</p>
                          </div>
                        </div>
                        <div className="diversity-item">
                          <div className="diversity-icon">
                            <i className="bi bi-person-badge"></i>
                          </div>
                          <div className="diversity-content">
                            <h6>{formatNumber(progressStats.tutorsWorkedWith)}</h6>
                            <p>{t('progress.tutors_worked_with')}</p>
                          </div>
                        </div>
                        <div className="diversity-item">
                          <div className="diversity-icon">
                            <i className="bi bi-chat-quote"></i>
                          </div>
                          <div className="diversity-content">
                            <h6>{formatNumber(progressStats.totalReviews)}</h6>
                            <p>{t('progress.reviews_received')}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'achievements' && (
              <div className={`learnvastora-achievements-section ${isVisible ? 'visible' : ''}`}>
                <div className="row g-4">
                  {achievements.map((achievement, index) => (
                    <div key={achievement.id} className="col-md-6 col-lg-4">
                      <div className={`learnvastora-achievement-card ${achievement.isUnlocked ? 'unlocked' : 'locked'} ${animateCards ? 'animate-in' : ''}`} 
                           style={{ animationDelay: `${index * 0.1}s` }}>
                        <div className="achievement-icon">
                          <i className={`bi ${achievement.icon} ${achievement.isUnlocked ? 'text-warning' : 'text-muted'}`}></i>
                        </div>
                        <div className="achievement-content">
                          <h5 className="achievement-title">{achievement.title}</h5>
                          <p className="achievement-description">{achievement.description}</p>
                          <div className="achievement-progress">
                            <div className="progress">
                              <div 
                                className={`progress-bar bg-${getAchievementColor(achievement.category)}`}
                                style={{width: `${achievement.progress}%`}}
                              ></div>
                            </div>
                            <small>
                              {achievement.current} / {achievement.target}
                            </small>
                          </div>
                          {achievement.isUnlocked && achievement.unlockedAt && (
                            <small className="text-success">
                              <i className="bi bi-check-circle me-1"></i>
                              {t('progress.unlocked')} {new Date(achievement.unlockedAt).toLocaleDateString()}
                            </small>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'goals' && (
              <div className={`learnvastora-goals-section ${isVisible ? 'visible' : ''}`}>
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h4 className="text-white">{t('progress.learning_goals')}</h4>
                  <button className="learnvastora-btn">
                    <i className="bi bi-plus me-2"></i>
                    {t('progress.add_goal')}
                  </button>
                </div>
                
                <div className="row g-4">
                  {learningGoals.map((goal, index) => (
                    <div key={goal.id} className="col-md-6">
                      <div className={`learnvastora-goal-card ${animateCards ? 'animate-in' : ''}`} 
                           style={{ animationDelay: `${index * 0.1}s` }}>
                        <div className="goal-header">
                          <h5 className="goal-title">{goal.title}</h5>
                          <span className={`badge ${goal.isCompleted ? 'bg-success' : 'bg-warning'}`}>
                            {goal.isCompleted ? t('progress.completed') : t('progress.in_progress')}
                          </span>
                        </div>
                        <p className="goal-description">{goal.description}</p>
                        <div className="goal-progress">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="goal-current">{goal.current} {goal.unit}</span>
                            <span className="goal-target">{goal.target} {goal.unit}</span>
                          </div>
                          <div className="progress">
                            <div 
                              className="progress-bar"
                              style={{width: `${getProgressPercentage(goal.current, goal.target)}%`}}
                            ></div>
                          </div>
                          <small>
                            {getProgressPercentage(goal.current, goal.target).toFixed(1)}% {t('progress.complete')}
                          </small>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'analytics' && progressStats && (
              <div className={`learnvastora-analytics-section ${isVisible ? 'visible' : ''}`}>
                <div className="row g-4">
                  <div className="col-md-8">
                    <div className={`learnvastora-card ${animateCards ? 'animate-in' : ''}`} style={{ animationDelay: '0.1s' }}>
                      <h5 className="learnvastora-card-title">
                        <i className="bi bi-bar-chart"></i>
                        {t('progress.monthly_progress')}
                      </h5>
                      <div className="analytics-chart">
                        {progressStats.monthlyProgress.map((month, index) => (
                          <div key={index} className="chart-bar">
                            <div className="bar-label">{month.month}</div>
                            <div className="bar-container">
                              <div 
                                className="bar-fill"
                                style={{height: `${(month.sessions / 20) * 100}%`}}
                              ></div>
                            </div>
                            <div className="bar-value">{month.sessions}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className={`learnvastora-card ${animateCards ? 'animate-in' : ''}`} style={{ animationDelay: '0.2s' }}>
                      <h5 className="learnvastora-card-title">
                        <i className="bi bi-speedometer2"></i>
                        {t('progress.performance_metrics')}
                      </h5>
                      <div className="metrics-list">
                        <div className="metric-item">
                          <div className="metric-label">{t('progress.longest_streak')}</div>
                          <div className="metric-value">{progressStats.longestStreak} {t('progress.days')}</div>
                        </div>
                        <div className="metric-item">
                          <div className="metric-label">{t('progress.avg_sessions_per_week')}</div>
                          <div className="metric-value">
                            {(progressStats.totalSessions / 12).toFixed(1)}
                          </div>
                        </div>
                        <div className="metric-item">
                          <div className="metric-label">{t('progress.completion_rate')}</div>
                          <div className="metric-value">98%</div>
                        </div>
                      </div>
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