import { prisma } from './prisma';

export interface BadgeCriteria {
  sessions?: number;
  streak?: number;
  reviews?: number;
  hours?: number;
  languages?: number;
  earlyBird?: boolean;
  nightOwl?: boolean;
  repeatBookings?: number;
  perfectGrammar?: number;
  perfectPronunciation?: number;
}

export class BadgeService {
  // Initialize default badges
  static async initializeBadges() {
    const defaultBadges = [
      // Streak badges
      {
        key: 'streak_3',
        name: '3-Day Streak',
        description: 'Attend sessions 3 days in a row',
        icon: '🔥',
        category: 'STREAK',
        color: '#FF6B35',
        criteria: { streak: 3 }
      },
      {
        key: 'streak_7',
        name: 'Week Warrior',
        description: 'Attend sessions 7 days in a row',
        icon: '🔥',
        category: 'STREAK',
        color: '#FF6B35',
        criteria: { streak: 7 }
      },
      {
        key: 'streak_30',
        name: 'Monthly Master',
        description: 'Attend sessions 30 days in a row',
        icon: '🔥',
        category: 'STREAK',
        color: '#FF6B35',
        criteria: { streak: 30 }
      },
      // Milestone badges
      {
        key: 'sessions_10',
        name: 'Getting Started',
        description: 'Complete 10 sessions',
        icon: '🎯',
        category: 'MILESTONE',
        color: '#4ECDC4',
        criteria: { sessions: 10 }
      },
      {
        key: 'sessions_50',
        name: 'Dedicated Learner',
        description: 'Complete 50 sessions',
        icon: '🎯',
        category: 'MILESTONE',
        color: '#4ECDC4',
        criteria: { sessions: 50 }
      },
      {
        key: 'sessions_100',
        name: 'Century Club',
        description: 'Complete 100 sessions',
        icon: '🎯',
        category: 'MILESTONE',
        color: '#4ECDC4',
        criteria: { sessions: 100 }
      },
      // Engagement badges
      {
        key: 'first_session',
        name: 'First Steps',
        description: 'Complete your first session',
        icon: '🌟',
        category: 'ENGAGEMENT',
        color: '#FFE66D',
        criteria: { sessions: 1 }
      },
      {
        key: 'first_review',
        name: 'Helpful Feedback',
        description: 'Leave your first review',
        icon: '⭐',
        category: 'ENGAGEMENT',
        color: '#FFE66D',
        criteria: { reviews: 1 }
      },
      {
        key: 'reviews_5',
        name: 'Community Helper',
        description: 'Leave 5 reviews',
        icon: '⭐',
        category: 'ENGAGEMENT',
        color: '#FFE66D',
        criteria: { reviews: 5 }
      },
      // Skill badges
      {
        key: 'grammar_guru',
        name: 'Grammar Guru',
        description: 'Complete 5 sessions with perfect grammar feedback',
        icon: '📚',
        category: 'SKILL',
        color: '#95E1D3',
        criteria: { perfectGrammar: 5 }
      },
      {
        key: 'pronunciation_pro',
        name: 'Pronunciation Pro',
        description: 'Complete 10 sessions with perfect pronunciation feedback',
        icon: '🎤',
        category: 'SKILL',
        color: '#95E1D3',
        criteria: { perfectPronunciation: 10 }
      },
      // Community badges
      {
        key: 'early_bird',
        name: 'Early Bird',
        description: 'Complete a session before 8 AM',
        icon: '🌅',
        category: 'COMMUNITY',
        color: '#F7DC6F',
        criteria: { earlyBird: true }
      },
      {
        key: 'night_owl',
        name: 'Night Owl',
        description: 'Complete a session after 10 PM',
        icon: '🦉',
        category: 'COMMUNITY',
        color: '#F7DC6F',
        criteria: { nightOwl: true }
      },
      {
        key: 'polyglot',
        name: 'Polyglot',
        description: 'Have sessions in 3 different languages',
        icon: '🌍',
        category: 'COMMUNITY',
        color: '#F7DC6F',
        criteria: { languages: 3 }
      },
      // Social badges
      {
        key: 'repeat_booking',
        name: 'Book Again',
        description: 'Book a session with the same tutor again',
        icon: '🤝',
        category: 'SOCIAL',
        color: '#BB8FCE',
        criteria: { repeatBookings: 1 }
      },
      {
        key: 'regular_student',
        name: 'Regular Student',
        description: 'Book 5 sessions with the same tutor',
        icon: '🤝',
        category: 'SOCIAL',
        color: '#BB8FCE',
        criteria: { repeatBookings: 5 }
      },
      // Special badges
      {
        key: 'pioneer',
        name: 'Pioneer',
        description: 'One of the first 100 users on the platform',
        icon: '🚀',
        category: 'SPECIAL',
        color: '#E74C3C',
        criteria: {}
      }
    ];

    for (const badgeData of defaultBadges) {
      await prisma.badge.upsert({
        where: { key: badgeData.key },
        update: {
          ...badgeData,
          category: badgeData.category as any
        },
        create: {
          ...badgeData,
          category: badgeData.category as any
        }
      });
    }
  }

  // Check and award badges for a user
  static async checkAndAwardBadges(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        bookingsAsStudent: {
          where: { status: 'COMPLETED' },
          include: { tutor: true }
        },
        reviewsGiven: true,
        userBadges: {
          include: { badge: true }
        }
      }
    });

    if (!user) return [];

    const earnedBadges = new Set(user.userBadges.map(ub => ub.badge.key));
    const newlyAwarded: any[] = [];

    // Get all available badges
    const allBadges = await prisma.badge.findMany({
      where: { isActive: true }
    });

    for (const badge of allBadges) {
      if (earnedBadges.has(badge.key)) continue;

      const criteria = badge.criteria as BadgeCriteria;
      let shouldAward = false;
      let progress: any = {};

      // Check different criteria types
      if (criteria.sessions) {
        const sessionCount = user.bookingsAsStudent.length;
        progress.sessions = sessionCount;
        shouldAward = sessionCount >= criteria.sessions;
      }

      if (criteria.reviews) {
        const reviewCount = user.reviewsGiven.length;
        progress.reviews = reviewCount;
        shouldAward = reviewCount >= criteria.reviews;
      }

      if (criteria.streak) {
        const streak = this.calculateStreak(user.bookingsAsStudent);
        progress.streak = streak;
        shouldAward = streak >= criteria.streak;
      }

      if (criteria.repeatBookings) {
        const repeatCount = this.calculateRepeatBookings(user.bookingsAsStudent);
        progress.repeatBookings = repeatCount;
        shouldAward = repeatCount >= criteria.repeatBookings;
      }

      if (criteria.languages) {
        const languageCount = this.calculateLanguages(user.bookingsAsStudent);
        progress.languages = languageCount;
        shouldAward = languageCount >= criteria.languages;
      }

      if (criteria.earlyBird) {
        const hasEarlySession = this.hasEarlySession(user.bookingsAsStudent);
        progress.earlyBird = hasEarlySession;
        shouldAward = hasEarlySession;
      }

      if (criteria.nightOwl) {
        const hasLateSession = this.hasLateSession(user.bookingsAsStudent);
        progress.nightOwl = hasLateSession;
        shouldAward = hasLateSession;
      }

      if ((criteria as any).pioneer) {
        const userCount = await prisma.user.count();
        progress.userCount = userCount;
        shouldAward = userCount <= 100;
      }

      if (shouldAward) {
        const userBadge = await prisma.userBadge.create({
          data: {
            userId: user.id,
            badgeId: badge.id,

          },
          include: { badge: true }
        });

        newlyAwarded.push(userBadge);
      }
    }

    return newlyAwarded;
  }

  // Helper methods
  private static calculateStreak(bookings: any[]): number {
    if (bookings.length === 0) return 0;

    const sortedBookings = bookings
      .map(b => new Date(b.scheduledAt))
      .sort((a, b) => b.getTime() - a.getTime());

    let streak = 1;
    let currentDate = new Date(sortedBookings[0]);
    currentDate.setHours(0, 0, 0, 0);

    for (let i = 1; i < sortedBookings.length; i++) {
      const bookingDate = new Date(sortedBookings[i]);
      bookingDate.setHours(0, 0, 0, 0);

      const diffTime = currentDate.getTime() - bookingDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        streak++;
        currentDate = bookingDate;
      } else {
        break;
      }
    }

    return streak;
  }

  private static calculateRepeatBookings(bookings: any[]): number {
    const tutorBookings = new Map<string, number>();
    
    for (const booking of bookings) {
      const tutorId = booking.tutorId;
      tutorBookings.set(tutorId, (tutorBookings.get(tutorId) || 0) + 1);
    }

    return Math.max(...tutorBookings.values(), 0);
  }

  private static calculateLanguages(bookings: any[]): number {
    // This would need to be implemented based on your language tracking
    // For now, return a placeholder
    return 1;
  }

  private static hasEarlySession(bookings: any[]): boolean {
    return bookings.some(booking => {
      const hour = new Date(booking.scheduledAt).getHours();
      return hour < 8;
    });
  }

  private static hasLateSession(bookings: any[]): boolean {
    return bookings.some(booking => {
      const hour = new Date(booking.scheduledAt).getHours();
      return hour >= 22;
    });
  }
} 