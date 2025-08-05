import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/prisma';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    console.log('Photo upload request received');
    
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
      console.log('Unauthorized access attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

    console.log('User authenticated:', session.user.email);

  // Parse multipart form data
  const formData = await req.formData();
  const file = formData.get('file');
    
  if (!file || typeof file === 'string') {
      console.log('No file uploaded or invalid file type');
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

    console.log('File received:', file.name, 'Size:', file.size, 'Type:', file.type);

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      console.log('Invalid file type:', file.type);
      return NextResponse.json({ error: 'Invalid file type. Only JPG, PNG, GIF, and WebP are allowed.' }, { status: 400 });
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      console.log('File too large:', file.size);
      return NextResponse.json({ error: 'File too large. Maximum size is 5MB.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    const ext = file.name.split('.').pop()?.toLowerCase();
  const filename = `profile_${Date.now()}.${ext}`;
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    
    console.log('Creating upload directory:', uploadDir);
  await fs.mkdir(uploadDir, { recursive: true });
    
  const filePath = path.join(uploadDir, filename);
    console.log('Saving file to:', filePath);
  await fs.writeFile(filePath, buffer);
    
  const photoUrl = `/uploads/${filename}`;
    console.log('Photo URL generated:', photoUrl);

    // Update the user's profile with the photo URL
    console.log('Updating user profile in database...');
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        photo: photoUrl,
      },
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
    console.log('User profile updated successfully:', updatedUser.id);
    
    console.log('Photo upload completed successfully');
    
    // Return the updated user data for immediate UI update
    return NextResponse.json({ 
      photoUrl,
      user: updatedUser
    });
  } catch (error) {
    console.error('Photo upload error:', error);
    return NextResponse.json({ 
      error: 'Upload failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 