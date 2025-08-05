import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const bookingId = params.id;
    const { newScheduledAt, reason } = await req.json();

    if (!newScheduledAt) {
      return NextResponse.json({ error: "New scheduled time is required" }, { status: 400 });
    }

    // Get the booking and verify the tutor is the owner
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        student: true,
        tutor: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const userId = (session.user as any).id;
    if (booking.tutorId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if booking can be rescheduled (not completed or cancelled)
    if (booking.status === "COMPLETED" || booking.status === "CANCELLED") {
      return NextResponse.json({ 
        error: "Cannot reschedule completed or cancelled sessions" 
      }, { status: 400 });
    }

    // Check if new time is in the future
    const newTime = new Date(newScheduledAt);
    const now = new Date();
    if (newTime <= now) {
      return NextResponse.json({ 
        error: "New scheduled time must be in the future" 
      }, { status: 400 });
    }

    // Check for conflicts with other bookings
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        tutorId: userId,
        id: { not: bookingId },
        scheduledAt: {
          gte: new Date(newTime.getTime() - 60 * 60 * 1000), // 1 hour before
          lte: new Date(newTime.getTime() + 60 * 60 * 1000), // 1 hour after
        },
        status: {
          in: ["PENDING", "CONFIRMED", "IN_PROGRESS"]
        }
      }
    });

    if (conflictingBooking) {
      return NextResponse.json({ 
        error: "You have a conflicting booking at this time" 
      }, { status: 400 });
    }

    // Update the booking
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        scheduledAt: newTime,
        status: "PENDING", // Reset to pending for student confirmation
      },
      include: {
        student: true,
        tutor: true,
      }
    });

    // Create notification for student
    await prisma.notification.create({
      data: {
        userId: booking.studentId,
        type: "SYSTEM_UPDATE",
        title: "Session Rescheduled",
        message: `${booking.tutor.name} has rescheduled your session to ${newTime.toLocaleDateString()} at ${newTime.toLocaleTimeString()}.`,
        data: {
          bookingId: bookingId,
          tutorName: booking.tutor.name,
          oldScheduledAt: booking.scheduledAt.toISOString(),
          newScheduledAt: newTime.toISOString(),
          reason: reason || "Tutor requested reschedule"
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: "Session rescheduled successfully",
      booking: {
        id: updatedBooking.id,
        scheduledAt: updatedBooking.scheduledAt.toISOString(),
        status: updatedBooking.status,
        student: updatedBooking.student,
        tutor: updatedBooking.tutor
      }
    });

  } catch (error) {
    console.error("Error rescheduling session:", error);
    return NextResponse.json(
      { error: "Failed to reschedule session" },
      { status: 500 }
    );
  }
} 