import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;

  try {
    // Create a test notification
    const notification = await prisma.notification.create({
      data: {
        userId,
        type: 'SYSTEM_UPDATE',
        title: 'Test Notification',
        message: 'This is a test notification to demonstrate the notification system.',
        isRead: false,
        data: { test: true, timestamp: new Date().toISOString() }
      }
    });

    return NextResponse.json({ 
      success: true, 
      notification,
      message: 'Test notification created successfully' 
    });
  } catch (error) {
    console.error("Error creating test notification:", error);
    return NextResponse.json({ error: "Failed to create test notification" }, { status: 500 });
  }
} 