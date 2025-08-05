
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || (session.user as any).role !== "TUTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const tutorId = (session.user as any).id;
  const bookingId = params.id;

  try {
    // Check if booking exists and belongs to this tutor
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        tutorId: tutorId
      },
      include: {
        student: true
      }
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Check if booking can be cancelled
    if (booking.status === "COMPLETED" || booking.status === "CANCELLED") {
      return NextResponse.json({ 
        error: "Cannot cancel completed or already cancelled booking" 
      }, { status: 400 });
    }

    // Update booking status to cancelled
    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED" }
    });

    // Create notification for student
    await prisma.notification.create({
      data: {
        userId: booking.studentId,
        type: "SESSION_CANCELLED",
        title: "Session Cancelled",
        message: `Your session with ${(session.user as any).name} has been cancelled.`,
        data: {
          bookingId: bookingId,
          tutorName: (session.user as any).name
        }
      }
    });

    return NextResponse.json({ 
      success: true,
      message: "Booking cancelled successfully"
    });

  } catch (error) {
    console.error("Error cancelling booking:", error);
    return NextResponse.json({ 
      error: "Failed to cancel booking" 
    }, { status: 500 });
  }
} 