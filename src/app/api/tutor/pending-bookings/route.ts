import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = (session.user as any).id;

    // Get pending bookings for this tutor
    const pendingBookings = await prisma.booking.findMany({
      where: {
        tutorId: userId,
        status: "PENDING",
        isInstant: true
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return NextResponse.json(pendingBookings);

  } catch (error) {
    console.error("Error fetching pending bookings:", error);
    return NextResponse.json({ 
      error: "Failed to fetch pending bookings" 
    }, { status: 500 });
  }
} 