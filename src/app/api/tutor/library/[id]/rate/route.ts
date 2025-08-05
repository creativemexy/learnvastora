import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const RateSchema = z.object({
  rating: z.number().min(1).max(5)
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const resourceId = params.id;

    // Check if resource exists
    const resource = await prisma.teachingResource.findUnique({
      where: { id: resourceId },
      select: { id: true, title: true, isActive: true }
    });

    if (!resource || !resource.isActive) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    // Parse and validate request body
    const body = await req.json();
    const validatedData = RateSchema.parse(body);
    const { rating } = validatedData;

    // Check if user has already rated this resource
    const existingRating = await prisma.resourceRating.findFirst({
      where: {
        resourceId,
        tutorId: user.id
      }
    });

    if (existingRating) {
      // Update existing rating
      await prisma.resourceRating.update({
        where: { id: existingRating.id },
        data: {
          rating,
          ratedAt: new Date()
        }
      });
    } else {
      // Create new rating
      await prisma.resourceRating.create({
        data: {
          resourceId,
          tutorId: user.id,
          rating,
          ratedAt: new Date()
        }
      });
    }

    // Calculate new average rating
    const allRatings = await prisma.resourceRating.findMany({
      where: { resourceId },
      select: { rating: true }
    });

    const averageRating = allRatings.length > 0 
      ? allRatings.reduce((acc, r) => acc + r.rating, 0) / allRatings.length 
      : 0;

    return NextResponse.json({ 
      message: 'Rating submitted successfully',
      rating,
      averageRating: Math.round(averageRating * 10) / 10,
      totalRatings: allRatings.length,
      success: true 
    });

  } catch (error) {
    console.error('Error in rate endpoint:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid rating value. Must be between 1 and 5.',
        details: error.errors 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 