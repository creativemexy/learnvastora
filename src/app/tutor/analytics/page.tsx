"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Legend } from 'recharts';
import TutorNavBar from '@/components/TutorNavBar';
import '../dashboard/dashboard-premium.css';

// Add dynamic CSS animations
const dynamicStyles = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideInLeft {
    from { transform: translateX(-30px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideInRight {
    from { transform: translateX(30px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideInUp {
    from { transform: translateY(30px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  
  .animate-fade-in {
    animation: fadeIn 0.6s ease-out;
  }
  
  .animate-slide-in-left {
    animation: slideInLeft 0.6s ease-out;
  }
  
  .animate-slide-in-right {
    animation: slideInRight 0.6s ease-out;
  }
  
  .animate-slide-in-up {
    animation: slideInUp 0.6s ease-out;
  }
  
  .hover-scale {
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  
  .hover-scale:hover {
    transform: scale(1.05);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }
  
  .analytics-gradient {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
  }
  
  .analytics-card {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 20px;
    padding: 2rem;
    margin-bottom: 2rem;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  }
  
  .analytics-title {
    color: white;
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
  }
  
  .analytics-subtitle {
    color: rgba(255, 255, 255, 0.8);
    font-size: 1.1rem;
    margin-bottom: 2rem;
  }
  
  .chart-container {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 15px;
    padding: 1.5rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  }
  
  .stat-item {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 1rem;
    margin-bottom: 1rem;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
  
  .stat-label {
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
  }
  
  .stat-value {
    color: white;
    font-size: 1.5rem;
    font-weight: 600;
  }
`;

export default function TutorAnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  // Mock data for charts
  const sessionTypesData = [
    { name: 'Private', value: 67, color: '#3B82F6' },
    { name: 'Group', value: 33, color: '#F59E0B' }
  ];

  const topStudentsData = [
    { name: 'Sarah Johnson', sessions: 1 },
    { name: 'Mike Chen', sessions: 1 },
    { name: 'Emma Davis', sessions: 1 }
  ];

  // Authentication and routing
  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/auth/signin");
      return;
    }

    if ((session.user as any)?.role !== "TUTOR") {
      router.push("/");
      return;
    }
  }, [session, status, router]);

  // Fetch analytics data
  useEffect(() => {
    if (session) {
      fetchAnalyticsData();
    }
  }, [session]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/tutor/analytics', {
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const data = await response.json();
      setAnalyticsData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load analytics';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { 
      style: 'currency', 
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Loading state
  if (status === "loading" || loading) {
    return (
      <div className="analytics-gradient">
        <TutorNavBar />
        <div className="ultra-loading-container">
          <div className="ultra-spinner"></div>
          <p className="ultra-loading-text">Loading your analytics...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="analytics-gradient">
        <TutorNavBar />
        <div className="ultra-error-container">
          <div className="ultra-error-content">
            <div className="ultra-error-icon">⚠️</div>
            <h2 className="ultra-error-title">Analytics Error</h2>
            <p className="ultra-error-message">{error}</p>
            <div className="ultra-error-actions">
              <button className="ultra-error-btn primary" onClick={fetchAnalyticsData}>
                Try Again
              </button>
              <button className="ultra-error-btn secondary" onClick={() => router.push('/tutor/dashboard')}>
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No session state
  if (!session) {
    return null;
  }

  return (
    <div className="analytics-gradient">
      <style dangerouslySetInnerHTML={{ __html: dynamicStyles }} />
      <TutorNavBar />
      
      <div className="container-fluid" style={{ paddingTop: '80px' }}>
        <div className="row">
          <div className="col-12">
            <div className="text-center mb-5 animate-fade-in">
              <h1 className="analytics-title animate-slide-in-up">
                <i className="fas fa-chart-bar me-3"></i>
                Session Analytics
              </h1>
              <p className="analytics-subtitle animate-slide-in-up" style={{ animationDelay: '0.2s' }}>
                Track your performance and optimize your teaching business
              </p>
            </div>
          </div>
        </div>

        <div className="row">
          {/* Left Side - Session Types Distribution */}
          <div className="col-lg-6 animate-slide-in-left">
            <div className="analytics-card">
              <h3 className="text-white mb-4">
                <i className="fas fa-chart-pie me-2"></i>
                Session Types Distribution
              </h3>
              
              <div className="chart-container hover-scale">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={sessionTypesData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {sessionTypesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="row mt-4">
                <div className="col-6">
                  <div className="stat-item">
                    <div className="stat-label">Average Session Duration</div>
                    <div className="stat-value">45 min</div>
                  </div>
                </div>
                <div className="col-6">
                  <div className="stat-item">
                    <div className="stat-label">Most Frequent Student</div>
                    <div className="stat-value">Sarah Johnson</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Top Students */}
          <div className="col-lg-6 animate-slide-in-right">
            <div className="analytics-card">
              <h3 className="text-white mb-4">
                <i className="fas fa-users me-2"></i>
                Top Students
              </h3>
              
              <div className="chart-container hover-scale">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topStudentsData}>
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 1]} />
                    <Tooltip />
                    <Bar dataKey="sessions" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="row mt-4">
                <div className="col-12">
                  <div className="stat-item">
                    <div className="stat-label">Total Sessions</div>
                    <div className="stat-value">3</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Analytics Cards */}
        {analyticsData && (
          <div className="row mt-4">
            <div className="col-md-3 mb-4 animate-slide-in-up" style={{ animationDelay: '0.4s' }}>
              <div className="analytics-card text-center hover-scale">
                <i className="bi bi-calendar-check text-warning fs-1 mb-3"></i>
                <h3 className="stat-value">{analyticsData.totalSessions || 0}</h3>
                <p className="stat-label">Total Sessions</p>
              </div>
            </div>
            
            <div className="col-md-3 mb-4 animate-slide-in-up" style={{ animationDelay: '0.5s' }}>
              <div className="analytics-card text-center hover-scale">
                <i className="bi bi-currency-dollar text-success fs-1 mb-3"></i>
                <h3 className="stat-value">{formatCurrency(analyticsData.totalEarnings || 0)}</h3>
                <p className="stat-label">Total Earnings</p>
              </div>
            </div>
            
            <div className="col-md-3 mb-4 animate-slide-in-up" style={{ animationDelay: '0.6s' }}>
              <div className="analytics-card text-center hover-scale">
                <i className="bi bi-star text-warning fs-1 mb-3"></i>
                <h3 className="stat-value">{analyticsData.averageRating?.toFixed(1) || '0.0'}</h3>
                <p className="stat-label">Average Rating</p>
              </div>
            </div>
            
            <div className="col-md-3 mb-4 animate-slide-in-up" style={{ animationDelay: '0.7s' }}>
              <div className="analytics-card text-center hover-scale">
                <i className="bi bi-people text-primary fs-1 mb-3"></i>
                <h3 className="stat-value">{analyticsData.totalStudents || 0}</h3>
                <p className="stat-label">Total Students</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 