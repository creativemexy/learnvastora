import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const tutors = await prisma.user.findMany({
      where: { role: "TUTOR" },
      include: { 
        tutorProfile: true, 
        reviewsReceived: { 
          include: { student: true }, 
          orderBy: { createdAt: "desc" } 
        } 
      },
    });

    // Transform the data to match the frontend interface
    const transformedTutors = tutors.map(tutor => ({
      id: tutor.id,
      name: tutor.name,
      email: tutor.email,
      photo: tutor.photo, // Include profile photo
      isOnline: tutor.isOnline || false,
      lastSeen: tutor.lastSeen?.toISOString() || new Date().toISOString(),
      tutorProfile: {
        bio: tutor.tutorProfile?.bio || "",
        languages: tutor.tutorProfile?.languages || [],
        skills: tutor.tutorProfile?.skills || [],
        experience: tutor.tutorProfile?.experience || 0,
        education: tutor.tutorProfile?.education || "",
        hourlyRate: tutor.tutorProfile?.hourlyRate || 0,
        instantBookingEnabled: tutor.tutorProfile?.instantBookingEnabled || false,
        instantBookingPrice: tutor.tutorProfile?.instantBookingPrice || 0,
        accent: tutor.tutorProfile?.accent || "USA Accent",
        isPro: tutor.tutorProfile?.isPro || false,
        isSupertutor: tutor.tutorProfile?.isSupertutor || false,
      },
      reviews: tutor.reviewsReceived?.map(review => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt.toISOString(),
      })) || [],
    }));

    return NextResponse.json(transformedTutors);
  } catch (error) {
    console.error("Error fetching tutors:", error);
    return NextResponse.json({ error: "Failed to fetch tutors" }, { status: 500 });
  }
} 