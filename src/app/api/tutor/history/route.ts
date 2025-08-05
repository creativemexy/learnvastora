import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || (session.user as any).role !== "TUTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tutorId = (session.user as any).id;
  const { searchParams } = new URL(req.url);
  const tab = searchParams.get("tab") || "private";
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = 10;

  // Filter bookings by type
  let where: any = { tutorId };
  // Remove type filtering since Booking model doesn't have a type field
  if (search) {
    where.student = {
        name: { contains: search, mode: "insensitive" },
    };
  }

  const [total, bookings] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where,
      include: { student: true },
      orderBy: { scheduledAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const calls = bookings.map(b => ({
    id: b.id,
    date: b.scheduledAt.toISOString().split("T")[0],
    duration: b.duration || "30 min",
    name: b.student?.name || "Unknown Student",
    avatar: b.student?.photo || "/avatar.png",
  }));

  const response = NextResponse.json({ calls, totalPages: Math.ceil(total / pageSize) });
  
  // Add cache control headers to ensure fresh data
  response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  
  return response;
} 