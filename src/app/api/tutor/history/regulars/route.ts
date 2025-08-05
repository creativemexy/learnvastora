import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || (session.user as any).role !== "TUTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tutorId = (session.user as any).id;

  // Find students with the most completed sessions with this tutor
  const bookings = await prisma.booking.findMany({
    where: { tutorId, status: "COMPLETED" },
    include: { student: true },
  });
  const freq: { [key: string]: any } = {};
  for (const b of bookings) {
    if (!b.student) continue;
    if (!freq[b.student.id]) freq[b.student.id] = { ...b.student, count: 0 };
    freq[b.student.id].count++;
  }
  const regulars = Object.values(freq)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map(s => ({
      id: s.id,
      name: s.name,
      avatar: s.photo || "/avatar.png",
      count: s.count,
    }));
    
  const response = NextResponse.json(regulars);
  
  // Add cache control headers to ensure fresh data
  response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  
  return response;
} 