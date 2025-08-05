const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seedTutors() {
  try {
    console.log('🌱 Seeding tutors...');

    // Sample tutors data
    const tutors = [
      {
        name: "Andy Talker",
        email: "andy@example.com",
        password: await bcrypt.hash("password123", 10),
        role: "TUTOR",
        isOnline: true,
        lastSeen: new Date(),
        tutorProfile: {
          bio: "Experienced English tutor with 5+ years of teaching",
          languages: ["English"],
          skills: ["Conversation", "Grammar", "Business"],
          experience: 5,
          education: "TESOL Certified",
          hourlyRate: 25.0,
          instantBookingEnabled: true,
          instantBookingPrice: 20.0,
          accent: "USA Accent",
          isPro: true,
          isSupertutor: true,
          responseTime: 5
        }
      },
      {
        name: "Tutor Rhosael",
        email: "rhosael@example.com",
        password: await bcrypt.hash("password123", 10),
        role: "TUTOR",
        isOnline: true,
        lastSeen: new Date(),
        tutorProfile: {
          bio: "Native Canadian English speaker",
          languages: ["English", "French"],
          skills: ["Conversation", "Pronunciation"],
          experience: 3,
          education: "Bachelor's in Education",
          hourlyRate: 30.0,
          instantBookingEnabled: true,
          instantBookingPrice: 25.0,
          accent: "Canadian Accent",
          isPro: true,
          isSupertutor: true,
          responseTime: 3
        }
      },
      {
        name: "Valda",
        email: "valda@example.com",
        password: await bcrypt.hash("password123", 10),
        role: "TUTOR",
        isOnline: true,
        lastSeen: new Date(),
        tutorProfile: {
          bio: "Professional English teacher",
          languages: ["English"],
          skills: ["Grammar", "Writing", "Exam Prep"],
          experience: 7,
          education: "Master's in TESOL",
          hourlyRate: 35.0,
          instantBookingEnabled: true,
          instantBookingPrice: 30.0,
          accent: "USA Accent",
          isPro: true,
          isSupertutor: true,
          responseTime: 2
        }
      },
      {
        name: "Edwin hwy101cr",
        email: "edwin@example.com",
        password: await bcrypt.hash("password123", 10),
        role: "TUTOR",
        isOnline: true,
        lastSeen: new Date(),
        tutorProfile: {
          bio: "Friendly conversation partner",
          languages: ["English"],
          skills: ["Conversation"],
          experience: 2,
          education: "Bachelor's Degree",
          hourlyRate: 20.0,
          instantBookingEnabled: true,
          instantBookingPrice: 15.0,
          accent: "USA Accent",
          isPro: false,
          isSupertutor: false,
          responseTime: 8
        }
      },
      {
        name: "Asha",
        email: "asha@example.com",
        password: await bcrypt.hash("password123", 10),
        role: "TUTOR",
        isOnline: false,
        lastSeen: new Date(Date.now() - 3600000), // 1 hour ago
        tutorProfile: {
          bio: "British English specialist",
          languages: ["English"],
          skills: ["Pronunciation", "Business English"],
          experience: 4,
          education: "CELTA Certified",
          hourlyRate: 28.0,
          instantBookingEnabled: false,
          instantBookingPrice: null,
          accent: "Standard British Accent",
          isPro: true,
          isSupertutor: false,
          responseTime: 15
        }
      },
      {
        name: "Jasmine Jones",
        email: "jasmine@example.com",
        password: await bcrypt.hash("password123", 10),
        role: "TUTOR",
        isOnline: true,
        lastSeen: new Date(),
        tutorProfile: {
          bio: "Patient and encouraging tutor",
          languages: ["English"],
          skills: ["Conversation", "Grammar"],
          experience: 3,
          education: "TESOL Certificate",
          hourlyRate: 22.0,
          instantBookingEnabled: true,
          instantBookingPrice: 18.0,
          accent: "USA Accent",
          isPro: false,
          isSupertutor: false,
          responseTime: 10
        }
      },
      {
        name: "Sam",
        email: "sam@example.com",
        password: await bcrypt.hash("password123", 10),
        role: "TUTOR",
        isOnline: true,
        lastSeen: new Date(),
        tutorProfile: {
          bio: "Casual conversation expert",
          languages: ["English"],
          skills: ["Conversation"],
          experience: 1,
          education: "High School Diploma",
          hourlyRate: 15.0,
          instantBookingEnabled: true,
          instantBookingPrice: 12.0,
          accent: "North American Accent",
          isPro: false,
          isSupertutor: false,
          responseTime: 12
        }
      },
      {
        name: "Mark Stainton",
        email: "mark@example.com",
        password: await bcrypt.hash("password123", 10),
        role: "TUTOR",
        isOnline: false,
        lastSeen: new Date(Date.now() - 7200000), // 2 hours ago
        tutorProfile: {
          bio: "Professional English teacher",
          languages: ["English"],
          skills: ["Grammar", "Writing"],
          experience: 6,
          education: "Master's in English",
          hourlyRate: 32.0,
          instantBookingEnabled: false,
          instantBookingPrice: null,
          accent: "Standard British Accent",
          isPro: true,
          isSupertutor: false,
          responseTime: 20
        }
      }
    ];

    // Create tutors
    for (const tutorData of tutors) {
      const { tutorProfile, ...userData } = tutorData;
      
      const tutor = await prisma.user.create({
        data: {
          ...userData,
          tutorProfile: {
            create: tutorProfile
          }
        },
        include: {
          tutorProfile: true
        }
      });

      console.log(`✅ Created tutor: ${tutor.name} (${tutor.email})`);
    }

    console.log('🎉 Tutors seeding completed!');
  } catch (error) {
    console.error('❌ Error seeding tutors:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedTutors(); 