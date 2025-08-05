const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const enhancedTutors = [
  {
    name: "Andy Talker",
    email: "andy@example.com",
    bio: "Experienced English tutor with 5+ years of teaching experience. Specialized in business English and conversation practice. I love helping students build confidence in speaking English naturally.",
    languages: ["English", "Spanish"],
    skills: ["Conversation", "Grammar", "Business English", "TOEFL Prep", "Interview Practice"],
    experience: 5,
    education: "TESOL Certified, Bachelor's in Linguistics",
    hourlyRate: 25,
    instantBookingEnabled: true,
    instantBookingPrice: 20,
    accent: "USA",
    isPro: true,
    isSupertutor: true,
    isOnline: true
  },
  {
    name: "Tutor Rhosael",
    email: "rhosael@example.com",
    bio: "Native Canadian English speaker with a passion for teaching. I specialize in pronunciation and helping students sound more natural in English. Let's make learning fun and effective!",
    languages: ["English", "French"],
    skills: ["Conversation", "Pronunciation", "Accent Reduction", "IELTS Prep", "Academic Writing"],
    experience: 3,
    education: "Bachelor's in Education, TESOL Certificate",
    hourlyRate: 30,
    instantBookingEnabled: true,
    instantBookingPrice: 25,
    accent: "Canadian",
    isPro: true,
    isSupertutor: true,
    isOnline: true
  },
  {
    name: "Valda",
    email: "valda@example.com",
    bio: "Professional English teacher with extensive experience in exam preparation and academic writing. I help students achieve their goals through structured, personalized lessons.",
    languages: ["English", "German"],
    skills: ["Grammar", "Writing", "Exam Prep", "Academic English", "Research Writing"],
    experience: 7,
    education: "Master's in TESOL, PhD in Applied Linguistics",
    hourlyRate: 35,
    instantBookingEnabled: true,
    instantBookingPrice: 30,
    accent: "USA",
    isPro: true,
    isSupertutor: true,
    isOnline: true
  },
  {
    name: "Edwin hwy101cr",
    email: "edwin@example.com",
    bio: "Friendly conversation partner who loves meeting people from around the world. I focus on natural, everyday English and helping students feel comfortable speaking.",
    languages: ["English"],
    skills: ["Conversation", "Casual English", "Travel English", "Slang & Idioms"],
    experience: 2,
    education: "Bachelor's Degree in Communications",
    hourlyRate: 20,
    instantBookingEnabled: true,
    instantBookingPrice: 15,
    accent: "USA",
    isPro: false,
    isSupertutor: false,
    isOnline: true
  },
  {
    name: "Asha",
    email: "asha@example.com",
    bio: "British English specialist with a focus on clear pronunciation and proper grammar. I help students master British English for both personal and professional use.",
    languages: ["English", "Hindi"],
    skills: ["Pronunciation", "Business English", "British Accent", "Formal Writing"],
    experience: 4,
    education: "CELTA Certified, Master's in English Literature",
    hourlyRate: 28,
    instantBookingEnabled: false,
    instantBookingPrice: 0,
    accent: "UK",
    isPro: true,
    isSupertutor: false,
    isOnline: false
  },
  {
    name: "Jasmine Jones",
    email: "jasmine@example.com",
    bio: "Patient and encouraging tutor who believes everyone can learn English. I specialize in building confidence and making learning enjoyable for all levels.",
    languages: ["English"],
    skills: ["Conversation", "Grammar", "Beginner English", "Confidence Building"],
    experience: 3,
    education: "TESOL Certificate, Bachelor's in Education",
    hourlyRate: 22,
    instantBookingEnabled: true,
    instantBookingPrice: 18,
    accent: "USA",
    isPro: false,
    isSupertutor: false,
    isOnline: true
  },
  {
    name: "Sam",
    email: "sam@example.com",
    bio: "Casual conversation expert who loves helping students practice everyday English. Perfect for those who want to improve their speaking skills in a relaxed environment.",
    languages: ["English"],
    skills: ["Conversation", "Casual English", "Listening Practice", "Speaking Confidence"],
    experience: 1,
    education: "High School Diploma, Currently studying Education",
    hourlyRate: 15,
    instantBookingEnabled: true,
    instantBookingPrice: 12,
    accent: "USA",
    isPro: false,
    isSupertutor: false,
    isOnline: true
  },
  {
    name: "Mark Stainton",
    email: "mark@example.com",
    bio: "Professional English teacher with expertise in academic writing and advanced grammar. I help students master complex English concepts and improve their writing skills.",
    languages: ["English"],
    skills: ["Grammar", "Writing", "Academic English", "Advanced Grammar", "Essay Writing"],
    experience: 6,
    education: "Master's in English, PhD in Linguistics",
    hourlyRate: 32,
    instantBookingEnabled: false,
    instantBookingPrice: 0,
    accent: "UK",
    isPro: true,
    isSupertutor: false,
    isOnline: false
  },
  {
    name: "Sarah Mitchell",
    email: "sarah@example.com",
    bio: "Australian English tutor with a warm, friendly approach. I specialize in helping students understand Australian culture and language nuances.",
    languages: ["English", "Mandarin"],
    skills: ["Australian English", "Cultural Exchange", "Conversation", "Business English"],
    experience: 4,
    education: "Bachelor's in Teaching, TESOL Certificate",
    hourlyRate: 26,
    instantBookingEnabled: true,
    instantBookingPrice: 22,
    accent: "Australian",
    isPro: true,
    isSupertutor: false,
    isOnline: true
  },
  {
    name: "Carlos Rodriguez",
    email: "carlos@example.com",
    bio: "Bilingual English-Spanish tutor who understands the challenges of learning a new language. I help Spanish speakers master English through targeted practice.",
    languages: ["English", "Spanish"],
    skills: ["Spanish to English", "Pronunciation", "Grammar", "Business English"],
    experience: 3,
    education: "Bachelor's in Modern Languages, TESOL Certificate",
    hourlyRate: 24,
    instantBookingEnabled: true,
    instantBookingPrice: 20,
    accent: "USA",
    isPro: false,
    isSupertutor: false,
    isOnline: true
  },
  {
    name: "Emma Thompson",
    email: "emma@example.com",
    bio: "British English tutor with a passion for literature and creative writing. I help students develop their English skills through engaging discussions and writing exercises.",
    languages: ["English", "French"],
    skills: ["Creative Writing", "Literature", "British English", "Essay Writing"],
    experience: 5,
    education: "Master's in Creative Writing, CELTA Certified",
    hourlyRate: 29,
    instantBookingEnabled: true,
    instantBookingPrice: 25,
    accent: "UK",
    isPro: true,
    isSupertutor: true,
    isOnline: false
  },
  {
    name: "David Chen",
    email: "david@example.com",
    bio: "Canadian English tutor with expertise in technical and business English. Perfect for professionals looking to improve their workplace communication skills.",
    languages: ["English", "Mandarin", "Cantonese"],
    skills: ["Business English", "Technical English", "Presentation Skills", "Email Writing"],
    experience: 6,
    education: "MBA, TESOL Certificate",
    hourlyRate: 33,
    instantBookingEnabled: true,
    instantBookingPrice: 28,
    accent: "Canadian",
    isPro: true,
    isSupertutor: true,
    isOnline: true
  }
];

async function enhanceTutors() {
  try {
    console.log('Starting tutor enhancement...');
    
    for (const tutorData of enhancedTutors) {
      // Find existing tutor by email
      const existingTutor = await prisma.user.findUnique({
        where: { email: tutorData.email },
        include: { tutorProfile: true }
      });

      if (existingTutor) {
        // Update existing tutor
        await prisma.user.update({
          where: { id: existingTutor.id },
          data: {
            name: tutorData.name,
            isOnline: tutorData.isOnline,
            lastSeen: new Date(),
            tutorProfile: {
              upsert: {
                create: {
                  bio: tutorData.bio,
                  languages: tutorData.languages,
                  skills: tutorData.skills,
                  experience: tutorData.experience,
                  education: tutorData.education,
                  hourlyRate: tutorData.hourlyRate,
                  instantBookingEnabled: tutorData.instantBookingEnabled,
                  instantBookingPrice: tutorData.instantBookingPrice,
                  accent: tutorData.accent,
                  isPro: tutorData.isPro,
                  isSupertutor: tutorData.isSupertutor,
                },
                update: {
                  bio: tutorData.bio,
                  languages: tutorData.languages,
                  skills: tutorData.skills,
                  experience: tutorData.experience,
                  education: tutorData.education,
                  hourlyRate: tutorData.hourlyRate,
                  instantBookingEnabled: tutorData.instantBookingEnabled,
                  instantBookingPrice: tutorData.instantBookingPrice,
                  accent: tutorData.accent,
                  isPro: tutorData.isPro,
                  isSupertutor: tutorData.isSupertutor,
                }
              }
            }
          }
        });
        console.log(`Updated tutor: ${tutorData.name}`);
      } else {
        // Create new tutor
        await prisma.user.create({
          data: {
            name: tutorData.name,
            email: tutorData.email,
            password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4tbQJ8Kj1G', // hashed password
            role: 'TUTOR',
            isOnline: tutorData.isOnline,
            lastSeen: new Date(),
            tutorProfile: {
              create: {
                bio: tutorData.bio,
                languages: tutorData.languages,
                skills: tutorData.skills,
                experience: tutorData.experience,
                education: tutorData.education,
                hourlyRate: tutorData.hourlyRate,
                instantBookingEnabled: tutorData.instantBookingEnabled,
                instantBookingPrice: tutorData.instantBookingPrice,
                accent: tutorData.accent,
                isPro: tutorData.isPro,
                isSupertutor: tutorData.isSupertutor,
              }
            }
          }
        });
        console.log(`Created new tutor: ${tutorData.name}`);
      }
    }

    // Add some sample reviews
    await addSampleReviews();
    
    console.log('Tutor enhancement completed successfully!');
  } catch (error) {
    console.error('Error enhancing tutors:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function addSampleReviews() {
  try {
    const tutors = await prisma.user.findMany({
      where: { role: 'TUTOR' },
      include: { tutorProfile: true }
    });

    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      take: 5
    });

    if (students.length === 0) {
      // Create some sample students if none exist
      const sampleStudents = [
        { name: "John Doe", email: "john@example.com" },
        { name: "Jane Smith", email: "jane@example.com" },
        { name: "Mike Johnson", email: "mike@example.com" },
        { name: "Lisa Brown", email: "lisa@example.com" },
        { name: "Tom Wilson", email: "tom@example.com" }
      ];

      for (const studentData of sampleStudents) {
        await prisma.user.create({
          data: {
            name: studentData.name,
            email: studentData.email,
            password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4tbQJ8Kj1G',
            role: 'STUDENT'
          }
        });
      }
    }

    const updatedStudents = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      take: 5
    });

    // Add reviews for each tutor
    for (const tutor of tutors) {
      // Skip if tutor already has reviews
      const existingReviews = await prisma.review.findMany({
        where: { tutorId: tutor.id }
      });

      if (existingReviews.length === 0) {
        // Create a sample booking and review
        const student = updatedStudents[Math.floor(Math.random() * updatedStudents.length)];
        
        const booking = await prisma.booking.create({
          data: {
            studentId: student.id,
            tutorId: tutor.id,
            scheduledAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date in last 30 days
            status: 'COMPLETED',
            isInstant: false
          }
        });

        const reviewComments = [
          "Great tutor! Very patient and helpful.",
          "Excellent teaching style. Highly recommended!",
          "Very knowledgeable and friendly.",
          "Made learning fun and easy to understand.",
          "Professional and well-prepared for lessons.",
          "Great conversation partner and teacher.",
          "Helped me improve my confidence in speaking.",
          "Very clear explanations and good feedback.",
          "Flexible and accommodating with scheduling.",
          "Excellent pronunciation and grammar help."
        ];

        await prisma.review.create({
          data: {
            bookingId: booking.id,
            studentId: student.id,
            tutorId: tutor.id,
            rating: Math.floor(Math.random() * 2) + 4, // 4-5 stars
            comment: reviewComments[Math.floor(Math.random() * reviewComments.length)]
          }
        });

        console.log(`Added review for tutor: ${tutor.name}`);
      }
    }
  } catch (error) {
    console.error('Error adding sample reviews:', error);
  }
}

enhanceTutors(); 