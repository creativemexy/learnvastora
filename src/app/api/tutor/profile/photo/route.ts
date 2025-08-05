import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || (session.user as any).role !== "TUTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;

  try {
    const formData = await req.formData();
    const file = formData.get('photo') as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: "Invalid file type. Please upload a JPEG, PNG, or WebP image." 
      }, { status: 400 });
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: "File too large. Please upload an image smaller than 5MB." 
      }, { status: 400 });
    }

    // Convert file to base64 for storage
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    // Update user's photo in the database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { photo: dataUrl },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        photo: true,
        isOnline: true,
        lastSeen: true
      }
    });

    return NextResponse.json({ 
      success: true, 
      photoUrl: dataUrl,
      message: "Profile photo updated successfully",
      user: updatedUser
    });

  } catch (error) {
    console.error("Error uploading profile photo:", error);
    return NextResponse.json({ 
      error: "Failed to upload profile photo" 
    }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || (session.user as any).role !== "TUTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;

  try {
    // Remove photo from user profile
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { photo: null },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        photo: true,
        isOnline: true,
        lastSeen: true
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: "Profile photo removed successfully",
      user: updatedUser
    });

  } catch (error) {
    console.error("Error removing profile photo:", error);
    return NextResponse.json({ 
      error: "Failed to remove profile photo" 
    }, { status: 500 });
  }
} 