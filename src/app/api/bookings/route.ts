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
        photo: booking.tutor.photo, // Include tutor's photo
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
    console.error("Error fetching bookings:", error);
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { tutorId, scheduledAt, duration = 60, paymentMethod = "PAYSTACK" } = await req.json();
    
    console.log("Creating booking with data:", { tutorId, scheduledAt, duration, paymentMethod });

    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id }
    });

    if (!user) {
      console.log("User not found:", (session.user as any).id);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log("User found:", user.id);

    // Verify tutor exists
    const tutor = await prisma.user.findUnique({
      where: { id: tutorId, role: "TUTOR" }
    });

    if (!tutor) {
      console.log("Tutor not found:", tutorId);
      return NextResponse.json({ error: "Tutor not found" }, { status: 404 });
    }

    console.log("Tutor found:", tutor.id);

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        studentId: user.id,
        tutorId: tutorId,
        scheduledAt: new Date(scheduledAt),
        duration: duration,
        paymentMethod: paymentMethod,
        status: "PENDING"
      }
    });

    console.log("Booking created successfully:", booking.id);

    // Fetch the created booking with tutor details
    const bookingWithTutor = await prisma.booking.findUnique({
      where: { id: booking.id },
      include: {
        tutor: {
          include: {
            tutorProfile: true
          }
        }
      }
    });

    console.log("Booking with tutor details fetched");

    return NextResponse.json({
      success: true,
      booking: {
        id: bookingWithTutor!.id,
        scheduledAt: bookingWithTutor!.scheduledAt.toISOString(),
        duration: bookingWithTutor!.duration,
        status: bookingWithTutor!.status,
        createdAt: bookingWithTutor!.createdAt.toISOString(),
        tutor: {
          name: bookingWithTutor!.tutor.name,
          email: bookingWithTutor!.tutor.email,
          tutorProfile: bookingWithTutor!.tutor.tutorProfile ? {
            bio: bookingWithTutor!.tutor.tutorProfile.bio,
            skills: bookingWithTutor!.tutor.tutorProfile.skills
          } : null
        }
      }
    });

  } catch (error) {
    console.error("Detailed error creating booking:", error);
    if (error instanceof Error) {
      console.error("Error stack:", error.stack);
    }
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
} 