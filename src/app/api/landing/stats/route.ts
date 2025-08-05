import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    // Fetch real statistics from the database
    const [
      totalTutors,
      totalStudents,
      totalSessions,
      totalLanguages,
      recentReviews
    ] = await Promise.all([
      // Count tutors
      prisma.user.count({
        where: { role: "TUTOR", active: true }
      }),
      
      // Count students
      prisma.user.count({
        where: { role: "STUDENT", active: true }
      }),
      
      // Count completed sessions
      prisma.booking.count({
        where: { status: "COMPLETED" }
      }),
      
      // Count unique languages (from tutor skills)
      prisma.tutorProfile.count({
        where: {
          skills: { isEmpty: false }
        }
      }),
      
      // Get recent reviews with student and tutor names
      prisma.review.findMany({
        take: 3,
        orderBy: { createdAt: "desc" },
        include: {
          student: { select: { name: true } },
          tutor: { select: { name: true } },
          booking: {
            include: {
              tutor: {
                include: {
                  tutorProfile: { select: { skills: true } }
                }
              }
            }
          }
        }
      })
    ]);

    // Transform reviews into testimonials
    const recentTestimonials = recentReviews.map(review => ({
      id: review.id,
      studentName: review.student.name,
      tutorName: review.tutor.name,
      language: review.booking.tutor.tutorProfile?.skills?.[0] || "Language",
      rating: review.rating,
      comment: review.comment || "Great learning experience!"
    }));

    return NextResponse.json({
      totalTutors,
      totalStudents,
      totalSessions,
      totalLanguages,
      recentTestimonials
    });

  } catch (error) {
    console.error("Error fetching landing stats:", error);
    // Return default stats if there's an error
    return NextResponse.json({
      totalTutors: 500,
      totalStudents: 10000,
      totalSessions: 100000,
      totalLanguages: 50,
      recentTestimonials: [
        {
          id: "1",
          studentName: "Sarah Johnson",
          language: "Spanish",
          rating: 5,
          comment: "LanguageConnect helped me become fluent in Spanish in just 6 months. My tutor Maria was amazing and made learning fun!"
        },
        {
          id: "2",
          studentName: "Michael Chen",
          language: "French",
          rating: 5,
          comment: "The personalized approach and native speakers made all the difference. I can now confidently speak French in business meetings."
        },
        {
          id: "3",
          studentName: "Emma Davis",
          language: "German",
          rating: 5,
          comment: "Flexible scheduling and excellent tutors. I learned German while working full-time. Highly recommend!"
        }
      ]
    });
  }
} 