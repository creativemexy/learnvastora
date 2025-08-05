import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/pages/api/auth/[...nextauth]"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const bookingId = params.id
    const userId = (session.user as any).id

    // Get the booking and verify user is participant
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { student: true, tutor: true }
    })

    if (!booking) {
      return NextResponse.json({ message: "Booking not found" }, { status: 404 })
    }

    // Check if user is the student or tutor
    if (booking.studentId !== userId && booking.tutorId !== userId) {
      return NextResponse.json({ message: "Not authorized to join this session" }, { status: 403 })
    }

    // Check if session is available (only allow paid and confirmed sessions)
    const allowedStatuses = ["CONFIRMED", "IN_PROGRESS", "PAID"]
    if (!allowedStatuses.includes(booking.status)) {
      return NextResponse.json({ 
        message: `Session not available. Current status: ${booking.status}` 
      }, { status: 400 })
    }
    
    // Check if payment is required and not completed
    if (!booking.paidAt) {
      return NextResponse.json({ 
        message: "Payment required before starting session. Please complete payment first." 
      }, { status: 400 })
    }

    // Check if session is scheduled for now (within 30 minutes of start time)
    const now = new Date()
    const startTime = new Date(booking.scheduledAt)
    const timeDiff = Math.abs(now.getTime() - startTime.getTime()) / (1000 * 60) // minutes

    // Allow joining if within 30 minutes of scheduled time or if it's an instant booking
    if (timeDiff > 30 && !booking.isInstant) {
      return NextResponse.json({ 
        message: `Session is not ready to start yet. Scheduled for: ${startTime.toLocaleString()}` 
      }, { status: 400 })
    }

    // Generate unique room ID
    const roomId = `room_${bookingId}_${Date.now()}`

    // Update booking status to IN_PROGRESS if it's not already
    if (booking.status !== "IN_PROGRESS") {
      await prisma.booking.update({
        where: { id: bookingId },
        data: { 
          status: "IN_PROGRESS"
        }
      })
    }

    // Create session recording entry for tracking
    await prisma.sessionRecording.create({
      data: {
        sessionId: bookingId,
        userId: userId,
        url: `https://meet.jit.si/${roomId}`,
        fileName: `session_${bookingId}_${Date.now()}.mp4`
      }
    })

    // Determine user role in the session
    const userRole = booking.studentId === userId ? "student" : "tutor"

    return NextResponse.json({ 
      roomId,
      booking: booking,
      userRole,
      sessionUrl: `https://meet.jit.si/${roomId}`,
      startTime: booking.scheduledAt.toISOString(),
      isInstant: booking.isInstant,
      status: booking.status
    })

  } catch (error) {
    console.error("Join session error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
} 