import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/prisma';

export async function PUT(
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

    // Check if already favorited
    const existingFavorite = await prisma.resourceFavorite.findFirst({
      where: {
        resourceId,
        tutorId: user.id
      }
    });

    if (existingFavorite) {
      // Remove from favorites
      await prisma.resourceFavorite.delete({
        where: { id: existingFavorite.id }
      });

      return NextResponse.json({ 
        message: 'Removed from favorites',
        isFavorite: false,
        success: true 
      });
    } else {
      // Add to favorites
      await prisma.resourceFavorite.create({
        data: {
          resourceId,
          tutorId: user.id,
          favoritedAt: new Date()
        }
      });

      return NextResponse.json({ 
        message: 'Added to favorites',
        isFavorite: true,
        success: true 
      });
    }

  } catch (error) {
    console.error('Error in favorite endpoint:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 