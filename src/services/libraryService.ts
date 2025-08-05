import { UnifiedResource, Category, LibraryStats, PaginationInfo, LibraryFilters, LibraryResponse } from '@/types/library';

class LibraryService {
  constructor() {
    console.log('LibraryService constructor called');
  }

  async makeRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    console.log('makeRequest called with:', endpoint, params);
    
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = `${endpoint}${queryString ? `?${queryString}` : ''}`;
      
      console.log('Fetching from URL:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error ${response.status}:`, errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText || errorText}`);
      }

      const data = await response.json();
      console.log('Response data:', data);
      
      return data;
    } catch (error) {
      console.error('LibraryService makeRequest error:', error);
      throw error;
    }
  }

  async getStudentLibrary(filters: Partial<LibraryFilters> = {}, page = 1, pageSize = 20): Promise<LibraryResponse> {
    console.log('getStudentLibrary called');
    return this.makeRequest<LibraryResponse>('/api/library', {
      ...filters,
      page: page.toString(),
      pageSize: pageSize.toString(),
    });
  }

  async getTutorLibrary(filters: Partial<LibraryFilters> = {}, page = 1, pageSize = 20): Promise<LibraryResponse> {
    console.log('getTutorLibrary called');
    return this.makeRequest<LibraryResponse>('/api/tutor/library', {
      ...filters,
      page: page.toString(),
      pageSize: pageSize.toString(),
    });
  }

  async downloadResource(resourceId: string): Promise<void> {
    console.log('downloadResource called');
    const response = await fetch(`/api/tutor/library/${resourceId}/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to download resource: ${response.statusText}`);
    }
  }

  async toggleFavorite(resourceId: string): Promise<void> {
    console.log('toggleFavorite called');
    const response = await fetch(`/api/tutor/library/${resourceId}/favorite`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to toggle favorite: ${response.statusText}`);
    }
  }

  async rateResource(resourceId: string, rating: number): Promise<void> {
    console.log('rateResource called');
    const response = await fetch(`/api/tutor/library/${resourceId}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ rating }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to rate resource: ${response.statusText}`);
    }
  }

  async updateStudentProgress(resourceId: string, progress: number): Promise<void> {
    console.log('updateStudentProgress called');
    const response = await fetch(`/api/library/${resourceId}/progress`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ progress }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update progress: ${response.statusText}`);
    }
  }

  async markResourceCompleted(resourceId: string): Promise<void> {
    console.log('markResourceCompleted called');
    const response = await fetch(`/api/library/${resourceId}/complete`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to mark resource as completed: ${response.statusText}`);
    }
  }

  clearCache(): void {
    console.log('clearCache called');
  }

  validateFilters(filters: Partial<LibraryFilters>): boolean {
    console.log('validateFilters called');
    return true;
  }

  sanitizeSearchQuery(query: string): string {
    console.log('sanitizeSearchQuery called');
    return query.trim().slice(0, 100);
  }
}

// Create and export a singleton instance
const libraryService = new LibraryService();
console.log('LibraryService instance created:', libraryService);

// Export as both default and named export to ensure it's available
export { libraryService };
export default libraryService; 