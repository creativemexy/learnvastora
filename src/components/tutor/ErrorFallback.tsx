import React from 'react';

interface ErrorFallbackProps {
  error: Error | string;
  onRetry?: () => void;
  onRefresh?: () => void;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({ 
  error, 
  onRetry, 
  onRefresh 
}) => {
  const errorMessage = typeof error === 'string' ? error : error.message;
  
  return (
    <div className="ultra-error-container">
      <div className="ultra-error-content">
        <div className="ultra-error-icon">
          <i className="fas fa-exclamation-triangle"></i>
        </div>
        <h3 className="ultra-error-title">Something went wrong</h3>
        <p className="ultra-error-message">{errorMessage}</p>
        <div className="ultra-error-actions">
          {onRetry && (
            <button 
              className="ultra-error-btn primary"
              onClick={onRetry}
            >
              <i className="fas fa-redo"></i>
              Try Again
            </button>
          )}
          {onRefresh && (
            <button 
              className="ultra-error-btn secondary"
              onClick={onRefresh}
            >
              <i className="fas fa-sync"></i>
              Refresh Page
            </button>
          )}
        </div>
      </div>
    </div>
  );
}; 