import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

// Validation schemas
const FilterSchema = z.object({
  category: z.string().optional(),
  difficulty: z.string().optional(),
  language: z.string().optional(),
  ageGroup: z.string().optional(),
  searchQuery: z.string().optional(),
  selectedTags: z.array(z.string()).optional(),
  sortBy: z.enum(['recent', 'popular', 'rating', 'downloads', 'duration', 'progress']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().min(1).max(1000).optional(),
  pageSize: z.coerce.number().min(1).max(100).optional(),
});

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate user role
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { id: true, role: true }
    });

    if (!user || user.role !== 'STUDENT') {
      return NextResponse.json({ error: "Access denied. Students only." }, { status: 403 });
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
      // Show common learning resource types for students including docs and images
      type: { in: ['VIDEO', 'AUDIO', 'INTERACTIVE', 'QUIZ', 'LESSON_PLAN', 'WORKSHEET', 'PRESENTATION', 'GUIDE'] }
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
      case 'duration':
        orderBy.duration = sortOrder;
        break;
      case 'progress':
        // This will be handled in the application layer
        orderBy.createdAt = 'desc';
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

    // Get categories with resource counts
    const categoryStats = await prisma.teachingResource.groupBy({
      by: ['category'],
      where: { 
        isActive: true,
        type: { in: ['VIDEO', 'AUDIO', 'INTERACTIVE', 'QUIZ'] }
      },
      _count: { id: true }
    });

    const categories = categoryStats.map(stat => ({
      id: stat.category,
      name: stat.category.charAt(0).toUpperCase() + stat.category.slice(1),
      description: `Learn ${stat.category} with interactive resources`,
      icon: 'bi-book',
      color: getCategoryColor(stat.category),
      resourceCount: stat._count.id
    }));

    // Get resources with user progress and pagination
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
          where: { tutorId: user.id },
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
      const isCompleted = resource.downloads.length > 0;
      const progress = isCompleted ? 100 : 0;
      const userRating = resource.ratings.length > 0 ? resource.ratings[0].rating : 0;
      const totalDownloads = resource._count.downloads;
      const totalRatings = resource._count.ratings;

      return {
        id: resource.id,
        title: resource.title,
        description: resource.description,
        type: resource.type.toLowerCase() as any,
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
            isCompleted,
            progress,
            lastAccessed: resource.downloads[0]?.downloadedAt.toISOString(),
            timeSpent: 0, // This would be calculated from actual usage data
            notes: ''
          },
          tutor: {
            isDownloaded: false,
            isFavorite: resource.favorites.length > 0,
            downloads: totalDownloads,
            rating: totalRatings > 0 ? 4.5 : 0, // Placeholder average rating
            reviewCount: totalRatings,
            lastDownloaded: undefined
          }
        }
      };
    });

    // Calculate library statistics
    const allResources = await prisma.teachingResource.findMany({
      where: { 
        isActive: true,
        type: { in: ['VIDEO', 'AUDIO', 'INTERACTIVE', 'QUIZ'] }
      },
      include: {
        downloads: {
          where: { tutorId: user.id }
        }
      }
    });

    const stats = {
      totalResources: allResources.length,
      completedResources: allResources.filter(r => r.downloads.length > 0).length,
      averageProgress: allResources.length > 0 
        ? Math.round(allResources.reduce((acc, r) => acc + (r.downloads.length > 0 ? 100 : 0), 0) / allResources.length)
        : 0,
      totalDuration: allResources.reduce((acc, r) => acc + r.duration, 0),
      favoriteResources: allResources.filter(r => (r as any).favorites?.length > 0).length,
      totalDownloads: allResources.reduce((acc, r) => acc + r.downloads.length, 0),
      averageRating: 0, // Would be calculated from actual ratings
      recentAdditions: allResources.filter(r => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return r.createdAt > weekAgo;
      }).length
    };

    // Sort by progress if requested (application-level sorting)
    if (sortBy === 'progress') {
      transformedResources.sort((a, b) => {
        const progressA = a.metadata.student?.progress || 0;
        const progressB = b.metadata.student?.progress || 0;
        return sortOrder === 'desc' ? progressB - progressA : progressA - progressB;
      });
    }

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
    console.error("Error in library API:", error);
    
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

// Helper function to get category colors
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