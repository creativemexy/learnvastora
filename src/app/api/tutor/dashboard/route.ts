import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || (session.user as any).role !== "TUTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const tutorId = (session.user as any).id;

  try {
    // Get all bookings for this tutor
    const bookings = await prisma.booking.findMany({
      where: { tutorId },
      include: {
        student: true,
        review: true,
        payment: true,
      },
      orderBy: { scheduledAt: "desc" },
    });

    // Calculate stats
    const activeSessions = bookings.filter(b => 
      b.status === "IN_PROGRESS" || 
      (b.status === "CONFIRMED" && new Date(b.scheduledAt) > new Date())
    ).length;

    const totalStudents = new Set(bookings.map(b => b.studentId)).size;
    
    const pendingBookings = bookings.filter(b => 
      b.status === "PENDING" || 
      (b.status === "CONFIRMED" && new Date(b.scheduledAt) > new Date())
    ).length;

    const completedSessions = bookings.filter(b => b.status === "COMPLETED").length;
    const totalHours = completedSessions * 0.5; // 30 minutes per session
    const totalEarnings = completedSessions * 4000; // ₦4,000 per 30-minute session

    // Calculate balance and payments
    const tutorBookings = await prisma.booking.findMany({
      where: { tutorId },
      include: {
        payment: true
      }
    });

    const paidBookings = tutorBookings.filter(booking => 
      booking.payment && booking.payment.status === "PAID"
    );

    const totalPayments = paidBookings.reduce((sum, booking) => 
      sum + (booking.payment?.amount || 0), 0
    );
    
    // Calculate current balance (total earnings minus any withdrawals)
    const payouts = await prisma.payout.findMany({
      where: { 
        tutorId,
        status: "COMPLETED"
      },
      select: { amount: true }
    });

    const totalPayouts = payouts.reduce((sum, payout) => sum + payout.amount, 0);
    const currentBalance = totalPayments - totalPayouts;

    // Calculate average rating
    const reviews = await prisma.review.findMany({
      where: { tutorId },
      select: { rating: true }
    });

    const averageRating = reviews.length > 0 
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
      : null;

    // Get recent sessions (last 5 completed)
    const recentSessions = bookings
      .filter(b => b.status === "COMPLETED")
      .slice(0, 5)
      .map(booking => ({
        id: booking.id,
        studentName: booking.student.name,
        scheduledAt: booking.scheduledAt,
        rating: booking.review?.rating || null,
        comment: booking.review?.comment || null,
      }));

    // Get upcoming bookings (next 5)
    const upcomingBookings = bookings
      .filter(b => 
        (b.status === "CONFIRMED" || b.status === "PENDING") && 
        new Date(b.scheduledAt) > new Date()
      )
      .slice(0, 5)
      .map(booking => ({
        id: booking.id,
        studentName: booking.student.name,
        scheduledAt: booking.scheduledAt,
        status: booking.status,
      }));

    // Get all students who have had sessions with this tutor
    const allStudents = await prisma.booking.findMany({
      where: { tutorId },
      select: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        status: true,
        scheduledAt: true,
      },
      orderBy: { scheduledAt: "desc" },
    });

    // Create a map of unique students with their latest session info
    const studentsMap = new Map();
    allStudents.forEach(booking => {
      const studentId = booking.student.id;
      if (!studentsMap.has(studentId)) {
        studentsMap.set(studentId, {
          id: studentId,
          name: booking.student.name,
          email: booking.student.email,
          lastSession: booking.scheduledAt,
          totalSessions: 1,
          isOnline: booking.status === "CONFIRMED" && new Date(booking.scheduledAt) > new Date(),
        });
      } else {
        const existing = studentsMap.get(studentId);
        existing.totalSessions += 1;
        if (booking.scheduledAt > existing.lastSession) {
          existing.lastSession = booking.scheduledAt;
          existing.isOnline = booking.status === "CONFIRMED" && new Date(booking.scheduledAt) > new Date();
        }
      }
    });

    const allStudentsList = Array.from(studentsMap.values())
      .sort((a, b) => new Date(b.lastSession).getTime() - new Date(a.lastSession).getTime())
      .slice(0, 10); // Show top 10 most recent students

    // Get recent reviews
    const recentReviews = await prisma.review.findMany({
      where: { tutorId },
      include: {
        student: true,
        booking: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const response = NextResponse.json({
      stats: {
        activeSessions,
        totalStudents,
        pendingBookings,
        totalHours,
        completedSessions,
        totalEarnings,
        balance: currentBalance,
        rating: averageRating,
        payments: totalPayments,
      },
      recentSessions,
      upcomingBookings,
      recentReviews,
      allStudents: allStudentsList,
    });
    
    // Add cache control headers to ensure fresh data
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error("Error fetching tutor dashboard data:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
} 