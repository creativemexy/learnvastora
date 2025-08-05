const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const sampleBookings = [
  {
    studentName: 'John Smith',
    studentEmail: 'john.smith@example.com',
    tutorName: 'Sarah Johnson',
    tutorEmail: 'sarah.johnson@example.com',
    scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    duration: 60,
    price: 25,
    status: 'CONFIRMED',
    isInstant: false
  },
  {
    studentName: 'Maria Garcia',
    studentEmail: 'maria.garcia@example.com',
    tutorName: 'Miguel Rodriguez',
    tutorEmail: 'miguel.rodriguez@example.com',
    scheduledAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
    duration: 45,
    price: 20,
    status: 'PENDING',
    isInstant: true
  },
  {
    studentName: 'David Chen',
    studentEmail: 'david.chen@example.com',
    tutorName: 'Emma Chen',
    tutorEmail: 'emma.chen@example.com',
    scheduledAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    duration: 90,
    price: 30,
    status: 'COMPLETED',
    isInstant: false
  },
  {
    studentName: 'Lisa Brown',
    studentEmail: 'lisa.brown@example.com',
    tutorName: 'Pierre Dubois',
    tutorEmail: 'pierre.dubois@example.com',
    scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    duration: 60,
    price: 28,
    status: 'CONFIRMED',
    isInstant: false
  },
  {
    studentName: 'Alex Johnson',
    studentEmail: 'alex.johnson@example.com',
    tutorName: 'Anna Schmidt',
    tutorEmail: 'anna.schmidt@example.com',
    scheduledAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    duration: 60,
    price: 22,
    status: 'COMPLETED',
    isInstant: false
  },
  {
    studentName: 'Sophie Wilson',
    studentEmail: 'sophie.wilson@example.com',
    tutorName: 'Sarah Johnson',
    tutorEmail: 'sarah.johnson@example.com',
    scheduledAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
    duration: 45,
    price: 25,
    status: 'PENDING',
    isInstant: true
  },
  {
    studentName: 'Michael Davis',
    studentEmail: 'michael.davis@example.com',
    tutorName: 'Emma Chen',
    tutorEmail: 'emma.chen@example.com',
    scheduledAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    duration: 120,
    price: 30,
    status: 'CANCELLED',
    isInstant: false
  },
  {
    studentName: 'Emma Thompson',
    studentEmail: 'emma.thompson@example.com',
    tutorName: 'Pierre Dubois',
    tutorEmail: 'pierre.dubois@example.com',
    scheduledAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    duration: 60,
    price: 28,
    status: 'CONFIRMED',
    isInstant: false
  }
];

async function createSampleBookings() {
  try {
    console.log('Creating sample bookings...');

    // Get existing users
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      take: 5
    });

    const tutors = await prisma.user.findMany({
      where: { role: 'TUTOR' },
      take: 5
    });

    if (students.length === 0 || tutors.length === 0) {
      console.log('Need at least one student and one tutor to create bookings');
      return;
    }

    for (const bookingData of sampleBookings) {
      // Find or create student
      let student = students.find(s => s.email === bookingData.studentEmail);
      if (!student) {
        try {
          student = await prisma.user.create({
            data: {
              name: bookingData.studentName,
              email: bookingData.studentEmail,
              password: 'password123',
              role: 'STUDENT',
              active: true
            }
          });
        } catch (error) {
          if (error.code === 'P2002') {
            // User already exists, try to find them
            student = await prisma.user.findUnique({
              where: { email: bookingData.studentEmail }
            });
          } else {
            throw error;
          }
        }
      }

      // Find or create tutor
      let tutor = tutors.find(t => t.email === bookingData.tutorEmail);
      if (!tutor) {
        try {
          tutor = await prisma.user.create({
            data: {
              name: bookingData.tutorName,
              email: bookingData.tutorEmail,
              password: 'password123',
              role: 'TUTOR',
              active: true,
              tutorProfile: {
                create: {
                  hourlyRate: bookingData.price,
                  skills: ['English', 'Conversation'],
                  languages: ['English'],
                  experience: 2
                }
              }
            }
          });
        } catch (error) {
          if (error.code === 'P2002') {
            // User already exists, try to find them
            tutor = await prisma.user.findUnique({
              where: { email: bookingData.tutorEmail }
            });
          } else {
            throw error;
          }
        }
      }

      // Check if booking already exists
      const existingBooking = await prisma.booking.findFirst({
        where: {
          studentId: student.id,
          tutorId: tutor.id,
          scheduledAt: bookingData.scheduledAt
        }
      });

      if (existingBooking) {
        console.log(`Booking already exists for ${bookingData.studentName} and ${bookingData.tutorName}, skipping...`);
        continue;
      }

      // Create booking
      const booking = await prisma.booking.create({
        data: {
          studentId: student.id,
          tutorId: tutor.id,
          scheduledAt: bookingData.scheduledAt,
          status: bookingData.status,
          duration: bookingData.duration,
          price: bookingData.price,
          isInstant: bookingData.isInstant
        }
      });

      console.log(`Created booking: ${bookingData.studentName} -> ${bookingData.tutorName} (${bookingData.status})`);

      // Create payment for completed sessions
      if (bookingData.status === 'COMPLETED') {
        await prisma.payment.create({
          data: {
            userId: student.id,
            bookingId: booking.id,
            amount: bookingData.price,
            status: 'PAID'
          }
        });

        // Create review for completed sessions
        await prisma.review.create({
          data: {
            bookingId: booking.id,
            studentId: student.id,
            tutorId: tutor.id,
            rating: Math.floor(Math.random() * 2) + 4, // 4-5 stars
            comment: `Great session with ${bookingData.tutorName}! Very helpful and patient.`
          }
        });

        // Create some sample messages
        const messages = [
          'Hello! Looking forward to our session.',
          'Thank you for the great lesson!',
          'Can we schedule another session?',
          'I really enjoyed learning with you.'
        ];

        for (let i = 0; i < Math.floor(Math.random() * 3) + 1; i++) {
          await prisma.message.create({
            data: {
              bookingId: booking.id,
              senderId: Math.random() > 0.5 ? student.id : tutor.id,
              content: messages[Math.floor(Math.random() * messages.length)]
            }
          });
        }

        // Create session recording for completed sessions
        if (Math.random() > 0.3) {
          await prisma.sessionRecording.create({
            data: {
              sessionId: booking.id,
              userId: tutor.id,
              url: `https://example.com/recordings/session_${booking.id}.webm`,
              fileName: `session_${booking.id}.webm`
            }
          });
        }
      }
    }

    console.log('Sample bookings created successfully!');
  } catch (error) {
    console.error('Error creating sample bookings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSampleBookings(); 