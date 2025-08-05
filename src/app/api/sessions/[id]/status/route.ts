import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/pages/api/auth/[...nextauth]"

export async function GET(
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

    // Get the booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { student: true, tutor: true }
    })

    if (!booking) {
      return NextResponse.json({ 
        available: false,
        message: "Booking not found",
        bookingId 
      })
    }

    // Check if user is the student or tutor
    if (booking.studentId !== userId && booking.tutorId !== userId) {
      return NextResponse.json({ 
        available: false,
        message: "Not authorized to access this session",
        bookingId,
        userId,
        studentId: booking.studentId,
        tutorId: booking.tutorId
      })
    }

    // Check if session is available
    const allowedStatuses = ["CONFIRMED", "IN_PROGRESS", "PAID", "PENDING"]
    const isAvailable = allowedStatuses.includes(booking.status)

    // Check time constraints (allow 30 minutes before/after scheduled time)
    const now = new Date()
    const startTime = new Date(booking.scheduledAt)
    const timeDiff = Math.abs(now.getTime() - startTime.getTime()) / (1000 * 60) // minutes
    const isWithinTimeWindow = timeDiff <= 30

    return NextResponse.json({ 
      available: isAvailable && isWithinTimeWindow,
      booking: {
        id: booking.id,
        status: booking.status,
        scheduledAt: booking.scheduledAt,
        studentId: booking.studentId,
        tutorId: booking.tutorId
      },
      user: {
        id: userId,
        role: booking.studentId === userId ? "student" : "tutor"
      },
      timeInfo: {
        now: now.toISOString(),
        startTime: startTime.toISOString(),
        timeDiffMinutes: timeDiff,
        isWithinTimeWindow
      },
      message: isAvailable && isWithinTimeWindow 
        ? "Session is available" 
        : `Session not available. Status: ${booking.status}, Time diff: ${timeDiff.toFixed(1)} minutes`
    })

  } catch (error) {
    console.error("Session status error:", error)
    return NextResponse.json({ 
      available: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
} 