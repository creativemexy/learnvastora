import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || (session.user as any).role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const studentId = (session.user as any).id;

  try {
    // Get all bookings for the student
    const bookings = await prisma.booking.findMany({
      where: { studentId },
      include: {
        tutor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        review: {
          select: {
            rating: true,
            comment: true,
          },
        },
        payment: {
          select: {
            amount: true,
            status: true,
          },
        },
      },
      orderBy: { scheduledAt: "desc" },
    });

    // Calculate stats
    const totalSessions = bookings.length;
    const completedSessions = bookings.filter(b => b.status === "COMPLETED").length;
    const upcomingSessions = bookings.filter(b => 
      b.status === "CONFIRMED" && b.paidAt
    ).length;
    
    // Calculate total spent - check if amounts are in cents and convert to dollars
    const totalSpentRaw = bookings
      .filter(b => b.payment?.amount && b.payment.status === "PAID")
      .reduce((sum, b) => sum + (b.payment?.amount || 0), 0);
    
    // Filter out outlier payments (amounts > $1000) and calculate total
    const reasonablePayments = bookings
      .filter(b => b.payment?.amount && b.payment.status === "PAID" && b.payment.amount <= 1000)
      .reduce((sum, b) => sum + (b.payment?.amount || 0), 0);
    
    // Use reasonable payments total
    const totalSpent = reasonablePayments;

    // Calculate average rating
    const ratedSessions = bookings.filter(b => b.review?.rating);
    const averageRating = ratedSessions.length > 0 
      ? ratedSessions.reduce((sum, b) => sum + (b.review?.rating || 0), 0) / ratedSessions.length
      : 0;

    // Get recent sessions (last 5)
    const recentSessions = bookings
      .filter(b => b.status === "COMPLETED")
      .slice(0, 5)
      .map(booking => ({
        id: booking.id,
        tutorName: booking.tutor.name,
        scheduledAt: booking.scheduledAt.toISOString(),
        status: booking.status,
        rating: booking.review?.rating || null,
      }));

    // Get upcoming bookings
    const upcomingBookings = bookings
      .filter(b => b.status === "CONFIRMED" && b.paidAt)
      .slice(0, 5)
      .map(booking => ({
        id: booking.id,
        tutorName: booking.tutor.name,
        scheduledAt: booking.scheduledAt.toISOString(),
        status: booking.status,
      }));

    // Get recent reviews given by the student
    const recentReviews = await prisma.review.findMany({
      where: { studentId },
      include: {
        tutor: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    // Get recent tutors (unique, most recent first, up to 5)
    const recentTutorsMap = new Map();
    for (const booking of bookings) {
      if (booking.tutor && !recentTutorsMap.has(booking.tutor.email)) {
        recentTutorsMap.set(booking.tutor.email, {
          id: booking.tutor.id || null,
          name: booking.tutor.name,
          email: booking.tutor.email,
          // avatar: booking.tutor.avatar, // Uncomment if avatar/profile image is available
        });
      }
      if (recentTutorsMap.size >= 5) break;
    }
    const recentTutors = Array.from(recentTutorsMap.values());

    const dashboardData = {
      stats: {
        totalSessions,
        completedSessions,
        upcomingSessions,
        totalSpent: parseFloat(totalSpent.toFixed(2)), // Ensure 2 decimal places
        averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
      },
      recentSessions,
      upcomingBookings,
      recentReviews: recentReviews.map(review => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt.toISOString(),
        tutor: review.tutor,
      })),
      recentTutors,
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error("Error fetching student dashboard data:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
} 