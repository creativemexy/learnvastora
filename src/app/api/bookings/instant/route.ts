import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { tutorId, paymentMethod } = await req.json();

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get tutor and verify they're online and available for instant booking
    const tutor = await prisma.user.findFirst({
      where: {
        id: tutorId,
        role: "TUTOR",
        active: true,
        isOnline: true,
        tutorProfile: {
          instantBookingEnabled: true
        }
      },
      include: {
        tutorProfile: true
      }
    });

    if (!tutor) {
      return NextResponse.json({ error: "Tutor not available for instant booking" }, { status: 404 });
    }

    // Check if tutor is available right now
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5);

    const availability = await prisma.availability.findFirst({
      where: {
        userId: tutorId,
        dayOfWeek: currentDay,
        isActive: true,
        startTime: { lte: currentTime },
        endTime: { gte: currentTime }
      }
    });

    if (!availability) {
      return NextResponse.json({ error: "Tutor not available at this time" }, { status: 400 });
    }

    // Check if tutor has any conflicting bookings in the next hour
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        tutorId,
        scheduledAt: {
          gte: now,
          lte: oneHourFromNow
        },
        status: {
          in: ["PENDING", "CONFIRMED", "IN_PROGRESS"]
        }
      }
    });

    if (conflictingBooking) {
      return NextResponse.json({ error: "Tutor has a conflicting booking" }, { status: 400 });
    }

    // Create instant booking (scheduled for 5 minutes from now)
    const scheduledAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now
    
    const booking = await prisma.booking.create({
      data: {
        studentId: user.id,
        tutorId: tutor.id,
        scheduledAt,
        status: "PENDING", // Require payment before confirmation
        isInstant: true,
        paymentMethod: paymentMethod || "PAYSTACK"
      },
      include: {
        tutor: true,
        student: true
      }
    });

    // Create payment record (pending until payment is completed)
    await prisma.payment.create({
      data: {
        userId: user.id,
        bookingId: booking.id,
        amount: tutor.tutorProfile?.instantBookingPrice || 10.00,
        status: "PENDING" // Payment pending until completed
      }
    });

    // Create notification for tutor
    await prisma.notification.create({
      data: {
        userId: tutor.id,
        type: "INSTANT_BOOKING_REQUEST",
        title: "New Instant Session",
        message: `${user.name} has booked an instant session with you starting in 5 minutes.`,
        data: {
          bookingId: booking.id,
          studentName: user.name,
          scheduledAt: scheduledAt.toISOString()
        }
      }
    });

    // Create notification for student
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: "INSTANT_BOOKING_ACCEPTED",
        title: "Instant Session Confirmed",
        message: `Your instant session with ${tutor.name} has been confirmed and will start in 5 minutes.`,
        data: {
          bookingId: booking.id,
          tutorName: tutor.name,
          scheduledAt: scheduledAt.toISOString()
        }
      }
    });

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        scheduledAt: booking.scheduledAt.toISOString(),
        tutor: {
          name: booking.tutor.name,
          email: booking.tutor.email
        },
        student: {
          name: booking.student.name,
          email: booking.student.email
        },
        isInstant: booking.isInstant,
        status: booking.status
      }
    });

  } catch (error) {
    console.error("Instant booking error:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Failed to create instant booking" 
    }, { status: 500 });
  }
} 