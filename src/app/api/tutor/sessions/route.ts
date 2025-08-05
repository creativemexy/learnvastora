import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { BookingStatus } from "@prisma/client";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || (session.user as any).role !== "TUTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const tutorId = (session.user as any).id;

  try {
    const bookings = await prisma.booking.findMany({
      where: { tutorId },
      include: {
        student: true,
      },
      orderBy: { scheduledAt: "desc" },
    });

    const sessions = bookings.map((booking) => {
      // Map booking status to session status
      let sessionStatus: 'upcoming' | 'completed' | 'cancelled';
      switch (booking.status) {
        case BookingStatus.PENDING:
        case BookingStatus.CONFIRMED:
        case BookingStatus.IN_PROGRESS:
          sessionStatus = 'upcoming';
          break;
        case BookingStatus.COMPLETED:
          sessionStatus = 'completed';
          break;
        case BookingStatus.CANCELLED:
          sessionStatus = 'cancelled';
          break;
        default:
          sessionStatus = 'upcoming';
      }

      return {
        id: booking.id,
        studentName: booking.student?.name || "Unknown Student",
        date: booking.scheduledAt.toISOString().split('T')[0],
        time: booking.scheduledAt.toTimeString().split(' ')[0].substring(0, 5),
        duration: 60, // Default duration, you can add this field to your booking model
        status: sessionStatus,
        subject: "Language Session", // You can add subject field to your booking model
        bookingStatus: booking.status,
        scheduledAt: booking.scheduledAt,
        isInstant: booking.isInstant,
      };
    });

    const upcomingSessions = sessions.filter(s => s.status === 'upcoming');
    const completedSessions = sessions.filter(s => s.status === 'completed');

    return NextResponse.json({
      upcomingSessions,
      completedSessions,
    });
  } catch (error) {
    console.error("Error fetching tutor sessions:", error);
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }
} 