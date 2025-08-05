import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

function isPlainObject(val: any): val is Record<string, any> {
  return val !== null && typeof val === "object" && !Array.isArray(val);
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      include: { tutorProfile: true }
    });

    if (!user || user.role !== "TUTOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Safely parse availability if it's a string
    let availability = user.tutorProfile?.availability || {};
    if (typeof availability === "string") {
      try {
        availability = JSON.parse(availability);
      } catch {
        availability = {};
      }
    }
    if (!isPlainObject(availability)) {
      availability = {};
    }

    // Return payment settings (stored in tutorProfile for now)
    return NextResponse.json({
      paypalEmail: (availability as any).paypalEmail || "",
      paystackEmail: (availability as any).paystackEmail || "",
      flutterwaveEmail: (availability as any).flutterwaveEmail || "",
      preferredMethod: (availability as any).preferredMethod || "paypal"
    });

  } catch (error) {
    console.error("Error fetching payment settings:", error);
    return NextResponse.json({ error: "Failed to fetch payment settings" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { paypalEmail, paystackEmail, flutterwaveEmail, preferredMethod } = await req.json();

    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      include: { tutorProfile: true }
    });

    if (!user || user.role !== "TUTOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Update or create tutor profile with payment settings
    let currentAvailability = user.tutorProfile?.availability || {};
    if (typeof currentAvailability === "string") {
      try {
        currentAvailability = JSON.parse(currentAvailability);
      } catch {
        currentAvailability = {};
      }
    }
    if (!isPlainObject(currentAvailability)) {
      currentAvailability = {};
    }
    const updatedAvailability = {
      ...currentAvailability,
      paypalEmail,
      paystackEmail,
      flutterwaveEmail,
      preferredMethod
    };

    if (user.tutorProfile) {
      await prisma.tutorProfile.update({
        where: { userId: user.id },
        data: { availability: updatedAvailability }
      });
    } else {
      await prisma.tutorProfile.create({
        data: {
          userId: user.id,
          availability: updatedAvailability
        }
      });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Error updating payment settings:", error);
    return NextResponse.json({ error: "Failed to update payment settings" }, { status: 500 });
  }
} 