import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tutorIds = searchParams.get('tutorIds'); // Comma-separated tutor IDs

    if (!tutorIds) {
      return NextResponse.json({ error: "Tutor IDs required" }, { status: 400 });
    }

    const tutorIdArray = tutorIds.split(',').map(id => id.trim());

    // Get current time for availability check
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5);

    // Fetch online status for specified tutors
    const tutors = await prisma.user.findMany({
      where: {
        id: { in: tutorIdArray },
        role: "TUTOR",
        active: true
      },
      include: {
        tutorProfile: true,
        availability: {
          where: {
            dayOfWeek: currentDay,
            isActive: true,
            startTime: { lte: currentTime },
            endTime: { gte: currentTime }
          }
        }
      }
    });

    // Transform the data
    const onlineStatus = tutors.map(tutor => ({
      id: tutor.id,
      name: tutor.name,
      isOnline: tutor.isOnline,
      lastSeen: tutor.lastSeen,
      isAvailableForInstant: tutor.isOnline && 
                            tutor.tutorProfile?.instantBookingEnabled && 
                            tutor.availability.length > 0,
      instantBookingPrice: tutor.tutorProfile?.instantBookingPrice || 10.00,
      responseTime: tutor.tutorProfile?.responseTime || 5,
      currentAvailability: tutor.availability
    }));

    return NextResponse.json({
      tutors: onlineStatus,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error fetching online status:", error);
    return NextResponse.json({ error: "Failed to fetch online status" }, { status: 500 });
  }
} 