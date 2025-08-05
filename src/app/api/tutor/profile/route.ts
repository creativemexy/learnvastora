import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || (session.user as any).role !== "TUTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const userId = (session.user as any).id;
  
  try {
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            photo: true,
            isOnline: true,
            lastSeen: true
          }
        }
      }
    });
    
    // If no profile exists, return empty profile structure
    if (!tutorProfile) {
      return NextResponse.json({
        id: null,
        userId,
        bio: "",
        introVideoUrl: "",
        skills: [],
        subjects: [],
        languages: [],
        experience: null,
        education: "",
        hourlyRate: null,
        rating: null,
        totalSessions: null,
        accent: "",
        isPro: false,
        isSupertutor: false,
        availability: null,
        payoutSettings: null,
        instantBookingEnabled: false,
        instantBookingPrice: null,
        responseTime: null,
        teachingMethods: "",
        specializations: "",
        certifications: "",
        achievements: "",
        testimonials: "",
        materials: "",
        lessonDuration: null,
        maxStudents: null,
        trialLesson: "",
        cancellationPolicy: "",
        timezone: "",
        socialLinks: null,
        user: {
          id: userId,
          name: (session.user as any).name,
          email: (session.user as any).email,
          photo: (session.user as any).photo,
          isOnline: (session.user as any).isOnline,
          lastSeen: (session.user as any).lastSeen
        }
      });
    }
    
    return NextResponse.json(tutorProfile);
  } catch (error) {
    console.error("Error fetching tutor profile:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || (session.user as any).role !== "TUTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const userId = (session.user as any).id;
  const formData = await req.json();
  
  const {
    bio,
    skills,
    languages,
    experience,
    education,
    hourlyRate,
    availability,
    introVideoUrl,
    teachingMethods,
    specializations,
    certifications,
    achievements,
    testimonials,
    materials,
    lessonDuration,
    maxStudents,
    trialLesson,
    cancellationPolicy,
    timezone,
    socialLinks
  } = formData;
  
  // Validate required fields
  if (!bio || !skills || !languages || !availability) {
    return NextResponse.json({ error: "Missing required fields: bio, skills, languages, and availability are required" }, { status: 400 });
  }
  
  // Process skills and languages arrays
  const skillsArr = typeof skills === 'string' ? skills.split(",").map((s: string) => s.trim()).filter(Boolean) : skills;
  const languagesArr = typeof languages === 'string' ? languages.split(",").map((l: string) => l.trim()).filter(Boolean) : languages;
  
  try {
    const updatedProfile = await prisma.tutorProfile.upsert({
      where: { userId },
      update: {
        bio,
        skills: skillsArr,
        languages: languagesArr,
        experience: experience ? parseInt(experience) : null,
        education,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
        availability: availability ? JSON.parse(availability) : null,
        introVideoUrl
      },
      create: {
        userId,
        bio,
        skills: skillsArr,
        languages: languagesArr,
        experience: experience ? parseInt(experience) : null,
        education,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
        availability: availability ? JSON.parse(availability) : null,
        introVideoUrl
      },
    });
    
    return NextResponse.json({ 
      success: true, 
      profile: updatedProfile,
      message: "Profile updated successfully" 
    });
  } catch (error) {
    console.error("Error updating tutor profile:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || (session.user as any).role !== "TUTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const userId = (session.user as any).id;
  const formData = await req.json();
  
  try {
    const updatedProfile = await prisma.tutorProfile.upsert({
      where: { userId },
      update: {
        ...formData,
        updatedAt: new Date()
      },
      create: { 
        userId,
        ...formData
      },
    });
    
    return NextResponse.json({ 
      success: true, 
      profile: updatedProfile,
      message: "Profile updated successfully" 
    });
  } catch (error) {
    console.error("Error updating tutor profile:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
} 