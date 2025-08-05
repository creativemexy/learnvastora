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

    // Get booking with related data
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        tutor: {
          select: {
            id: true,
            name: true,
            email: true,
            tutorProfile: true
          }
        },
        review: true,
        payment: true,
        messages: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: "asc" }
        },
        sessionRecordings: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: "desc" }
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

    return NextResponse.json(booking);

  } catch (error) {
    console.error("Error fetching booking:", error);
    return NextResponse.json({ error: "Failed to fetch booking" }, { status: 500 });
  }
}

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
    const userId = (session.user as any).id;
    const { status, scheduledAt, notes } = await req.json();

    // Get booking to check authorization
    const existingBooking = await prisma.booking.findUnique({
      where: { id: bookingId }
    });

    if (!existingBooking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Only tutor can update booking
    if (existingBooking.tutorId !== userId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Update booking
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        ...(status && { status }),
        ...(scheduledAt && { scheduledAt: new Date(scheduledAt) }),
        ...(notes && { notes })
      },
      include: {
        student: true,
        tutor: true
      }
    });

    return NextResponse.json(updatedBooking);

  } catch (error) {
    console.error("Error updating booking:", error);
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
  }
} 