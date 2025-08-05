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

    // Get user ID first
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user's booking history to calculate real stats
    const bookings = await prisma.booking.findMany({
      where: {
        studentId: user.id,
        status: 'COMPLETED'
      },
      include: {
        review: true,
        payment: true
      },
      orderBy: { scheduledAt: 'desc' }
    });

    // Calculate real statistics
    const totalSessions = bookings.length;
    const totalHours = bookings.reduce((sum, booking) => {
      return sum + (booking.duration / 60); // Convert minutes to hours
    }, 0);

    // Calculate average rating from real reviews
    const reviews = bookings.filter(b => b.review).map(b => b.review!);
    const averageRating = reviews.length > 0 
      ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length 
      : 0;

    // Calculate current streak based on actual session dates
    const currentStreak = calculateCurrentStreak(bookings);
    const longestStreak = calculateLongestStreak(bookings);

    // Get unique tutors and languages from real data
    const tutorsWorkedWith = new Set(bookings.map(b => b.tutorId)).size;
    
    // Get unique languages from tutor profiles
    const tutorIds = [...new Set(bookings.map(b => b.tutorId))];
    const tutorProfiles = await prisma.tutorProfile.findMany({
      where: { userId: { in: tutorIds } },
      select: { languages: true }
    });
    const languagesLearned = new Set(
      tutorProfiles.flatMap(p => p.languages || [])
    ).size;

    // Calculate total spent from real payments
    const totalSpent = bookings
      .filter(b => b.payment?.status === 'PAID')
      .reduce((sum, b) => sum + (b.payment?.amount || 0), 0);

    // Calculate level and experience based on sessions completed
    const level = Math.floor(totalSessions / 5) + 1; // Level up every 5 sessions
    const experience = totalSessions * 25; // 25 XP per session
    const experienceToNextLevel = Math.max(0, (level * 5 - totalSessions) * 25);

    // Get certificates earned (mock for now, could be based on achievements)
    const certificatesEarned = Math.min(level, 10);

    // Get challenges completed (mock for now)
    const challengesCompleted = Math.floor(totalSessions / 3);

    return NextResponse.json({
      totalSessions,
      totalHours: Math.round(totalHours * 10) / 10, // Round to 1 decimal
      currentStreak,
      longestStreak,
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      languagesLearned,
      certificatesEarned,
      challengesCompleted,
      level,
      experience,
      experienceToNextLevel,
      totalSpent: Math.round(totalSpent * 100) / 100 // Round to 2 decimals
    });

  } catch (error) {
    console.error('Profile stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper functions to calculate streaks
function calculateCurrentStreak(bookings: any[]): number {
  if (bookings.length === 0) return 0;
  
  const sortedBookings = bookings.sort((a, b) => 
    new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
  );
  
  let streak = 0;
  let currentDate = new Date();
  
  for (const booking of sortedBookings) {
    const bookingDate = new Date(booking.scheduledAt);
    const daysDiff = Math.floor((currentDate.getTime() - bookingDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 1) {
      streak++;
      currentDate = bookingDate;
    } else {
      break;
    }
  }
  
  return streak;
}

function calculateLongestStreak(bookings: any[]): number {
  if (bookings.length === 0) return 0;
  
  const sortedBookings = bookings.sort((a, b) => 
    new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  );
  
  let longestStreak = 0;
  let currentStreak = 0;
  let previousDate: Date | null = null;
  
  for (const booking of sortedBookings) {
    const bookingDate = new Date(booking.scheduledAt);
    
    if (previousDate) {
      const daysDiff = Math.floor((bookingDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff <= 1) {
        currentStreak++;
      } else {
        longestStreak = Math.max(longestStreak, currentStreak);
        currentStreak = 1;
      }
    } else {
      currentStreak = 1;
    }
    
    previousDate = bookingDate;
  }
  
  return Math.max(longestStreak, currentStreak);
} 