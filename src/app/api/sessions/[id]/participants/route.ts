import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const bookingId = params.id;
    const userId = (session.user as any).id;

    // Get booking with participant data
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        tutor: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            tutorProfile: true
          }
        }
      }
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Check if user is authorized to view this booking
    if (booking.studentId !== userId && booking.tutorId !== userId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Format participants with enriched data
    const participants = [
      {
        id: booking.student.id,
        name: booking.student.name,
        email: booking.student.email,
        role: booking.student.role,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(booking.student.name)}&background=random`,
        isStudent: true,
        isTutor: false
      },
      {
        id: booking.tutor.id,
        name: booking.tutor.name,
        email: booking.tutor.email,
        role: booking.tutor.role,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(booking.tutor.name)}&background=random`,
        isStudent: false,
        isTutor: true,
        tutorProfile: booking.tutor.tutorProfile
      }
    ];

    return NextResponse.json({ participants });

  } catch (error) {
    console.error("Error fetching participants:", error);
    return NextResponse.json({ error: "Failed to fetch participants" }, { status: 500 });
  }
} 