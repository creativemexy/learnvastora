import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import path from 'path';
import { mkdir, writeFile } from 'fs/promises';

// Validation schema for resource upload
const isValidUrlOrPath = (val?: string) => {
  if (!val) return true;
  if (val.startsWith('/')) return true; // allow app-relative paths like /uploads/...
  try {
    const u = new URL(val);
    return !!u.protocol && !!u.host;
  } catch {
    return false;
  }
};

const ResourceUploadSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  type: z.enum(['LESSON_PLAN', 'WORKSHEET', 'VIDEO', 'PRESENTATION', 'QUIZ', 'GAME', 'TEMPLATE', 'GUIDE', 'AUDIO', 'INTERACTIVE']),
  category: z.string().min(1).max(100),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  duration: z.number().min(1).max(480),
  language: z.string().min(1).max(50),
  ageGroup: z.enum(['KIDS', 'TEENS', 'ADULTS', 'ALL']),
  tags: z.array(z.string()).max(10).optional().default([]),
  thumbnail: z.string().optional().refine((v) => isValidUrlOrPath(v), { message: 'Invalid url' }),
  url: z.string().optional().refine((v) => isValidUrlOrPath(v), { message: 'Invalid url' }),
  isActive: z.boolean().default(true),
  subject: z.string().min(1).max(100).optional(),
  module: z.string().min(1).max(100).optional(),
});

const allowedMimeTypes = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
];

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

    let body: any;
    let fileUrl: string | undefined;

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('file') as File | null;
      if (file) {
        if (!allowedMimeTypes.includes(file.type)) {
          return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
        }
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'library');
        await mkdir(uploadDir, { recursive: true });
        const ext = path.extname(file.name) || '.bin';
        const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
        const filepathFs = path.join(uploadDir, filename);
        const arrayBuffer = await file.arrayBuffer();
        await writeFile(filepathFs, Buffer.from(arrayBuffer));
        fileUrl = `/uploads/library/${filename}`;
      }
      body = Object.fromEntries(form.entries());
      // normalize scalar types
      if (typeof body.duration === 'string') body.duration = parseInt(body.duration, 10);
      if (typeof body.isActive === 'string') body.isActive = body.isActive === 'true';
      if (typeof body.tags === 'string') {
        try { body.tags = JSON.parse(body.tags); } catch { body.tags = []; }
      }
    } else {
      body = await req.json();
    }

    // Normalize empty strings to undefined and set sensible defaults
    const normalizeEmpty = (val: unknown): string | undefined => {
      if (typeof val !== 'string') return undefined;
      const trimmed = val.trim();
      return trimmed === '' ? undefined : trimmed;
    };
    body.thumbnail = normalizeEmpty(body.thumbnail);
    body.url = normalizeEmpty(body.url);
    body.subject = normalizeEmpty(body.subject);
    body.module = normalizeEmpty(body.module);
    // Default category if omitted or empty
    if (!body.category || (typeof body.category === 'string' && body.category.trim() === '')) {
      body.category = 'General';
    }
    // Prefer uploaded file URL if present
    if (fileUrl) body.url = `${fileUrl}`;

    const validatedData = ResourceUploadSchema.parse(body);

    const resource = await prisma.teachingResource.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        type: validatedData.type,
        category: validatedData.category,
        difficulty: validatedData.difficulty,
        duration: validatedData.duration,
        language: validatedData.language,
        ageGroup: validatedData.ageGroup,
        tags: validatedData.tags ?? [],
        thumbnail: validatedData.thumbnail,
        url: validatedData.url,
        isActive: validatedData.isActive,
        subject: validatedData.subject,
        module: validatedData.module,
        createdAt: new Date(),
        updatedAt: new Date(),
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
        subject: resource.subject,
        module: resource.module,
        isActive: resource.isActive,
        url: resource.url,
        createdAt: resource.createdAt,
      }
    });

  } catch (error) {
    console.error('Library upload error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
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