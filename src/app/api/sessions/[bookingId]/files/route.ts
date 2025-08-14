import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const maxSize = 50 * 1024 * 1024; // 50MB
const allowedTypes = [
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  // Documents
  'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv',
  // Videos
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
  // Audio
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4',
  // Archives
  'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'
];

export async function POST(
  req: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bookingId = params.bookingId;
    const userId = (session.user as any).id;

    // Check if user is part of this booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        student: true,
        tutor: true
      }
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check if user is the student or tutor for this booking
    if (booking.studentId !== userId && booking.tutorId !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const description = formData.get('description') as string || '';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'File type not allowed. Please upload a supported file type.' 
      }, { status: 400 });
    }

    // Validate file size
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB.` 
      }, { status: 400 });
    }

    // Create upload directory
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'sessions', bookingId);
    await mkdir(uploadDir, { recursive: true });

    // Generate unique filename
    const timestamp = Date.now();
    const originalName = file.name;
    const ext = path.extname(originalName);
    const filename = `${timestamp}_${Math.random().toString(36).substring(2)}${ext}`;
    const filePath = path.join(uploadDir, filename);

    // Save file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    await writeFile(filePath, buffer);

    // Create file record in database
    const fileRecord = await prisma.sessionFile.create({
      data: {
        bookingId,
        uploadedBy: userId,
        originalName,
        filename,
        filePath: `/uploads/sessions/${bookingId}/${filename}`,
        fileSize: file.size,
        mimeType: file.type,
        description,
        uploadedAt: new Date()
      },
      include: {
        uploadedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      file: {
        id: fileRecord.id,
        originalName: fileRecord.originalName,
        filename: fileRecord.filename,
        filePath: fileRecord.filePath,
        fileSize: fileRecord.fileSize,
        mimeType: fileRecord.mimeType,
        description: fileRecord.description,
        uploadedAt: fileRecord.uploadedAt,
        uploadedBy: fileRecord.uploadedByUser
      }
    });

  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json({ 
      error: 'Failed to upload file',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bookingId = params.bookingId;
    const userId = (session.user as any).id;

    // Check if user is part of this booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { studentId: true, tutorId: true }
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.studentId !== userId && booking.tutorId !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get files for this session
    const files = await prisma.sessionFile.findMany({
      where: { bookingId },
      include: {
        uploadedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { uploadedAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      files: files.map((file) => ({
        id: file.id,
        originalName: file.originalName,
        filename: file.filename,
        filePath: file.filePath,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
        description: file.description,
        uploadedAt: file.uploadedAt,
        uploadedBy: file.uploadedByUser
      }))
    });

  } catch (error) {
    console.error('File list error:', error);
    return NextResponse.json({ 
      error: 'Failed to get files',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
