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
    
    // Check if user is Super Admin
    if (!session?.user || (session.user as any).role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get all tutors
    const tutors = await prisma.user.findMany({
      where: {
        role: 'TUTOR'
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        tutorProfile: {
          select: {
            bio: true,
            skills: true,
            subjects: true,
            languages: true,
            hourlyRate: true,
            experience: true,
            education: true,
            rating: true,
            totalSessions: true,
            isPro: true,
            isSupertutor: true,
            instantBookingEnabled: true,
            instantBookingPrice: true,
            responseTime: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return NextResponse.json({ 
      success: true, 
      data: tutors,
      count: tutors.length
    });
    
  } catch (error) {
    console.error('Error fetching tutors:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session?.user || (session.user as any).role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { tutorId, action, updates } = body;

    if (!tutorId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let result: any = {};

    switch (action) {
      case 'approve':
        result = await prisma.user.update({
          where: { id: tutorId },
          data: { active: true }
        });
        break;
      
      case 'reject':
        result = await prisma.user.update({
          where: { id: tutorId },
          data: { active: false }
        });
        break;
      
      case 'update':
        if (!updates) {
          return NextResponse.json({ error: 'Missing updates' }, { status: 400 });
        }
        result = await prisma.user.update({
          where: { id: tutorId },
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
    console.error('Tutor management update error:', error);
    return NextResponse.json(
      { error: 'Failed to update tutor' },
      { status: 500 }
    );
  }
} 

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session?.user || (session.user as any).role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { 
      name, 
      email, 
      password, 
      bio, 
      skills, 
      languages, 
      hourlyRate, 
      isPro, 
      isSupertutor, 
      instantBookingEnabled 
    } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    // Create new tutor user
    const newTutor = await prisma.user.create({
      data: {
        name,
        email,
        password, // Note: In production, this should be hashed
        role: 'TUTOR',
        active: true,
        tutorProfile: {
          create: {
            bio: bio || '',
            skills: skills || [],
            subjects: skills || [], // Use skills as subjects for now
            languages: languages || [],
            experience: 0,
            hourlyRate: hourlyRate || 0,
            rating: 0,
            totalSessions: 0,
            isPro: isPro || false,
            isSupertutor: isSupertutor || false,
            instantBookingEnabled: instantBookingEnabled || false
          }
        }
      },
      include: {
        tutorProfile: true
      }
    });

    return NextResponse.json({
      success: true,
      tutor: newTutor
    });

  } catch (error) {
    console.error('Tutor creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create tutor' },
      { status: 500 }
    );
  }
} 