import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  let allowAutoFix = false;
  let userId = null;
  if (session && session.user) {
    userId = (session.user as any).id;
  }

  try {
    const { status } = await req.json();
    const bookingId = params.id;
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { student: true, tutor: true },
    });
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    // Allow auto-fix: if status is CONFIRMED, booking is PENDING, and paidAt is set
    if (
      status === "CONFIRMED" &&
      booking.status === "PENDING" &&
      booking.paidAt
    ) {
      allowAutoFix = true;
    }
    // Normal auth: only participant can update
    if (!allowAutoFix && booking.studentId !== userId && booking.tutorId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Update the booking status
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: { status },
      include: { student: true, tutor: true },
    });
    return NextResponse.json(updatedBooking);
  } catch (error) {
    console.error("Error updating booking status:", error);
    return NextResponse.json(
      { error: "Failed to update booking status" },
      { status: 500 }
    );
  }
} 