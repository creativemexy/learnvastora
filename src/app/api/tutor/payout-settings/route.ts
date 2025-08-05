import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/prisma";

function isPlainObject(val: any): val is Record<string, any> {
  return val !== null && typeof val === "object" && !Array.isArray(val);
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      include: { tutorProfile: true }
    });

    if (!user || user.role !== "TUTOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse payout settings from tutorProfile
    let payoutSettings = {};
    if (user.tutorProfile?.payoutSettings) {
      try {
        payoutSettings = typeof user.tutorProfile.payoutSettings === "string" 
          ? JSON.parse(user.tutorProfile.payoutSettings) 
          : user.tutorProfile.payoutSettings;
      } catch {
        payoutSettings = {};
      }
    }

    if (!isPlainObject(payoutSettings)) {
      payoutSettings = {};
    }

    const settings = payoutSettings as any;
    
    return NextResponse.json({
      payoutMethod: settings.payoutMethod || "bank",
      bankDetails: settings.bankDetails || {
        accountName: "",
        accountNumber: "",
        routingNumber: "",
        bankName: ""
      },
      paypalEmail: settings.paypalEmail || "",
      payoutSchedule: settings.payoutSchedule || "weekly",
      minPayoutAmount: settings.minPayoutAmount || 50
    });

  } catch (error) {
    console.error("Error fetching payout settings:", error);
    return NextResponse.json({ error: "Failed to fetch payout settings" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { payoutMethod, bankDetails, paypalEmail, payoutSchedule, minPayoutAmount } = await req.json();

    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      include: { tutorProfile: true }
    });

    if (!user || user.role !== "TUTOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Prepare payout settings
    const payoutSettings = {
      payoutMethod,
      bankDetails,
      paypalEmail,
      payoutSchedule,
      minPayoutAmount: Number(minPayoutAmount) || 50
    };

    // Update or create tutor profile with payout settings
    if (user.tutorProfile) {
      await prisma.tutorProfile.update({
        where: { userId: user.id },
        data: { payoutSettings: payoutSettings }
      });
    } else {
      await prisma.tutorProfile.create({
        data: {
          userId: user.id,
          payoutSettings: payoutSettings
        }
      });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Error updating payout settings:", error);
    return NextResponse.json({ error: "Failed to update payout settings" }, { status: 500 });
  }
} 