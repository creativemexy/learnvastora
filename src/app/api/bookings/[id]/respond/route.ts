import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { action, reason } = await req.json(); // "accept" or "decline"
    const bookingId = params.id;
    const userId = (session.user as any).id;

    // Get the booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        tutor: true,
        student: true
      }
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Verify the user is the tutor for this booking
    if (booking.tutorId !== userId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    if (action === "accept") {
      // Update booking status to confirmed
      await prisma.booking.update({
        where: { id: bookingId },
        data: { 
          status: "CONFIRMED"
        }
      });

      // Create payment record if instant booking
      if (booking.isInstant) {
        await prisma.payment.create({
          data: {
            userId: booking.studentId,
            bookingId: booking.id,
            amount: 10.00, // Default instant booking price
            status: "PAID"
          }
        });
      }

      // Create notification for student
      await prisma.notification.create({
        data: {
          userId: booking.studentId,
          type: "INSTANT_BOOKING_ACCEPTED",
          title: "Booking Accepted",
          message: `${booking.tutor.name} has accepted your booking request.`,
          data: {
            bookingId: booking.id,
            tutorName: booking.tutor.name,
            scheduledAt: booking.scheduledAt.toISOString()
          }
        }
      });

      return NextResponse.json({
        success: true,
        message: "Booking accepted successfully",
        booking: {
          id: booking.id,
          status: "CONFIRMED",
          scheduledAt: booking.scheduledAt.toISOString()
        }
      });

    } else if (action === "decline") {
      // Update booking status to cancelled
      await prisma.booking.update({
        where: { id: bookingId },
        data: { 
          status: "CANCELLED"
        }
      });

      // Create notification for student
      await prisma.notification.create({
        data: {
          userId: booking.studentId,
          type: "SESSION_CANCELLED",
          title: "Booking Declined",
          message: `${booking.tutor.name} has declined your booking request${reason ? `: ${reason}` : ''}.`,
          data: {
            bookingId: booking.id,
            tutorName: booking.tutor.name,
            reason: reason || null
          }
        }
      });

      return NextResponse.json({
        success: true,
        message: "Booking declined successfully",
        booking: {
          id: booking.id,
          status: "CANCELLED"
        }
      });

    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

  } catch (error) {
    console.error("Booking response error:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Failed to respond to booking" 
    }, { status: 500 });
  }
} 