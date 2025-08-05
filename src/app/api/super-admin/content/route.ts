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
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';
    const difficulty = searchParams.get('difficulty') || '';
    const ageGroup = searchParams.get('ageGroup') || '';
    const language = searchParams.get('language') || '';
    const isActive = searchParams.get('isActive') || '';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { hasSome: [search] } }
      ];
    }
    
    if (type) where.type = type;
    if (difficulty) where.difficulty = difficulty;
    if (ageGroup) where.ageGroup = ageGroup;
    if (language) where.language = language;
    if (isActive !== '') where.isActive = isActive === 'true';

    // Get resources with pagination
    const [resources, totalResources] = await Promise.all([
      prisma.teachingResource.findMany({
        where,
        include: {
          downloads: {
            select: { tutorId: true }
          },
          favorites: {
            select: { tutorId: true }
          },
          ratings: {
            select: { rating: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.teachingResource.count({ where })
    ]);

    // Transform data for frontend
    const transformedResources = resources.map(resource => {
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
        tags: resource.tags || [],
        isActive: resource.isActive,
        createdAt: resource.createdAt,
        updatedAt: resource.updatedAt,
        stats: {
          downloads: resource.downloads?.length || 0,
          favorites: resource.favorites?.length || 0,
          averageRating: Math.round(averageRating * 10) / 10,
          totalRatings: resource.ratings?.length || 0
        }
      };
    });

    // Get statistics
    const [
      totalResourcesCount,
      activeResources,
      inactiveResources,
      typeBreakdown,
      difficultyBreakdown,
      ageGroupBreakdown,
      languageBreakdown,
      recentUploads,
      topResources
    ] = await Promise.all([
      prisma.teachingResource.count(),
      prisma.teachingResource.count({ where: { isActive: true } }),
      prisma.teachingResource.count({ where: { isActive: false } }),
      prisma.teachingResource.groupBy({
        by: ['type'],
        _count: { id: true }
      }),
      prisma.teachingResource.groupBy({
        by: ['difficulty'],
        _count: { id: true }
      }),
      prisma.teachingResource.groupBy({
        by: ['ageGroup'],
        _count: { id: true }
      }),
      prisma.teachingResource.groupBy({
        by: ['language'],
        _count: { id: true }
      }),
      prisma.teachingResource.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.teachingResource.findMany({
        take: 5,
        orderBy: { favorites: { _count: 'desc' } },
        include: {
          _count: {
            select: {
              favorites: true,
              ratings: true
            }
          }
        }
      })
    ]);

    const totalPages = Math.ceil(totalResources / limit);

    return NextResponse.json({
      success: true,
      data: {
        resources: transformedResources,
        pagination: {
          page,
          limit,
          total: totalResources,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        statistics: {
          total: totalResourcesCount,
          active: activeResources,
          inactive: inactiveResources,
          typeBreakdown,
          difficultyBreakdown,
          ageGroupBreakdown,
          languageBreakdown
        },
        recentUploads,
        topResources
      }
    });

  } catch (error) {
    console.error('Content management API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch content data' },
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
      url,
      isActive = true
    } = body;

    // Validate required fields
    if (!title || !type || !category || !difficulty || !language) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create new resource
    const newResource = await prisma.teachingResource.create({
      data: {
        title,
        description: description || '',
        type,
        category,
        difficulty,
        duration: duration || 60,
        language,
        ageGroup: ageGroup || 'ADULTS',
        tags: tags || [],
        thumbnail: thumbnail || '',
        url: url || '',
        isActive,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      data: newResource,
      message: 'Resource created successfully'
    });

  } catch (error) {
    console.error('Content creation API error:', error);
    return NextResponse.json(
      { error: 'Failed to create resource' },
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
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Resource ID is required' },
        { status: 400 }
      );
    }

    // Update resource
    const updatedResource = await prisma.teachingResource.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      data: updatedResource,
      message: 'Resource updated successfully'
    });

  } catch (error) {
    console.error('Content update API error:', error);
    return NextResponse.json(
      { error: 'Failed to update resource' },
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
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Resource ID is required' },
        { status: 400 }
      );
    }

    // Delete resource and related data
    await prisma.teachingResource.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Resource deleted successfully'
    });

  } catch (error) {
    console.error('Content deletion API error:', error);
    return NextResponse.json(
      { error: 'Failed to delete resource' },
      { status: 500 }
    );
  }
} 