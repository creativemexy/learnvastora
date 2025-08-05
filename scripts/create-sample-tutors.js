const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const sampleTutors = [
  {
    name: 'Sarah Johnson',
    email: 'sarah.johnson@example.com',
    password: 'password123',
    bio: 'Experienced English tutor with 5+ years of teaching experience. Specializes in business English and conversation skills.',
    skills: ['Business English', 'Conversation', 'Grammar', 'Pronunciation'],
    languages: ['English', 'Spanish'],
    hourlyRate: 25,
    isPro: true,
    isSupertutor: false,
    instantBookingEnabled: true
  },
  {
    name: 'Miguel Rodriguez',
    email: 'miguel.rodriguez@example.com',
    password: 'password123',
    bio: 'Native Spanish speaker with expertise in teaching Spanish to beginners and intermediate learners.',
    skills: ['Spanish', 'Grammar', 'Vocabulary', 'Cultural Context'],
    languages: ['Spanish', 'English'],
    hourlyRate: 20,
    isPro: false,
    isSupertutor: false,
    instantBookingEnabled: false
  },
  {
    name: 'Emma Chen',
    email: 'emma.chen@example.com',
    password: 'password123',
    bio: 'Certified Mandarin teacher with experience in both traditional and simplified Chinese.',
    skills: ['Mandarin', 'Chinese Culture', 'HSK Preparation', 'Business Chinese'],
    languages: ['Mandarin', 'English'],
    hourlyRate: 30,
    isPro: true,
    isSupertutor: true,
    instantBookingEnabled: true
  },
  {
    name: 'Pierre Dubois',
    email: 'pierre.dubois@example.com',
    password: 'password123',
    bio: 'French native speaker with a passion for teaching French literature and conversation.',
    skills: ['French', 'Literature', 'Conversation', 'DELF Preparation'],
    languages: ['French', 'English'],
    hourlyRate: 28,
    isPro: true,
    isSupertutor: false,
    instantBookingEnabled: true
  },
  {
    name: 'Anna Schmidt',
    email: 'anna.schmidt@example.com',
    password: 'password123',
    bio: 'German teacher with expertise in Goethe Institute standards and test preparation.',
    skills: ['German', 'Test Preparation', 'Grammar', 'Business German'],
    languages: ['German', 'English'],
    hourlyRate: 22,
    isPro: false,
    isSupertutor: false,
    instantBookingEnabled: false
  }
];

async function createSampleTutors() {
  try {
    console.log('Creating sample tutors...');

    for (const tutorData of sampleTutors) {
      // Check if tutor already exists
      const existingTutor = await prisma.user.findUnique({
        where: { email: tutorData.email }
      });

      if (existingTutor) {
        console.log(`Tutor ${tutorData.name} already exists, skipping...`);
        continue;
      }

      // Create tutor user
      const tutor = await prisma.user.create({
        data: {
          name: tutorData.name,
          email: tutorData.email,
          password: tutorData.password, // In production, this should be hashed
          role: 'TUTOR',
          active: true,
          tutorProfile: {
            create: {
              bio: tutorData.bio,
              skills: tutorData.skills,
              languages: tutorData.languages,
              experience: Math.floor(Math.random() * 10) + 1,
              hourlyRate: tutorData.hourlyRate,
              isPro: tutorData.isPro,
              isSupertutor: tutorData.isSupertutor,
              instantBookingEnabled: tutorData.instantBookingEnabled
            }
          }
        },
        include: {
          tutorProfile: true
        }
      });

      console.log(`Created tutor: ${tutor.name} (${tutor.email})`);

      // Create some sample bookings and reviews for the tutor
      const sampleStudents = await prisma.user.findMany({
        where: { role: 'STUDENT' },
        take: 3
      });

      for (const student of sampleStudents) {
        // Create sample booking
        const booking = await prisma.booking.create({
          data: {
            studentId: student.id,
            tutorId: tutor.id,
            scheduledAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date in last 30 days
            duration: 60,
            price: tutorData.hourlyRate,
            status: 'COMPLETED',
            isInstant: Math.random() > 0.5
          }
        });

        // Create sample review
        await prisma.review.create({
          data: {
            bookingId: booking.id,
            studentId: student.id,
            tutorId: tutor.id,
            rating: Math.floor(Math.random() * 2) + 4, // 4-5 stars
            comment: `Great session with ${tutor.name}! Very helpful and patient.`
          }
        });

        // Create sample payment
        await prisma.payment.create({
          data: {
            userId: student.id,
            bookingId: booking.id,
            amount: tutorData.hourlyRate,
            status: 'PAID'
          }
        });
      }
    }

    console.log('Sample tutors created successfully!');
  } catch (error) {
    console.error('Error creating sample tutors:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSampleTutors(); 