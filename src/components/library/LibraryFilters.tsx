import React, { useState, useCallback } from 'react';
import { LibraryFilters as LibraryFiltersType, Category } from '@/types/library';

interface LibraryFiltersProps {
  filters: LibraryFiltersType;
  categories: Category[];
  allTags: string[];
  onFiltersChange: (filters: Partial<LibraryFiltersType>) => void;
  onClearFilters: () => void;
  role: 'student' | 'tutor';
  isMobile?: boolean;
}

export const LibraryFilters: React.FC<LibraryFiltersProps> = ({
  filters,
  categories,
  allTags,
  onFiltersChange,
  onClearFilters,
  role,
  isMobile = false,
}) => {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const handleFilterChange = useCallback((key: keyof LibraryFiltersType, value: any) => {
    onFiltersChange({ [key]: value });
  }, [onFiltersChange]);

  const handleTagToggle = useCallback((tag: string) => {
    const newTags = filters.selectedTags.includes(tag)
      ? filters.selectedTags.filter(t => t !== tag)
      : [...filters.selectedTags, tag];
    handleFilterChange('selectedTags', newTags);
  }, [filters.selectedTags, handleFilterChange]);

  const handleSortOrderToggle = useCallback(() => {
    handleFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc');
  }, [filters.sortOrder, handleFilterChange]);

  const FilterSelect = ({ 
    value, 
    onChange, 
    options, 
    placeholder,
    className = ''
  }: {
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    placeholder: string;
    className?: string;
  }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`filter-select ${className}`}
    >
      <option value="all">{placeholder}</option>
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );

  const MobileFilterButton = () => (
    <button
      className="mobile-filter-btn"
      onClick={() => setShowMobileFilters(!showMobileFilters)}
    >
      🔍 Filters
      {Object.values(filters).some(v => 
        Array.isArray(v) ? v.length > 0 : v !== 'all' && v !== '' && v !== 'recent' && v !== 'desc'
      ) && <span className="filter-indicator">●</span>}
    </button>
  );

  const DesktopFilters = () => (
    <div className="desktop-filters">
      <div className="filter-row">
        <FilterSelect
          value={filters.category}
          onChange={(value) => handleFilterChange('category', value)}
          options={categories.map(cat => ({ value: cat.id, label: `${cat.name} (${cat.resourceCount})` }))}
          placeholder="All Categories"
        />
        
        <FilterSelect
          value={filters.difficulty}
          onChange={(value) => handleFilterChange('difficulty', value)}
          options={[
            { value: 'beginner', label: 'Beginner' },
            { value: 'intermediate', label: 'Intermediate' },
            { value: 'advanced', label: 'Advanced' },
          ]}
          placeholder="All Levels"
        />

        {role === 'tutor' && (
          <>
            <FilterSelect
              value={filters.language}
              onChange={(value) => handleFilterChange('language', value)}
              options={[
                { value: 'english', label: 'English' },
                { value: 'spanish', label: 'Spanish' },
                { value: 'french', label: 'French' },
                { value: 'german', label: 'German' },
                { value: 'chinese', label: 'Chinese' },
                { value: 'japanese', label: 'Japanese' },
              ]}
              placeholder="All Languages"
            />

            <FilterSelect
              value={filters.ageGroup}
              onChange={(value) => handleFilterChange('ageGroup', value)}
              options={[
                { value: 'kids', label: 'Kids' },
                { value: 'teens', label: 'Teens' },
                { value: 'adults', label: 'Adults' },
                { value: 'all', label: 'All Ages' },
              ]}
              placeholder="All Ages"
            />
          </>
        )}

        <FilterSelect
          value={filters.sortBy}
          onChange={(value) => handleFilterChange('sortBy', value)}
          options={[
            { value: 'recent', label: 'Recent' },
            { value: 'popular', label: 'Popular' },
            { value: 'rating', label: 'Rating' },
            { value: 'downloads', label: 'Downloads' },
            { value: 'duration', label: 'Duration' },
            ...(role === 'student' ? [{ value: 'progress', label: 'Progress' }] : []),
          ]}
          placeholder="Sort By"
        />

        <button
          className="sort-order-btn"
          onClick={handleSortOrderToggle}
          title={filters.sortOrder === 'desc' ? 'Sort Descending' : 'Sort Ascending'}
        >
          {filters.sortOrder === 'desc' ? '↓' : '↑'}
        </button>
      </div>

      <div className="search-row">
        <div className="search-box">
          <div className="search-icon">🔍</div>
          <input
            type="text"
            className="search-input"
            placeholder="Search resources..."
            value={filters.searchQuery}
            onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
          />
          {filters.searchQuery && (
            <button 
              className="clear-search"
              onClick={() => handleFilterChange('searchQuery', '')}
            >
              ✕
            </button>
          )}
        </div>

        <button
          className="advanced-filters-btn"
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
        >
          {showAdvancedFilters ? 'Hide' : 'Show'} Advanced Filters
        </button>
      </div>

      {showAdvancedFilters && (
        <div className="advanced-filters">
          <div className="tags-filter">
            <h4>Filter by Tags</h4>
            <div className="tags-grid">
              {allTags.map(tag => (
                <button
                  key={tag}
                  className={`tag-filter-btn ${filters.selectedTags.includes(tag) ? 'active' : ''}`}
                  onClick={() => handleTagToggle(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
            {filters.selectedTags.length > 0 && (
              <button 
                className="clear-tags-btn"
                onClick={() => handleFilterChange('selectedTags', [])}
              >
                Clear Tags
              </button>
            )}
          </div>
        </div>
      )}

      <div className="filter-actions">
        <button className="clear-filters-btn" onClick={onClearFilters}>
          Clear All Filters
        </button>
      </div>
    </div>
  );

  const MobileFilters = () => (
    <div className={`mobile-filters ${showMobileFilters ? 'show' : ''}`}>
      <div className="mobile-filter-header">
        <h3>Filters</h3>
        <button 
          className="close-filters-btn"
          onClick={() => setShowMobileFilters(false)}
        >
          ✕
        </button>
      </div>

      <div className="mobile-filter-content">
        <div className="mobile-filter-section">
          <label>Category</label>
          <FilterSelect
            value={filters.category}
            onChange={(value) => handleFilterChange('category', value)}
            options={categories.map(cat => ({ value: cat.id, label: cat.name }))}
            placeholder="All Categories"
            className="mobile-select"
          />
        </div>

        <div className="mobile-filter-section">
          <label>Difficulty</label>
          <FilterSelect
            value={filters.difficulty}
            onChange={(value) => handleFilterChange('difficulty', value)}
            options={[
              { value: 'beginner', label: 'Beginner' },
              { value: 'intermediate', label: 'Intermediate' },
              { value: 'advanced', label: 'Advanced' },
            ]}
            placeholder="All Levels"
            className="mobile-select"
          />
        </div>

        {role === 'tutor' && (
          <>
            <div className="mobile-filter-section">
              <label>Language</label>
              <FilterSelect
                value={filters.language}
                onChange={(value) => handleFilterChange('language', value)}
                options={[
                  { value: 'english', label: 'English' },
                  { value: 'spanish', label: 'Spanish' },
                  { value: 'french', label: 'French' },
                  { value: 'german', label: 'German' },
                  { value: 'chinese', label: 'Chinese' },
                  { value: 'japanese', label: 'Japanese' },
                ]}
                placeholder="All Languages"
                className="mobile-select"
              />
            </div>

            <div className="mobile-filter-section">
              <label>Age Group</label>
              <FilterSelect
                value={filters.ageGroup}
                onChange={(value) => handleFilterChange('ageGroup', value)}
                options={[
                  { value: 'kids', label: 'Kids' },
                  { value: 'teens', label: 'Teens' },
                  { value: 'adults', label: 'Adults' },
                  { value: 'all', label: 'All Ages' },
                ]}
                placeholder="All Ages"
                className="mobile-select"
              />
            </div>
          </>
        )}

        <div className="mobile-filter-section">
          <label>Sort By</label>
          <FilterSelect
            value={filters.sortBy}
            onChange={(value) => handleFilterChange('sortBy', value)}
            options={[
              { value: 'recent', label: 'Recent' },
              { value: 'popular', label: 'Popular' },
              { value: 'rating', label: 'Rating' },
              { value: 'downloads', label: 'Downloads' },
              { value: 'duration', label: 'Duration' },
              ...(role === 'student' ? [{ value: 'progress', label: 'Progress' }] : []),
            ]}
            placeholder="Sort By"
            className="mobile-select"
          />
        </div>

        <div className="mobile-filter-section">
          <label>Search</label>
          <input
            type="text"
            className="mobile-search-input"
            placeholder="Search resources..."
            value={filters.searchQuery}
            onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
          />
        </div>

        <div className="mobile-filter-section">
          <label>Tags</label>
          <div className="mobile-tags-grid">
            {allTags.slice(0, 6).map(tag => (
              <button
                key={tag}
                className={`mobile-tag-btn ${filters.selectedTags.includes(tag) ? 'active' : ''}`}
                onClick={() => handleTagToggle(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="mobile-filter-actions">
          <button className="mobile-clear-btn" onClick={onClearFilters}>
            Clear All
          </button>
          <button 
            className="mobile-apply-btn"
            onClick={() => setShowMobileFilters(false)}
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="library-filters">
      {isMobile ? (
        <>
          <MobileFilterButton />
          <MobileFilters />
        </>
      ) : (
        <DesktopFilters />
      )}
    </div>
  );
}; 