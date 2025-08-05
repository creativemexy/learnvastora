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
    // Get tutor's current availability from their profile
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId: tutorId },
      select: { availability: true }
    });

    // Get upcoming bookings to show conflicts
    const upcomingBookings = await prisma.booking.findMany({
      where: { 
        tutorId,
        status: { in: ['PENDING', 'CONFIRMED'] }
      },
      include: {
        student: true,
      },
      orderBy: { scheduledAt: "asc" },
    });

    return NextResponse.json({
      availability: tutorProfile?.availability || "",
      upcomingBookings,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      }
    });
  } catch (error) {
    console.error("Error fetching tutor schedule:", error);
    return NextResponse.json({ error: "Failed to fetch schedule" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || (session.user as any).role !== "TUTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const tutorId = (session.user as any).id;
  const { availability } = await req.json();

  if (!availability) {
    return NextResponse.json({ error: "Availability is required" }, { status: 400 });
  }

  try {
    await prisma.tutorProfile.upsert({
      where: { userId: tutorId },
      update: { availability },
      create: { userId: tutorId, availability },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating tutor schedule:", error);
    return NextResponse.json({ error: "Failed to update schedule" }, { status: 500 });
  }
} 