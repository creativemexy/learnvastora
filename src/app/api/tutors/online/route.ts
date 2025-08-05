import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const language = searchParams.get('language');
    const skill = searchParams.get('skill');
    const maxPrice = searchParams.get('maxPrice');

    // Get current time for availability check
    const now = new Date();
    const currentDay = now.getDay(); // 0-6 (Sunday-Saturday)
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

    // Build where clause for tutors
    const whereClause: any = {
      role: "TUTOR",
      active: true,
      isOnline: true,
      tutorProfile: {
        instantBookingEnabled: true
      },
      availability: {
        some: {
          dayOfWeek: currentDay,
          isActive: true,
          startTime: { lte: currentTime },
          endTime: { gte: currentTime }
        }
      }
    };

    // Add language filter if provided
    if (language) {
      whereClause.tutorProfile = {
        ...whereClause.tutorProfile,
        skills: {
          has: language
        }
      };
    }

    // Add skill filter if provided
    if (skill) {
      whereClause.tutorProfile = {
        ...whereClause.tutorProfile,
        skills: {
          has: skill
        }
      };
    }

    const tutors = await prisma.user.findMany({
      where: whereClause,
      include: {
        tutorProfile: true,
        reviewsReceived: {
          include: {
            student: true
          }
        },
        availability: {
          where: {
            dayOfWeek: currentDay,
            isActive: true
          }
        }
      },
      orderBy: [
        { lastSeen: 'desc' }, // Most recently online first
        { tutorProfile: { responseTime: 'asc' } } // Fastest response time
      ]
    });

    // Transform the data and add calculated fields
    const transformedTutors = tutors.map(tutor => {
      const avgRating = tutor.reviewsReceived.length > 0 
        ? tutor.reviewsReceived.reduce((sum, review) => sum + review.rating, 0) / tutor.reviewsReceived.length
        : 0;

      return {
        id: tutor.id,
        name: tutor.name,
        email: tutor.email,
        photo: tutor.photo, // Include profile photo
        bio: tutor.tutorProfile?.bio,
        skills: tutor.tutorProfile?.skills || [],
        instantBookingPrice: tutor.tutorProfile?.instantBookingPrice || 10.00,
        responseTime: tutor.tutorProfile?.responseTime || 5,
        avgRating: Math.round(avgRating * 10) / 10,
        reviewCount: tutor.reviewsReceived.length,
        isOnline: tutor.isOnline,
        lastSeen: tutor.lastSeen,
        availability: tutor.availability
      };
    });

    // Filter by max price if provided
    const filteredTutors = maxPrice 
      ? transformedTutors.filter(tutor => tutor.instantBookingPrice <= parseFloat(maxPrice))
      : transformedTutors;

    return NextResponse.json(filteredTutors);

  } catch (error) {
    console.error("Error fetching online tutors:", error);
    return NextResponse.json({ error: "Failed to fetch online tutors" }, { status: 500 });
  }
} 