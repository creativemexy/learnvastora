import React from 'react';

interface DashboardStatsProps {
  stats: {
    activeSessions: number;
    totalStudents: number;
    pendingBookings: number;
    totalHours: number;
    completedSessions: number;
    totalEarnings: number;
    balance: number;
    rating: number | null;
    payments: number;
  };
  isAutoRefreshing?: boolean;
  lastUpdated?: Date | null;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ 
  stats, 
  isAutoRefreshing = false,
  lastUpdated = null 
}) => {
  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(balance);
  };
  
  const formatHours = (hours: number) => {
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h`;
    }
    return `${hours}h`;
  };
  
  const formatRating = (rating: number | null) => {
    return rating ? `${rating.toFixed(1)} ⭐` : '-';
  };
  
  return (
    <div className="ultra-premium-stats-bar">
      <div className="container-fluid">
        <div className="d-flex flex-wrap align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-3">
            {isAutoRefreshing && (
              <div className="ultra-auto-refresh-indicator">
                <i className="fas fa-sync-alt fa-spin"></i>
                <span>Auto-refreshing...</span>
              </div>
            )}
          </div>
          
          <div className="d-flex flex-wrap align-items-center gap-3">
            <div className="ultra-stat-block">
              <div className="ultra-stat-label">Current Balance</div>
              <div className="ultra-stat-value">
                {formatBalance(stats.balance)}
              </div>
            </div>
            
            <div className="ultra-stat-block">
              <div className="ultra-stat-label">Current Rating</div>
              <div className="ultra-stat-value">
                {formatRating(stats.rating)}
              </div>
            </div>
            
            <div className="ultra-stat-block">
              <div className="ultra-stat-label">Total Sessions</div>
              <div className="ultra-stat-value">
                {stats.completedSessions}
              </div>
            </div>
            
            <div className="ultra-stat-block">
              <div className="ultra-stat-label">Students Met</div>
              <div className="ultra-stat-value">
                {stats.totalStudents}
              </div>
            </div>
            
            <div className="ultra-stat-block">
              <div className="ultra-stat-label">Total Hours</div>
              <div className="ultra-stat-value">
                {formatHours(stats.totalHours)}
              </div>
            </div>
            
            <div className="ultra-stat-block">
              <div className="ultra-stat-label">Total Earnings</div>
              <div className="ultra-stat-value">
                {formatBalance(stats.totalEarnings)}
              </div>
            </div>
            
            <div className="ultra-stat-block">
              <div className="ultra-stat-label">Payments Received</div>
              <div className="ultra-stat-value">
                {formatBalance(stats.payments)}
              </div>
            </div>
          </div>
          
          {lastUpdated && (
            <div className="ultra-last-updated">
              <small>Last updated: {lastUpdated.toLocaleTimeString()}</small>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 