import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { tutorId: string } }
) {
  try {
    const { tutorId } = params;
    console.log("Fetching tutor with ID:", tutorId);

    const tutor = await prisma.user.findFirst({
      where: {
        id: tutorId,
        role: "TUTOR",
        active: true
      },
      include: {
        tutorProfile: true
      }
    });

    console.log("Tutor found:", !!tutor);

    if (!tutor) {
      console.log("Tutor not found");
      return NextResponse.json({ error: "Tutor not found" }, { status: 404 });
    }

    console.log("Preparing response data");
    
    const responseData = {
      id: tutor.id,
      name: tutor.name,
      email: tutor.email,
      photo: tutor.photo,
      isOnline: tutor.isOnline,
      lastSeen: tutor.lastSeen,
      tutorProfile: tutor.tutorProfile,
      reviews: [] // Empty array since reviews relation doesn't exist
    };

    console.log("Response data prepared successfully");
    return NextResponse.json(responseData);

  } catch (error) {
    console.error("Detailed error fetching tutor:", error);
    if (error instanceof Error) {
      console.error("Error stack:", error.stack);
    }
    return NextResponse.json(
      { error: "Failed to fetch tutor" }, 
      { status: 500 }
    );
  }
} 