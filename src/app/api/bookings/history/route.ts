import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch all bookings for the current user (as student)
    const bookings = await prisma.booking.findMany({
      where: {
        studentId: user.id
      },
      include: {
        tutor: {
          include: {
            tutorProfile: true
          }
        }
      },
      orderBy: {
        scheduledAt: "desc"
      }
    });

    // Transform the data for the frontend
    const transformedBookings = bookings.map(booking => ({
      id: booking.id,
      scheduledAt: booking.scheduledAt.toISOString(),
      status: booking.status,
      createdAt: booking.createdAt.toISOString(),
      tutor: {
        name: booking.tutor.name,
        email: booking.tutor.email,
        tutorProfile: booking.tutor.tutorProfile ? {
          bio: booking.tutor.tutorProfile.bio,
          skills: booking.tutor.tutorProfile.skills
        } : null
      },
      paymentMethod: booking.paymentMethod,
      paymentReference: booking.paymentReference,
      paidAt: booking.paidAt?.toISOString()
    }));

    return NextResponse.json(transformedBookings);

  } catch (error) {
    console.error("Error fetching booking history:", error);
    return NextResponse.json({ error: "Failed to fetch booking history" }, { status: 500 });
  }
} 