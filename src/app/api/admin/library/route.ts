import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for resource upload
const ResourceUploadSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  type: z.enum(['LESSON_PLAN', 'WORKSHEET', 'VIDEO', 'PRESENTATION', 'QUIZ', 'GAME', 'TEMPLATE', 'GUIDE', 'AUDIO', 'INTERACTIVE']),
  category: z.string().min(1).max(100),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  duration: z.number().min(1).max(480), // 1-480 minutes
  language: z.string().min(1).max(50),
  ageGroup: z.enum(['KIDS', 'TEENS', 'ADULTS', 'ALL']),
  tags: z.array(z.string()).max(10),
  thumbnail: z.string().url().optional(),
  url: z.string().url().optional(),
  isActive: z.boolean().default(true)
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is Admin or Super Admin
    if ((session.user as any).role !== 'ADMIN' && (session.user as any).role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Access denied. Admin and Super Admin only.' }, { status: 403 });
    }

    const body = await req.json();
    
    // Validate the request body
    const validatedData = ResourceUploadSchema.parse(body);

    // Create the resource
    const resource = await prisma.teachingResource.create({
      data: {
        ...validatedData,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Resource uploaded successfully',
      resource: {
        id: resource.id,
        title: resource.title,
        type: resource.type,
        category: resource.category,
        difficulty: resource.difficulty,
        language: resource.language,
        ageGroup: resource.ageGroup,
        isActive: resource.isActive,
        createdAt: resource.createdAt
      }
    });

  } catch (error) {
    console.error('Library upload error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Failed to upload resource' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is Admin or Super Admin
    if ((session.user as any).role !== 'ADMIN' && (session.user as any).role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Access denied. Admin and Super Admin only.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';
    const category = searchParams.get('category') || '';
    const difficulty = searchParams.get('difficulty') || '';

    // Build where clause
    let whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { hasSome: [search] } }
      ];
    }

    if (type) {
      whereClause.type = type.toUpperCase();
    }

    if (category) {
      whereClause.category = category;
    }

    if (difficulty) {
      whereClause.difficulty = difficulty.toUpperCase();
    }

    // Get resources with pagination
    const [resources, total] = await Promise.all([
      prisma.teachingResource.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
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
        }
      }),
      prisma.teachingResource.count({ where: whereClause })
    ]);

    // Calculate stats for each resource
    const resourcesWithStats = resources.map(resource => ({
      ...resource,
      downloadCount: resource.downloads.length,
      favoriteCount: resource.favorites.length,
      averageRating: resource.ratings.length > 0 
        ? resource.ratings.reduce((sum, r) => sum + r.rating, 0) / resource.ratings.length 
        : 0,
      ratingCount: resource.ratings.length
    }));

    return NextResponse.json({
      success: true,
      data: {
        resources: resourcesWithStats,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Library fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resources' },
      { status: 500 }
    );
  }
} 