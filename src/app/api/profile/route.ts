import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
  const session = await getServerSession(authOptions);
    
    if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

    if (!session.user?.email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ 
      where: { email: session.user.email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
        photo: true,
        language: true,
        country: true,
        bio: true,
        languageLevel: true,
        courseInterests: true,
        tutorPreferences: true,
        learningGoals: true,
        preferences: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      user: {
        ...user,
        language: user.language || "English",
        country: user.country || "",
        bio: user.bio || "",
        photo: user.photo || "",
        languageLevel: user.languageLevel || "beginner",
        courseInterests: user.courseInterests || [],
        tutorPreferences: user.tutorPreferences as any || {
          accent: "",
          teachingStyle: "",
          availability: "",
          experience: ""
        },
        learningGoals: user.learningGoals as any || {
          shortTerm: "",
          longTerm: "",
          targetLanguages: [],
          proficiencyTarget: ""
        },
        joinDate: user.createdAt.toISOString(),
        lastActive: user.lastSeen.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        preferences: user.preferences as any || {
          notifications: true,
          emailUpdates: true,
          publicProfile: false,
        }
      }
    });
  } catch (error) {
    console.error('Profile GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
  const session = await getServerSession(authOptions);
    
    if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

    if (!session.user?.email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 });
    }

  const data = await req.json();
    const { 
      name, 
      email, 
      language, 
      country, 
      bio, 
      languageLevel, 
      courseInterests, 
      tutorPreferences, 
      learningGoals,
      preferences 
    } = data;

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    // Update user profile
    const user = await prisma.user.update({
      where: { email: session.user.email },
      data: { 
        name, 
        email,
        language,
        country,
        bio,
        languageLevel,
        courseInterests,
        tutorPreferences,
        learningGoals,
        preferences
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
        photo: true,
        language: true,
        country: true,
        bio: true,
        languageLevel: true,
        courseInterests: true,
        tutorPreferences: true,
        learningGoals: true,
        preferences: true
      }
    });

    return NextResponse.json({ 
      user: {
        ...user,
        language: user.language || "English",
        country: user.country || "",
        bio: user.bio || "",
        photo: user.photo || "",
        languageLevel: user.languageLevel || "beginner",
        courseInterests: user.courseInterests || [],
        tutorPreferences: user.tutorPreferences as any || {
          accent: "",
          teachingStyle: "",
          availability: "",
          experience: ""
        },
        learningGoals: user.learningGoals as any || {
          shortTerm: "",
          longTerm: "",
          targetLanguages: [],
          proficiencyTarget: ""
        },
        joinDate: user.createdAt.toISOString(),
        lastActive: user.lastSeen.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        preferences: user.preferences as any || {
          notifications: true,
          emailUpdates: true,
          publicProfile: false,
        }
      }
    });
  } catch (error) {
    console.error('Profile PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 