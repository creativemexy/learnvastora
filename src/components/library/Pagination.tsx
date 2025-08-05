import React, { useMemo } from 'react';
import { PaginationInfo } from '@/types/library';

interface PaginationProps {
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  showPageSizeSelector?: boolean;
  pageSizeOptions?: number[];
  isMobile?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  pagination,
  onPageChange,
  onPageSizeChange,
  showPageSizeSelector = false,
  pageSizeOptions = [10, 20, 50, 100],
  isMobile = false,
}) => {
  const { page, pageSize, total, totalPages, hasNext, hasPrev } = pagination;

  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = isMobile ? 3 : 5;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (page > 3) {
        pages.push('...');
      }
      
      // Show pages around current page
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      
      for (let i = start; i <= end; i++) {
        if (i !== 1 && i !== totalPages) {
          pages.push(i);
        }
      }
      
      if (page < totalPages - 2) {
        pages.push('...');
      }
      
      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }
    
    return pages;
  }, [page, totalPages, isMobile]);

  const handlePageClick = (pageNum: number) => {
    if (pageNum !== page && pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum);
    }
  };

  const handlePageSizeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newPageSize = parseInt(event.target.value);
    if (onPageSizeChange && newPageSize !== pageSize) {
      onPageSizeChange(newPageSize);
    }
  };

  if (totalPages <= 1) {
    return null;
  }

  const MobilePagination = () => (
    <div className="mobile-pagination">
      <div className="pagination-info">
        <span className="pagination-text">
          Page {page} of {totalPages}
        </span>
        <span className="pagination-total">
          {total} items
        </span>
      </div>
      
      <div className="pagination-controls">
        <button
          className="pagination-btn"
          onClick={() => handlePageClick(page - 1)}
          disabled={!hasPrev}
          aria-label="Previous page"
        >
          ←
        </button>
        
        <div className="page-indicator">
          <span className="current-page">{page}</span>
          <span className="total-pages">/ {totalPages}</span>
        </div>
        
        <button
          className="pagination-btn"
          onClick={() => handlePageClick(page + 1)}
          disabled={!hasNext}
          aria-label="Next page"
        >
          →
        </button>
      </div>
      
      {showPageSizeSelector && onPageSizeChange && (
        <div className="page-size-selector">
          <label htmlFor="page-size">Show:</label>
          <select
            id="page-size"
            value={pageSize}
            onChange={handlePageSizeChange}
            className="page-size-select"
          >
            {pageSizeOptions.map(size => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );

  const DesktopPagination = () => (
    <div className="desktop-pagination">
      <div className="pagination-info">
        <span className="pagination-text">
          Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total} items
        </span>
      </div>
      
      <div className="pagination-controls">
        <button
          className="pagination-btn"
          onClick={() => handlePageClick(1)}
          disabled={!hasPrev}
          aria-label="First page"
        >
          «
        </button>
        
        <button
          className="pagination-btn"
          onClick={() => handlePageClick(page - 1)}
          disabled={!hasPrev}
          aria-label="Previous page"
        >
          ‹
        </button>
        
        <div className="page-numbers">
          {pageNumbers.map((pageNum, index) => (
            <React.Fragment key={index}>
              {pageNum === '...' ? (
                <span className="pagination-ellipsis">...</span>
              ) : (
                <button
                  className={`pagination-btn page-number ${pageNum === page ? 'active' : ''}`}
                  onClick={() => handlePageClick(pageNum as number)}
                  aria-label={`Page ${pageNum}`}
                  aria-current={pageNum === page ? 'page' : undefined}
                >
                  {pageNum}
                </button>
              )}
            </React.Fragment>
          ))}
        </div>
        
        <button
          className="pagination-btn"
          onClick={() => handlePageClick(page + 1)}
          disabled={!hasNext}
          aria-label="Next page"
        >
          ›
        </button>
        
        <button
          className="pagination-btn"
          onClick={() => handlePageClick(totalPages)}
          disabled={!hasNext}
          aria-label="Last page"
        >
          »
        </button>
      </div>
      
      {showPageSizeSelector && onPageSizeChange && (
        <div className="page-size-selector">
          <label htmlFor="page-size">Items per page:</label>
          <select
            id="page-size"
            value={pageSize}
            onChange={handlePageSizeChange}
            className="page-size-select"
          >
            {pageSizeOptions.map(size => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );

  return (
    <nav className="pagination-container" role="navigation" aria-label="Pagination">
      {isMobile ? <MobilePagination /> : <DesktopPagination />}
    </nav>
  );
}; 