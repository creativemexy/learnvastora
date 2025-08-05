import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    // Get session
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user is Admin or Super Admin
    if ((session.user as any).role !== 'ADMIN' && (session.user as any).role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get pending tutor approvals
    const pendingTutors = await prisma.user.findMany({
      where: {
        role: 'TUTOR',
        // Add any additional conditions for pending approval
        // For example, if you have an approval status field
        // approvalStatus: 'PENDING'
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        tutorProfile: {
          select: {
            bio: true,
            skills: true,
            experience: true,
            education: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      count: pendingTutors.length,
      pendingApprovals: pendingTutors
    });

  } catch (error) {
    console.error('Admin Pending Approvals API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
} 