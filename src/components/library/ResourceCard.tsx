import React, { useState, useCallback } from 'react';
import { UnifiedResource } from '@/types/library';

interface ResourceCardProps {
  resource: UnifiedResource;
  role: 'student' | 'tutor';
  viewMode: 'grid' | 'list';
  onAction: (action: string, resourceId: string, data?: any) => void;
  formatDuration: (minutes: number) => string;
  getTypeIcon: (type: string) => string;
  getDifficultyColor: (difficulty: string) => string;
  isFavorite?: boolean;
  isDownloaded?: boolean;
  showProgress?: boolean;
}

export const ResourceCard: React.FC<ResourceCardProps> = ({
  resource,
  role,
  viewMode,
  onAction,
  formatDuration,
  getTypeIcon,
  getDifficultyColor,
  isFavorite = false,
  isDownloaded = false,
  showProgress = true,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleAction = useCallback((action: string, data?: any) => {
    onAction(action, resource.id, data);
  }, [onAction, resource.id]);

  const handleCardClick = useCallback(() => {
    if (role === 'student') {
      handleAction('open', { progress: resource.metadata.student?.progress || 0 });
    } else {
      setShowPreview(true);
    }
  }, [role, handleAction, resource.metadata.student?.progress]);

  const StudentActions = () => (
    <div className="resource-actions">
      <button 
        className="action-btn primary"
        onClick={(e) => {
          e.stopPropagation();
          handleAction('start', { progress: resource.metadata.student?.progress || 0 });
        }}
      >
        {resource.metadata.student?.progress && resource.metadata.student.progress > 0 
          ? 'Continue Learning' 
          : 'Start Learning'
        }
      </button>
      
      {showProgress && resource.metadata.student?.progress !== undefined && (
        <div className="progress-info">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${resource.metadata.student.progress}%` }}
            />
          </div>
          <span className="progress-text">{resource.metadata.student.progress}% complete</span>
        </div>
      )}
    </div>
  );

  const TutorActions = () => (
    <div className="resource-actions">
      <button 
        className={`action-btn ${isFavorite ? 'primary' : 'secondary'}`}
        onClick={(e) => {
          e.stopPropagation();
          handleAction('favorite');
        }}
        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        {isFavorite ? '⭐' : '☆'}
      </button>
      
      <button 
        className="action-btn primary"
        onClick={(e) => {
          e.stopPropagation();
          handleAction('download');
        }}
        title="Download resource"
      >
        📥
      </button>
      
      <button 
        className="action-btn secondary"
        onClick={(e) => {
          e.stopPropagation();
          setShowPreview(true);
        }}
        title="Preview resource"
      >
        👁️
      </button>
    </div>
  );

  const ResourceMeta = () => (
    <div className="resource-meta">
      <span className={`difficulty-badge ${getDifficultyColor(resource.difficulty)}`}>
        {resource.difficulty}
      </span>
      <span className="duration-badge">
        {formatDuration(resource.duration)}
      </span>
      {role === 'tutor' && resource.metadata.tutor && (
        <>
          <span className="rating-badge">
            ⭐ {resource.metadata.tutor.rating.toFixed(1)}
          </span>
          <span className="downloads-badge">
            📥 {resource.metadata.tutor.downloads}
          </span>
        </>
      )}
    </div>
  );

  const ResourceTags = () => (
    <div className="resource-tags">
      {resource.tags.slice(0, 3).map(tag => (
        <span key={tag} className="tag">{tag}</span>
      ))}
      {resource.tags.length > 3 && (
        <span className="tag-more">+{resource.tags.length - 3}</span>
      )}
    </div>
  );

  const ResourceFooter = () => (
    <div className="resource-footer">
      <span className="language">{resource.language}</span>
      <span className="age-group">{resource.ageGroup}</span>
      <span className="created-date">
        {new Date(resource.createdAt).toLocaleDateString()}
      </span>
    </div>
  );

  const GridView = () => (
    <div 
      className={`resource-card grid ${isHovered ? 'hovered' : ''} ${isFavorite ? 'favorite' : ''} ${isDownloaded ? 'downloaded' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      <div className="resource-thumbnail">
        {resource.thumbnail ? (
          <img src={resource.thumbnail} alt={resource.title} />
        ) : (
          <div className="resource-placeholder">
            {getTypeIcon(resource.type)}
          </div>
        )}
        <div className="resource-overlay">
          <div className="resource-type">
            {getTypeIcon(resource.type)}
          </div>
          {isHovered && (
            <div className="hover-actions">
              {role === 'student' ? (
                <button className="hover-btn primary">
                  {resource.metadata.student?.progress && resource.metadata.student.progress > 0 
                    ? 'Continue' 
                    : 'Start'
                  }
                </button>
              ) : (
                <button className="hover-btn primary">Preview</button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="resource-content">
        <div className="resource-header">
          <h3 className="resource-title">{resource.title}</h3>
          {role === 'tutor' && (
            <div className="resource-actions-compact">
              <button 
                className={`action-btn-compact ${isFavorite ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAction('favorite');
                }}
              >
                {isFavorite ? '⭐' : '☆'}
              </button>
            </div>
          )}
        </div>

        <p className="resource-description">{resource.description}</p>
        
        <ResourceMeta />
        <ResourceTags />
        <ResourceFooter />
        
        {role === 'student' && <StudentActions />}
        {role === 'tutor' && <TutorActions />}
      </div>
    </div>
  );

  const ListView = () => (
    <div 
      className={`resource-card list ${isHovered ? 'hovered' : ''} ${isFavorite ? 'favorite' : ''} ${isDownloaded ? 'downloaded' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      <div className="resource-main">
        <div className="resource-icon">
          {getTypeIcon(resource.type)}
        </div>
        
        <div className="resource-info">
          <div className="resource-header">
            <h3 className="resource-title">{resource.title}</h3>
            <div className="resource-meta-compact">
              <span className={`difficulty-badge ${getDifficultyColor(resource.difficulty)}`}>
                {resource.difficulty}
              </span>
              <span className="duration-badge">
                {formatDuration(resource.duration)}
              </span>
              {role === 'tutor' && resource.metadata.tutor && (
                <span className="rating-badge">
                  ⭐ {resource.metadata.tutor.rating.toFixed(1)}
                </span>
              )}
            </div>
          </div>
          
          <p className="resource-description">{resource.description}</p>
          
          <div className="resource-details">
            <ResourceTags />
            <div className="resource-meta-details">
              <span className="language">{resource.language}</span>
              <span className="age-group">{resource.ageGroup}</span>
              <span className="created-date">
                {new Date(resource.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="resource-sidebar">
        {role === 'student' && showProgress && resource.metadata.student?.progress !== undefined && (
          <div className="progress-section">
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${resource.metadata.student.progress}%` }}
              />
            </div>
            <span className="progress-text">{resource.metadata.student.progress}%</span>
          </div>
        )}
        
        <div className="action-buttons">
          {role === 'student' ? (
            <button 
              className="action-btn primary"
              onClick={(e) => {
                e.stopPropagation();
                handleAction('start', { progress: resource.metadata.student?.progress || 0 });
              }}
            >
              {resource.metadata.student?.progress && resource.metadata.student.progress > 0 
                ? 'Continue' 
                : 'Start'
              }
            </button>
          ) : (
            <>
              <button 
                className={`action-btn ${isFavorite ? 'primary' : 'secondary'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAction('favorite');
                }}
                title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                {isFavorite ? '⭐' : '☆'}
              </button>
              <button 
                className="action-btn primary"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAction('download');
                }}
                title="Download resource"
              >
                📥
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {viewMode === 'grid' ? <GridView /> : <ListView />}
      
      {/* Preview Modal for Tutor */}
      {showPreview && role === 'tutor' && (
        <div className="modal-overlay" onClick={() => setShowPreview(false)}>
          <div className="resource-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{resource.title}</h2>
              <button className="close-btn" onClick={() => setShowPreview(false)}>
                ✕
              </button>
            </div>
            
            <div className="modal-content">
              <div className="resource-info">
                <div className="resource-type">
                  <span className="type-icon">{getTypeIcon(resource.type)}</span>
                  <span className="type-label">{resource.type.replace('_', ' ')}</span>
                </div>
                
                <ResourceMeta />
                <p className="resource-description">{resource.description}</p>
                <ResourceTags />
              </div>
              
              <div className="modal-actions">
                <button 
                  className={`favorite-btn ${isFavorite ? 'active' : ''}`}
                  onClick={() => {
                    handleAction('favorite');
                    setShowPreview(false);
                  }}
                >
                  {isFavorite ? '⭐ Remove from Favorites' : '☆ Add to Favorites'}
                </button>
                <button 
                  className="download-btn"
                  onClick={() => {
                    handleAction('download');
                    setShowPreview(false);
                  }}
                >
                  📥 Download Resource
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}; 