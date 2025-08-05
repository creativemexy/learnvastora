// Unified Library Types
export type ResourceType = 
  | 'video' | 'document' | 'quiz' | 'audio' | 'interactive' 
  | 'lesson_plan' | 'worksheet' | 'presentation' | 'game' | 'template' | 'guide';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type AgeGroup = 'kids' | 'teens' | 'adults' | 'all';
export type Language = 'english' | 'spanish' | 'french' | 'german' | 'chinese' | 'japanese';

export interface BaseResource {
  id: string;
  title: string;
  description: string;
  type: ResourceType;
  category: string;
  difficulty: Difficulty;
  duration: number; // in minutes
  thumbnail?: string;
  url?: string;
  tags: string[];
  createdAt: string;
  language: Language;
  ageGroup: AgeGroup;
}

export interface StudentMetadata {
  isCompleted?: boolean;
  progress?: number; // 0-100
  lastAccessed?: string;
  timeSpent?: number; // in minutes
  notes?: string;
}

export interface TutorMetadata {
  isDownloaded?: boolean;
  isFavorite?: boolean;
  downloads: number;
  rating: number;
  reviewCount: number;
  lastDownloaded?: string;
}

export interface UnifiedResource extends BaseResource {
  metadata: {
    student?: StudentMetadata;
    tutor?: TutorMetadata;
  };
}

export interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  resourceCount: number;
}

export interface LibraryStats {
  totalResources: number;
  completedResources?: number;
  downloadedResources?: number;
  favoriteResources?: number;
  averageProgress?: number;
  totalDuration: number;
  totalDownloads?: number;
  averageRating?: number;
  recentAdditions: number;
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface LibraryFilters {
  category: string;
  difficulty: string;
  language: string;
  ageGroup: string;
  searchQuery: string;
  selectedTags: string[];
  sortBy: 'recent' | 'popular' | 'rating' | 'downloads' | 'duration' | 'progress';
  sortOrder: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
  rating?: number;
}

export interface LibraryResponse {
  resources: UnifiedResource[];
  categories: Category[];
  stats: LibraryStats;
  pagination: PaginationInfo;
  filters: LibraryFilters;
} 