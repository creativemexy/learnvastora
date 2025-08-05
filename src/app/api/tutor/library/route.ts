import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schemas
const FilterSchema = z.object({
  category: z.string().optional(),
  difficulty: z.string().optional(),
  language: z.string().optional(),
  ageGroup: z.string().optional(),
  searchQuery: z.string().optional(),
  selectedTags: z.array(z.string()).optional(),
  sortBy: z.enum(['recent', 'popular', 'rating', 'downloads']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().min(1).max(1000).optional(),
  pageSize: z.coerce.number().min(1).max(100).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate user role
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true }
    });

    if (!user || user.role !== 'TUTOR') {
      return NextResponse.json({ error: 'Access denied. Tutors only.' }, { status: 403 });
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(req.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const validatedParams = FilterSchema.parse(queryParams);
    const {
      category = 'all',
      difficulty = 'all',
      language = 'all',
      ageGroup = 'all',
      searchQuery = '',
      selectedTags = [],
      sortBy = 'recent',
      sortOrder = 'desc',
      page = 1,
      pageSize = 20,
    } = validatedParams;

    // Build where clause with proper sanitization
    let whereClause: any = {
      isActive: true,
      type: { in: ['LESSON_PLAN', 'WORKSHEET', 'VIDEO', 'PRESENTATION', 'QUIZ', 'GAME', 'TEMPLATE', 'GUIDE'] }
    };

    if (category && category !== 'all') {
      whereClause.category = category;
    }

    if (difficulty && difficulty !== 'all') {
      whereClause.difficulty = difficulty.toUpperCase();
    }

    if (language && language !== 'all') {
      whereClause.language = language;
    }

    if (ageGroup && ageGroup !== 'all') {
      whereClause.ageGroup = ageGroup;
    }

    if (searchQuery) {
      const sanitizedQuery = searchQuery.trim().slice(0, 100);
      whereClause.OR = [
        { title: { contains: sanitizedQuery, mode: 'insensitive' } },
        { description: { contains: sanitizedQuery, mode: 'insensitive' } },
        { tags: { hasSome: [sanitizedQuery] } }
      ];
    }

    if (selectedTags.length > 0) {
      whereClause.tags = { hasSome: selectedTags };
    }

    // Build order by clause
    let orderBy: any = {};
    switch (sortBy) {
      case 'recent':
        orderBy.createdAt = sortOrder;
        break;
      case 'popular':
        orderBy.downloads = { _count: sortOrder };
        break;
      case 'rating':
        orderBy.ratings = { _avg: { rating: sortOrder } };
        break;
      case 'downloads':
        orderBy.downloads = { _count: sortOrder };
        break;
      default:
        orderBy.createdAt = 'desc';
    }

    // Get total count for pagination
    const totalCount = await prisma.teachingResource.count({ where: whereClause });

    // Calculate pagination
    const totalPages = Math.ceil(totalCount / pageSize);
    const skip = (page - 1) * pageSize;
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    // Fetch categories with resource counts
    const categoryStats = await prisma.teachingResource.groupBy({
      by: ['category'],
      where: { 
        isActive: true,
        type: { in: ['LESSON_PLAN', 'WORKSHEET', 'VIDEO', 'PRESENTATION', 'QUIZ', 'GAME', 'TEMPLATE', 'GUIDE'] }
      },
      _count: { id: true }
    });

    const categories = categoryStats.map(stat => ({
      id: stat.category,
      name: stat.category.charAt(0).toUpperCase() + stat.category.slice(1),
      description: `Teaching resources for ${stat.category}`,
      icon: getCategoryIcon(stat.category),
      color: getCategoryColor(stat.category),
      resourceCount: stat._count.id
    }));

    // Fetch resources with pagination and related data
    const resources = await prisma.teachingResource.findMany({
      where: whereClause,
      include: {
        downloads: {
          where: { tutorId: user.id },
          select: { id: true, downloadedAt: true }
        },
        favorites: {
          where: { tutorId: user.id },
          select: { id: true }
        },
        ratings: {
          select: { rating: true }
        },
        _count: {
          select: {
            downloads: true,
            ratings: true
          }
        }
      },
      orderBy,
      skip,
      take: pageSize
    });

    // Transform resources for frontend with unified structure
    const transformedResources = resources.map(resource => {
      const isDownloaded = resource.downloads.length > 0;
      const isFavorite = resource.favorites.length > 0;
      const totalDownloads = resource._count.downloads;
      const totalRatings = resource._count.ratings;
      const averageRating = totalRatings > 0 
        ? resource.ratings.reduce((acc, r) => acc + r.rating, 0) / totalRatings 
        : 0;

      return {
        id: resource.id,
        title: resource.title,
        description: resource.description,
        type: resource.type as any,
        category: resource.category,
        difficulty: resource.difficulty.toLowerCase() as any,
        duration: resource.duration,
        thumbnail: resource.thumbnail,
        url: resource.url,
        tags: resource.tags,
        createdAt: resource.createdAt.toISOString(),
        language: resource.language as any,
        ageGroup: resource.ageGroup as any,
        metadata: {
          student: {
            isCompleted: false,
            progress: 0,
            lastAccessed: undefined,
            timeSpent: 0,
            notes: ''
          },
          tutor: {
            isDownloaded,
            isFavorite,
            downloads: totalDownloads,
            rating: averageRating,
            reviewCount: totalRatings,
            lastDownloaded: resource.downloads[0]?.downloadedAt.toISOString()
          }
        }
      };
    });

    // Calculate library statistics
    const allResources = await prisma.teachingResource.findMany({
      where: { 
        isActive: true,
        type: { in: ['LESSON_PLAN', 'WORKSHEET', 'VIDEO', 'PRESENTATION', 'QUIZ', 'GAME', 'TEMPLATE', 'GUIDE'] }
      },
      include: {
        downloads: { where: { tutorId: user.id } },
        favorites: { where: { tutorId: user.id } },
        ratings: true
      }
    });

    const stats = {
      totalResources: allResources.length,
      downloadedResources: allResources.filter(r => r.downloads.length > 0).length,
      favoriteResources: allResources.filter(r => r.favorites.length > 0).length,
      totalDownloads: allResources.reduce((acc, r) => acc + r.downloads.length, 0),
      averageRating: allResources.length > 0 
        ? Math.round(allResources.reduce((acc, r) => {
            const avgRating = r.ratings.length > 0 
              ? r.ratings.reduce((sum, rating) => sum + rating.rating, 0) / r.ratings.length 
              : 0;
            return acc + avgRating;
          }, 0) / allResources.length * 10) / 10
        : 0,
      totalDuration: allResources.reduce((acc, r) => acc + r.duration, 0),
      recentAdditions: allResources.filter(r => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return r.createdAt > weekAgo;
      }).length
    };

    return NextResponse.json({
      success: true,
      resources: transformedResources,
      categories,
      stats,
      pagination: {
        page,
        pageSize,
        total: totalCount,
        totalPages,
        hasNext,
        hasPrev
      },
      filters: {
        category,
        difficulty,
        language,
        ageGroup,
        searchQuery,
        selectedTags,
        sortBy,
        sortOrder
      }
    });

  } catch (error) {
    console.error("Error in tutor library API:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: "Invalid request parameters", 
        details: error.errors 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}

// Helper functions
function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    'mathematics': '🧮',
    'science': '🧪',
    'language': '📚',
    'history': '🏛️',
    'art': '🎨',
    'music': '🎵',
    'technology': '💻',
    'literature': '📖',
    'geography': '🌍',
    'philosophy': '🤔',
  };
  return icons[category.toLowerCase()] || '📁';
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    'mathematics': '#FF6B6B',
    'science': '#4ECDC4',
    'language': '#45B7D1',
    'history': '#96CEB4',
    'art': '#FFEAA7',
    'music': '#DDA0DD',
    'technology': '#98D8C8',
    'literature': '#F7DC6F',
    'geography': '#BB8FCE',
    'philosophy': '#85C1E9',
  };
  return colors[category.toLowerCase()] || '#6C757D';
} 