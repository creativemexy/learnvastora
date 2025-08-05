import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { bookingId, rating, comment } = await req.json();

    if (!bookingId || !rating) {
      return NextResponse.json({ error: "Booking ID and rating are required" }, { status: 400 });
    }

    // Verify the booking exists and belongs to the user
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
    if (booking.studentId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if booking is completed
    if (booking.status !== "COMPLETED") {
      return NextResponse.json({ error: "Can only review completed sessions" }, { status: 400 });
    }

    // Check if review already exists
    const existingReview = await prisma.review.findUnique({
      where: { bookingId },
    });

    if (existingReview) {
      return NextResponse.json({ error: "Review already exists for this booking" }, { status: 400 });
    }

    // Create the review
    const review = await prisma.review.create({
      data: {
        bookingId,
        studentId: booking.studentId,
        tutorId: booking.tutorId,
        rating,
        comment: comment || null,
      },
      include: {
        booking: true,
        student: true,
        tutor: true,
      },
    });

    return NextResponse.json(review);
  } catch (error) {
    console.error("Error creating review:", error);
    return NextResponse.json({ error: "Failed to create review" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const bookingId = searchParams.get('bookingId');

    if (bookingId) {
      // Get review for specific booking
      const review = await prisma.review.findUnique({
        where: { bookingId },
        include: {
          student: true,
          tutor: true,
        },
      });
      return NextResponse.json(review);
    }

    // Get all reviews for the user
    const userId = (session.user as any).id;
    const reviews = await prisma.review.findMany({
      where: { studentId: userId },
      include: {
        booking: true,
        tutor: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(reviews);
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }
} 