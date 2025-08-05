import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { isOnline } = await req.json();

    // Update user's online status and last seen
    await prisma.user.update({
      where: { id: (session.user as any).id },
      data: {
        isOnline,
        lastSeen: new Date()
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: `Status updated to ${isOnline ? 'online' : 'offline'}` 
    });

  } catch (error) {
    console.error("Error updating online status:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Failed to update online status" 
    }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      select: {
        isOnline: true,
        lastSeen: true
      }
    });

    return NextResponse.json(user);

  } catch (error) {
    console.error("Error fetching online status:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Failed to fetch online status" 
    }, { status: 500 });
  }
} 