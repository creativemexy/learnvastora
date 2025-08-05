import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { bookingId } = await req.json();
    if (!bookingId) {
      return NextResponse.json({ error: "bookingId required" }, { status: 400 });
    }
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    if (booking.status === "PENDING" && booking.paidAt) {
      const updated = await prisma.booking.update({
        where: { id: bookingId },
        data: { status: "CONFIRMED" },
      });
      return NextResponse.json({ success: true, booking: updated });
    } else {
      return NextResponse.json({ error: "Booking is not eligible for fix (must be PENDING and paidAt set)" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: "Failed to update booking status" }, { status: 500 });
  }
} 