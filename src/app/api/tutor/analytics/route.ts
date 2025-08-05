import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

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

    // Calculate basic stats
    const totalSessions = bookings.filter(b => b.status === "COMPLETED").length;
    const totalStudents = new Set(bookings.map(b => b.studentId)).size;
    
    // Calculate earnings
    const completedBookings = bookings.filter(b => b.status === "COMPLETED");
    const totalEarnings = completedBookings.reduce((sum, booking) => { return sum + 4000; }, 0); // ₦4,000 per 30-minute session

    // Calculate average rating
    const reviews = await prisma.review.findMany({
      where: { tutorId },
      select: { rating: true }
    });

    const averageRating = reviews.length > 0 
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
      : 0;

    // Calculate completion rate
    const totalBookings = bookings.length;
    const completionRate = totalBookings > 0 ? totalSessions / totalBookings : 0;

    // Calculate response time (average time to respond to booking requests)
    const pendingBookings = bookings.filter(b => b.status === "PENDING");
    const responseTime = pendingBookings.length > 0 ? 15 : 0; // Demo: 15 minutes average

    // Get recent activity (last 5 sessions)
    const recentSessions = completedBookings.slice(0, 5).map(booking => ({
      id: booking.id,
      studentName: booking.student.name,
      scheduledAt: booking.scheduledAt,
      rating: booking.review?.rating || null,
    }));

    // Get earnings by month (last 6 months)
    const earningsByMonth = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthBookings = completedBookings.filter(booking => {
        const bookingDate = new Date(booking.scheduledAt);
        return bookingDate.getMonth() === month.getMonth() && 
               bookingDate.getFullYear() === month.getFullYear();
      });
      
      earningsByMonth.push({
        month: month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        amount: monthBookings.length * 50, // $50 per session
        sessions: monthBookings.length
      });
    }

    // Get top students
    const studentStats = new Map();
    completedBookings.forEach(booking => {
      const studentId = booking.studentId;
      const studentName = booking.student.name;
      
      if (!studentStats.has(studentId)) {
        studentStats.set(studentId, {
          id: studentId,
          name: studentName,
          sessions: 0,
          totalSpent: 0,
          lastSession: booking.scheduledAt
        });
      }
      
      const stats = studentStats.get(studentId);
      stats.sessions += 1;
      stats.totalSpent += 50; // $50 per session
      stats.lastSession = booking.scheduledAt;
    });

    const topStudents = Array.from(studentStats.values())
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 5);

    return NextResponse.json({
      totalSessions,
      totalEarnings,
      averageRating,
      totalStudents,
      completionRate,
      responseTime,
      recentSessions,
      earningsByMonth,
      topStudents,
      // Additional stats for future use
      pendingBookings: bookings.filter(b => b.status === "PENDING").length,
      upcomingBookings: bookings.filter(b => 
        b.status === "CONFIRMED" && new Date(b.scheduledAt) > new Date()
      ).length,
      totalBookings,
      monthlyGrowth: earningsByMonth.length > 1 
        ? ((earningsByMonth[earningsByMonth.length - 1].amount - earningsByMonth[earningsByMonth.length - 2].amount) / earningsByMonth[earningsByMonth.length - 2].amount) * 100
        : 0
    });

  } catch (error) {
    console.error("Error fetching tutor analytics:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
} 