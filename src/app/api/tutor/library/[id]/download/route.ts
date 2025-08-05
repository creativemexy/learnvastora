import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/prisma';

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

    // Check if already downloaded
    const existingDownload = await prisma.resourceDownload.findFirst({
      where: {
        resourceId,
        tutorId: user.id
      }
    });

    if (existingDownload) {
      return NextResponse.json({ 
        message: 'Resource already downloaded',
        success: true 
      });
    }

    // Create download record
    await prisma.resourceDownload.create({
      data: {
        resourceId,
        tutorId: user.id,
        downloadedAt: new Date()
      }
    });

    // Download count is tracked through ResourceDownload records
    // No need to update a counter field

    return NextResponse.json({ 
      message: 'Resource downloaded successfully',
      success: true 
    });

  } catch (error) {
    console.error('Error in download endpoint:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 