const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixTutorProfiles() {
  try {
    console.log('Checking tutor profiles...');
    
    // Get all tutors
    const tutors = await prisma.user.findMany({
      where: { role: 'TUTOR' },
      include: { tutorProfile: true }
    });

    console.log(`Found ${tutors.length} tutors`);

    for (const tutor of tutors) {
      console.log(`\nTutor: ${tutor.name}`);
      console.log(`Has profile: ${!!tutor.tutorProfile}`);
      
      if (tutor.tutorProfile) {
        console.log(`Profile data:`, {
          bio: tutor.tutorProfile.bio,
          languages: tutor.tutorProfile.languages,
          skills: tutor.tutorProfile.skills,
          experience: tutor.tutorProfile.experience,
          hourlyRate: tutor.tutorProfile.hourlyRate,
          accent: tutor.tutorProfile.accent,
          isPro: tutor.tutorProfile.isPro,
          isSupertutor: tutor.tutorProfile.isSupertutor
        });
      } else {
        console.log('No profile found - creating one...');
        
        // Create a basic profile
        await prisma.tutorProfile.create({
          data: {
            userId: tutor.id,
            bio: "Experienced tutor ready to help you learn!",
            languages: ["English"],
            skills: ["Conversation", "Grammar"],
            experience: 2,
            education: "Bachelor's Degree",
            hourlyRate: 20,
            instantBookingEnabled: true,
            instantBookingPrice: 15,
            accent: "USA",
            isPro: false,
            isSupertutor: false
          }
        });
        console.log('Profile created!');
      }
    }

    // Now let's update specific tutors with better data
    const enhancedData = {
      "Andy Talker": {
        bio: "Experienced English tutor with 5+ years of teaching experience. Specialized in business English and conversation practice.",
        languages: ["English", "Spanish"],
        skills: ["Conversation", "Grammar", "Business English", "TOEFL Prep"],
        experience: 5,
        education: "TESOL Certified, Bachelor's in Linguistics",
        hourlyRate: 25,
        instantBookingEnabled: true,
        instantBookingPrice: 20,
        accent: "USA",
        isPro: true,
        isSupertutor: true
      },
      "Tutor Rhosael": {
        bio: "Native Canadian English speaker with a passion for teaching. I specialize in pronunciation and helping students sound more natural.",
        languages: ["English", "French"],
        skills: ["Conversation", "Pronunciation", "Accent Reduction", "IELTS Prep"],
        experience: 3,
        education: "Bachelor's in Education, TESOL Certificate",
        hourlyRate: 30,
        instantBookingEnabled: true,
        instantBookingPrice: 25,
        accent: "Canadian",
        isPro: true,
        isSupertutor: true
      },
      "Valda": {
        bio: "Professional English teacher with extensive experience in exam preparation and academic writing.",
        languages: ["English", "German"],
        skills: ["Grammar", "Writing", "Exam Prep", "Academic English"],
        experience: 7,
        education: "Master's in TESOL, PhD in Applied Linguistics",
        hourlyRate: 35,
        instantBookingEnabled: true,
        instantBookingPrice: 30,
        accent: "USA",
        isPro: true,
        isSupertutor: true
      }
    };

    for (const [name, data] of Object.entries(enhancedData)) {
      const tutor = await prisma.user.findFirst({
        where: { name: name }
      });

      if (tutor && tutor.tutorProfile) {
        await prisma.tutorProfile.update({
          where: { userId: tutor.id },
          data: data
        });
        console.log(`Updated profile for ${name}`);
      }
    }

    console.log('\nTutor profile check completed!');
  } catch (error) {
    console.error('Error fixing tutor profiles:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixTutorProfiles(); 