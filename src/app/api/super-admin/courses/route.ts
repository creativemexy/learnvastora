import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if ((session.user as any).role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const difficulty = searchParams.get('difficulty') || '';
    const type = searchParams.get('type') || '';
    const language = searchParams.get('language') || '';

    // Build where clause
    let whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } }
      ];
    }

    if (category) {
      whereClause.category = category;
    }

    if (difficulty) {
      whereClause.difficulty = difficulty.toUpperCase();
    }

    if (type) {
      whereClause.type = type.toUpperCase();
    }

    if (language) {
      whereClause.language = language;
    }

    // Get resources with related data
    const [resources, total] = await Promise.all([
      prisma.teachingResource.findMany({
        where: whereClause,
        include: {
          downloads: {
            select: { id: true }
          },
          favorites: {
            select: { id: true }
          },
          ratings: {
            select: { rating: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.teachingResource.count({ where: whereClause })
    ]);

    // Transform data for frontend
    const transformedResources = resources.map(resource => {
      const totalDownloads = resource.downloads?.length || 0;
      const totalFavorites = resource.favorites?.length || 0;
      const averageRating = resource.ratings && resource.ratings.length > 0 
        ? resource.ratings.reduce((sum, rating) => sum + rating.rating, 0) / resource.ratings.length
        : 0;

      return {
        id: resource.id,
        title: resource.title,
        description: resource.description,
        type: resource.type,
        category: resource.category,
        difficulty: resource.difficulty,
        duration: resource.duration,
        thumbnail: resource.thumbnail,
        url: resource.url,
        language: resource.language,
        ageGroup: resource.ageGroup,
        tags: resource.tags,
        isActive: resource.isActive,
        createdAt: resource.createdAt,
        updatedAt: resource.updatedAt,
        stats: {
          totalDownloads,
          totalFavorites,
          averageRating: Math.round(averageRating * 10) / 10,
          totalRatings: resource.ratings?.length || 0
        }
      };
    });

    // Get category statistics
    const categoryStats = await prisma.teachingResource.groupBy({
      by: ['category'],
      _count: { id: true }
    });

    const categories = categoryStats.map(stat => ({
      id: stat.category,
      name: stat.category.charAt(0).toUpperCase() + stat.category.slice(1),
      resourceCount: stat._count.id
    }));

    return NextResponse.json({
      success: true,
      data: {
        resources: transformedResources,
        categories,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Course management API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch course data' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if ((session.user as any).role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { 
      title, 
      description, 
      type, 
      category, 
      difficulty, 
      duration, 
      language, 
      ageGroup, 
      tags, 
      thumbnail, 
      url 
    } = body;

    if (!title || !description || !type || !category || !difficulty || !language || !ageGroup) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create new resource
    const newResource = await prisma.teachingResource.create({
      data: {
        title,
        description,
        type: type.toUpperCase(),
        category,
        difficulty: difficulty.toUpperCase(),
        duration: duration || 0,
        language,
        ageGroup: ageGroup.toUpperCase(),
        tags: tags || [],
        thumbnail,
        url,
        isActive: true
      }
    });

    return NextResponse.json({
      success: true,
      resource: newResource
    });

  } catch (error) {
    console.error('Course creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create course' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if ((session.user as any).role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { resourceId, action, updates } = body;

    if (!resourceId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let result: any = {};

    switch (action) {
      case 'activate':
        result = await prisma.teachingResource.update({
          where: { id: resourceId },
          data: { isActive: true }
        });
        break;
      
      case 'deactivate':
        result = await prisma.teachingResource.update({
          where: { id: resourceId },
          data: { isActive: false }
        });
        break;
      
      case 'update':
        if (!updates) {
          return NextResponse.json({ error: 'Missing updates' }, { status: 400 });
        }
        result = await prisma.teachingResource.update({
          where: { id: resourceId },
          data: updates
        });
        break;
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      action,
      result
    });

  } catch (error) {
    console.error('Course update error:', error);
    return NextResponse.json(
      { error: 'Failed to update course' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if ((session.user as any).role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const resourceId = searchParams.get('resourceId');

    if (!resourceId) {
      return NextResponse.json({ error: 'Missing resource ID' }, { status: 400 });
    }

    // Delete the resource (this will cascade to related records)
    await prisma.teachingResource.delete({
      where: { id: resourceId }
    });

    return NextResponse.json({
      success: true,
      message: 'Resource deleted successfully'
    });

  } catch (error) {
    console.error('Course deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete course' },
      { status: 500 }
    );
  }
} 