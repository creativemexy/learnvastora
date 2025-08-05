import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    console.log("Progress API: Processing request for user:", userId);

    // Get user's bookings and sessions with related data
    const bookings = await prisma.booking.findMany({
      where: { studentId: userId },
      include: {
        tutor: {
          select: {
            name: true,
            email: true,
            tutorProfile: {
              select: {
                skills: true,
                languages: true
              }
            }
          }
        },
        review: {
          select: {
            rating: true,
            createdAt: true
          }
        },
        payment: {
          select: {
            status: true
          }
        }
      },
      orderBy: { scheduledAt: 'desc' }
    });

    console.log("Progress API: Found", bookings.length, "bookings");

    // Calculate real progress stats
    const totalSessions = bookings.length;
    const completedSessions = bookings.filter(b => b.status === 'COMPLETED').length;
    const upcomingSessions = bookings.filter(b => 
      b.status === 'CONFIRMED' && b.paidAt
    ).length;
    const totalHours = bookings
      .filter(b => b.status === 'COMPLETED')
      .reduce((acc, b) => acc + (b.duration / 60), 0); // Convert minutes to hours

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
    const languagesLearned = new Set(
      bookings
        .filter(b => b.tutor.tutorProfile?.languages)
        .flatMap(b => b.tutor.tutorProfile?.languages || [])
    ).size;

    console.log("Progress API: Calculated basic stats");

    // Generate real weekly progress data
    const weeklyProgress = generateWeeklyProgress(bookings);

    // Generate real monthly progress data
    const monthlyProgress = generateMonthlyProgress(bookings);

    console.log("Progress API: Generated progress data");

    // Get real achievements based on actual data and user's progress
    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' }
    });

    console.log("Progress API: Found", userAchievements.length, "user achievements");

    const achievements = await generateAchievements({
      userId,
      totalSessions,
      currentStreak,
      longestStreak,
      languagesLearned,
      averageRating,
      reviews,
      tutorsWorkedWith,
      userAchievements
    });

    console.log("Progress API: Generated", achievements.length, "achievements");

    // Generate real learning goals based on user's actual progress
    const learningGoals = generateLearningGoals({
      totalSessions,
      totalHours,
      currentStreak,
      tutorsWorkedWith,
      languagesLearned,
      averageRating
    });

    const progressStats = {
      totalSessions,
      upcomingSessions,
      totalHours: Math.round(totalHours * 10) / 10, // Round to 1 decimal place
      currentStreak,
      longestStreak,
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
      totalReviews: reviews.length,
      languagesLearned,
      tutorsWorkedWith,
      weeklyProgress,
      monthlyProgress
    };

    console.log("Progress API: Successfully processed request");

    return NextResponse.json({
      progressStats,
      achievements,
      learningGoals
    });

  } catch (error) {
    console.error("Error fetching progress data:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({ error: "Failed to fetch progress data" }, { status: 500 });
  }
}

// Helper function to calculate current streak
function calculateCurrentStreak(bookings: any[]): number {
  const completedBookings = bookings
    .filter(b => b.status === 'COMPLETED')
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

  if (completedBookings.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < completedBookings.length; i++) {
    const bookingDate = new Date(completedBookings[i].scheduledAt);
    bookingDate.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor((today.getTime() - bookingDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff === streak) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

// Helper function to calculate longest streak
function calculateLongestStreak(bookings: any[]): number {
  const completedBookings = bookings
    .filter(b => b.status === 'COMPLETED')
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  if (completedBookings.length === 0) return 0;

  let longestStreak = 0;
  let currentStreak = 1;

  for (let i = 1; i < completedBookings.length; i++) {
    const prevDate = new Date(completedBookings[i - 1].scheduledAt);
    const currDate = new Date(completedBookings[i].scheduledAt);
    
    const daysDiff = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff === 1) {
      currentStreak++;
    } else {
      longestStreak = Math.max(longestStreak, currentStreak);
      currentStreak = 1;
    }
  }

  return Math.max(longestStreak, currentStreak);
}

// Helper function to generate weekly progress data
function generateWeeklyProgress(bookings: any[]): any[] {
  const completedBookings = bookings.filter(b => b.status === 'COMPLETED');
  const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
  const weeklyData = [];

  for (let i = 0; i < 4; i++) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - (21 - i * 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const weekBookings = completedBookings.filter(b => {
      const bookingDate = new Date(b.scheduledAt);
      return bookingDate >= weekStart && bookingDate <= weekEnd;
    });

    const sessions = weekBookings.length;
    const hours = weekBookings.reduce((acc, b) => acc + (b.duration / 60), 0);
    const ratings = weekBookings
      .filter(b => b.review)
      .map(b => b.review.rating);
    const avgRating = ratings.length > 0 
      ? ratings.reduce((acc, r) => acc + r, 0) / ratings.length 
      : 0;

    weeklyData.push({
      week: weeks[i],
      sessions,
      hours: Math.round(hours * 10) / 10,
      rating: Math.round(avgRating * 10) / 10
    });
  }

  return weeklyData;
}

// Helper function to generate monthly progress data
function generateMonthlyProgress(bookings: any[]): any[] {
  const completedBookings = bookings.filter(b => b.status === 'COMPLETED');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyData = [];

  for (let i = 0; i < 12; i++) {
    const monthStart = new Date(new Date().getFullYear(), i, 1);
    const monthEnd = new Date(new Date().getFullYear(), i + 1, 0);

    const monthBookings = completedBookings.filter(b => {
      const bookingDate = new Date(b.scheduledAt);
      return bookingDate >= monthStart && bookingDate <= monthEnd;
    });

    const sessions = monthBookings.length;
    const hours = monthBookings.reduce((acc, b) => acc + (b.duration / 60), 0);
    const ratings = monthBookings
      .filter(b => b.review)
      .map(b => b.review.rating);
    const avgRating = ratings.length > 0 
      ? ratings.reduce((acc, r) => acc + r, 0) / ratings.length 
      : 0;

    monthlyData.push({
      month: months[i],
      sessions,
      hours: Math.round(hours * 10) / 10,
      rating: Math.round(avgRating * 10) / 10
    });
  }

  return monthlyData;
}

// Helper function to generate achievements based on real data
async function generateAchievements(data: any): Promise<any[]> {
  const { totalSessions, currentStreak, longestStreak, languagesLearned, averageRating, reviews, tutorsWorkedWith, userAchievements, userId } = data;

  if (!userId) {
    console.error("generateAchievements: userId is missing");
    return [];
  }

  const achievementDefinitions = [
    {
      id: '1',
      title: 'First Steps',
      description: 'Complete your first session',
      icon: 'bi-star',
      category: 'sessions',
      target: 1
    },
    {
      id: '2',
      title: 'Week Warrior',
      description: 'Maintain a 7-day learning streak',
      icon: 'bi-fire',
      category: 'streak',
      target: 7
    },
    {
      id: '3',
      title: 'Language Explorer',
      description: 'Learn 2 different languages',
      icon: 'bi-globe',
      category: 'language',
      target: 2
    },
    {
      id: '4',
      title: 'Session Master',
      description: 'Complete 50 sessions',
      icon: 'bi-trophy',
      category: 'sessions',
      target: 50
    },
    {
      id: '5',
      title: 'Perfect Score',
      description: 'Receive 10 perfect ratings',
      icon: 'bi-award',
      category: 'rating',
      target: 10
    },
    {
      id: '6',
      title: 'Tutor Networker',
      description: 'Work with 5 different tutors',
      icon: 'bi-people',
      category: 'special',
      target: 5
    },
    {
      id: '7',
      title: 'Streak Master',
      description: 'Maintain a 30-day learning streak',
      icon: 'bi-lightning',
      category: 'streak',
      target: 30
    },
    {
      id: '8',
      title: 'High Achiever',
      description: 'Maintain an average rating of 4.5+',
      icon: 'bi-star-fill',
      category: 'rating',
      target: 4.5
    }
  ];

  const achievements = [];

  try {
    for (const definition of achievementDefinitions) {
      let current = 0;
      let isUnlocked = false;
      let progress = 0;

      // Calculate current value based on achievement type
      switch (definition.id) {
        case '1':
        case '4':
          current = totalSessions;
          break;
        case '2':
        case '7':
          current = definition.id === '2' ? currentStreak : longestStreak;
          break;
        case '3':
          current = languagesLearned;
          break;
        case '5':
          current = reviews.filter((r: any) => r.rating === 5).length;
          break;
        case '6':
          current = tutorsWorkedWith;
          break;
        case '8':
          current = averageRating;
          break;
      }

      // Check if achievement is unlocked
      isUnlocked = current >= definition.target;
      progress = Math.min((current / definition.target) * 100, 100);

      // Find existing user achievement record
      const existingAchievement = userAchievements.find((ua: any) => ua.achievementId === definition.id);
      
      if (existingAchievement) {
        // Update existing achievement if progress has changed
        if (existingAchievement.current !== current || existingAchievement.isUnlocked !== isUnlocked) {
          try {
            await prisma.userAchievement.update({
              where: { id: existingAchievement.id },
              data: {
                current,
                isUnlocked,
                progress: Math.round(progress),
                unlockedAt: isUnlocked && !existingAchievement.isUnlocked ? new Date() : existingAchievement.unlockedAt
              }
            });
          } catch (updateError) {
            console.error(`Error updating achievement ${definition.id}:`, updateError);
          }
        }
        
        achievements.push({
          ...definition,
          isUnlocked: existingAchievement.isUnlocked,
          progress: existingAchievement.progress,
          current: existingAchievement.current,
          unlockedAt: existingAchievement.unlockedAt?.toISOString()
        });
      } else {
        // Create new achievement record
        try {
          const newAchievement = await prisma.userAchievement.create({
            data: {
              userId,
              achievementId: definition.id,
              current,
              isUnlocked,
              progress: Math.round(progress),
              unlockedAt: isUnlocked ? new Date() : null
            }
          });

          achievements.push({
            ...definition,
            isUnlocked: newAchievement.isUnlocked,
            progress: newAchievement.progress,
            current: newAchievement.current,
            unlockedAt: newAchievement.unlockedAt?.toISOString()
          });
        } catch (createError) {
          console.error(`Error creating achievement ${definition.id}:`, createError);
          // Fallback: return achievement without database persistence
          achievements.push({
            ...definition,
            isUnlocked,
            progress: Math.round(progress),
            current,
            unlockedAt: isUnlocked ? new Date().toISOString() : undefined
          });
        }
      }
    }
  } catch (error) {
    console.error("Error in generateAchievements:", error);
    // Return basic achievements without database persistence as fallback
    return achievementDefinitions.map(definition => ({
      ...definition,
      isUnlocked: false,
      progress: 0,
      current: 0,
      unlockedAt: undefined
    }));
  }

  return achievements;
}

// Helper function to generate learning goals based on real data
function generateLearningGoals(data: any): any[] {
  const { totalSessions, totalHours, currentStreak, tutorsWorkedWith, languagesLearned, averageRating } = data;

  return [
      {
        id: '1',
        title: 'Complete 60 sessions',
        description: 'Reach 60 total learning sessions',
        target: 60,
        current: totalSessions,
        unit: 'sessions',
        isCompleted: totalSessions >= 60,
        category: 'sessions'
      },
      {
        id: '2',
        title: 'Achieve 30 hours',
        description: 'Accumulate 30 hours of learning time',
        target: 30,
        current: totalHours,
        unit: 'hours',
        isCompleted: totalHours >= 30,
        category: 'time'
      },
      {
        id: '3',
        title: 'Maintain 14-day streak',
        description: 'Keep learning for 14 consecutive days',
        target: 14,
        current: currentStreak,
        unit: 'days',
        isCompleted: currentStreak >= 14,
        category: 'streak'
      },
      {
        id: '4',
        title: 'Work with 10 tutors',
        description: 'Have sessions with 10 different tutors',
        target: 10,
        current: tutorsWorkedWith,
        unit: 'tutors',
        isCompleted: tutorsWorkedWith >= 10,
        category: 'diversity'
    },
    {
      id: '5',
      title: 'Learn 3 languages',
      description: 'Study 3 different languages',
      target: 3,
      current: languagesLearned,
      unit: 'languages',
      isCompleted: languagesLearned >= 3,
      category: 'languages'
    },
    {
      id: '6',
      title: 'Perfect Rating',
      description: 'Maintain a 5.0 average rating',
      target: 5.0,
      current: averageRating,
      unit: 'rating',
      isCompleted: averageRating >= 5.0,
      category: 'quality'
    }
  ];
} 