import React from 'react';

interface DashboardSidebarProps {
  students: Map<string, { name: string; online: boolean }>;
  onStudentClick?: (studentName: string) => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  students,
  onStudentClick
}) => {
  const studentsList = Array.from(students.values());
  
  return (
    <aside className="col-lg-5 mb-4">
      <div className="ultra-premium-sidebar" style={{ 
        minHeight: '700px',
        maxHeight: '85vh',
        overflowY: 'auto'
      }}>
        {/* News Section */}
        <div className="ultra-sidebar-section">
          <h6 className="ultra-sidebar-title">
            <i className="fas fa-newspaper"></i>
            Latest News
          </h6>
          <div className="ultra-news-item">
            <div className="ultra-news-date">Today</div>
            <div className="ultra-news-text">
              <i className="fas fa-dot-circle text-warning me-2"></i>
              New premium features available for tutors!
            </div>
          </div>
          <div className="ultra-news-item">
            <div className="ultra-news-date">Yesterday</div>
            <div className="ultra-news-text">
              <i className="fas fa-dot-circle text-warning me-2"></i>
              Platform updates and performance improvements
            </div>
          </div>
          <div className="ultra-news-item">
            <div className="ultra-news-date">2 days ago</div>
            <div className="ultra-news-text">
              <i className="fas fa-dot-circle text-warning me-2"></i>
              Enhanced student-teacher communication tools
            </div>
          </div>
        </div>

        {/* Students Section */}
        <div className="ultra-sidebar-section">
          <h6 className="ultra-sidebar-title">
            <i className="fas fa-users"></i>
            Your Students ({studentsList.length})
          </h6>
          {studentsList.length === 0 ? (
            <div className="text-center text-muted py-5">
              <i className="fas fa-user-graduate fa-4x mb-4"></i>
              <p className="mb-3">No students yet</p>
              <small className="text-muted">
                Start teaching to see your students here
              </small>
            </div>
          ) : (
            <div className="ultra-students-list">
              {studentsList.slice(0, 10).map((student, idx) => (
                <div 
                  key={idx} 
                  className="ultra-student-item"
                  onClick={() => onStudentClick?.(student.name)}
                  style={{ cursor: onStudentClick ? 'pointer' : 'default' }}
                >
                  <div className="ultra-student-avatar">
                    {student.name[0]}
                  </div>
                  <div className="ultra-student-info">
                    <h6 className="mb-1">{student.name}</h6>
                    <small className={student.online ? 'text-success' : 'text-muted'}>
                      {student.online ? 'Online' : 'Offline'}
                    </small>
                  </div>
                  <div className={`ultra-online-indicator ${student.online ? 'online' : 'offline'}`}></div>
                </div>
              ))}
              {studentsList.length > 10 && (
                <div className="text-center mt-3">
                  <small className="text-muted">
                    +{studentsList.length - 10} more students
                  </small>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Quick Actions */}
        <div className="ultra-sidebar-section">
          <h6 className="ultra-sidebar-title">
            <i className="fas fa-bolt"></i>
            Quick Actions
          </h6>
          <div className="ultra-quick-actions">
            <button className="ultra-quick-action-btn">
              <i className="fas fa-calendar-plus"></i>
              Schedule Session
            </button>
            <button className="ultra-quick-action-btn">
              <i className="fas fa-file-export"></i>
              Export Report
            </button>
            <button className="ultra-quick-action-btn">
              <i className="fas fa-cog"></i>
              Settings
            </button>
            <button className="ultra-quick-action-btn">
              <i className="fas fa-chart-line"></i>
              View Analytics
            </button>
          </div>
        </div>

        {/* Additional Info Section */}
        <div className="ultra-sidebar-section">
          <h6 className="ultra-sidebar-title">
            <i className="fas fa-info-circle"></i>
            Platform Info
          </h6>
          <div className="ultra-info-item">
            <div className="ultra-info-label">Active Sessions</div>
            <div className="ultra-info-value">3 ongoing</div>
          </div>
          <div className="ultra-info-item">
            <div className="ultra-info-label">Response Time</div>
            <div className="ultra-info-value">~15 min</div>
          </div>
          <div className="ultra-info-item">
            <div className="ultra-info-label">Per Session</div>
            <div className="ultra-info-value">₦4,000</div>
          </div>
        </div>
      </div>
    </aside>
  );
}; 