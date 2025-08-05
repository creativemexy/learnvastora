import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export async function GET(
  req: Request,
  { params }: { params: { tutorId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tutorId } = params;

    // Get tutor's availability
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId: tutorId },
      select: { 
        availability: true,
        hourlyRate: true,
        instantBookingEnabled: true,
        instantBookingPrice: true
      }
    });

    if (!tutorProfile) {
      return NextResponse.json({ error: "Tutor not found" }, { status: 404 });
    }

    // Get upcoming bookings to show conflicts
    const upcomingBookings = await prisma.booking.findMany({
      where: { 
        tutorId,
        status: { in: ['PENDING', 'CONFIRMED'] }
      },
      select: {
        id: true,
        scheduledAt: true,
        duration: true,
        status: true
      },
      orderBy: { scheduledAt: "asc" },
    });

    // Get tutor's availability slots
    const availabilitySlots = await prisma.availability.findMany({
      where: { 
        userId: tutorId,
        isActive: true
      },
      select: {
        id: true,
        dayOfWeek: true,
        startTime: true,
        endTime: true,
        isActive: true
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' }
      ]
    });

    return NextResponse.json({
      success: true,
      data: {
        availability: tutorProfile.availability,
        hourlyRate: tutorProfile.hourlyRate,
        instantBookingEnabled: tutorProfile.instantBookingEnabled,
        instantBookingPrice: tutorProfile.instantBookingPrice,
        availabilitySlots,
        upcomingBookings
      }
    });

  } catch (error) {
    console.error("Error fetching tutor availability:", error);
    return NextResponse.json(
      { error: "Failed to fetch tutor availability" }, 
      { status: 500 }
    );
  }
} 