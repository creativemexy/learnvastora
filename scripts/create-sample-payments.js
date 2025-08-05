const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const samplePayments = [
  {
    studentName: 'John Smith',
    studentEmail: 'john.smith@example.com',
    tutorName: 'Sarah Johnson',
    tutorEmail: 'sarah.johnson@example.com',
    amount: 25,
    status: 'PAID',
    method: 'stripe'
  },
  {
    studentName: 'Maria Garcia',
    studentEmail: 'maria.garcia@example.com',
    tutorName: 'Miguel Rodriguez',
    tutorEmail: 'miguel.rodriguez@example.com',
    amount: 20,
    status: 'PAID',
    method: 'paypal'
  },
  {
    studentName: 'David Chen',
    studentEmail: 'david.chen@example.com',
    tutorName: 'Emma Chen',
    tutorEmail: 'emma.chen@example.com',
    amount: 30,
    status: 'PAID',
    method: 'paystack'
  },
  {
    studentName: 'Lisa Brown',
    studentEmail: 'lisa.brown@example.com',
    tutorName: 'Pierre Dubois',
    tutorEmail: 'pierre.dubois@example.com',
    amount: 28,
    status: 'PENDING',
    method: 'stripe'
  },
  {
    studentName: 'Alex Johnson',
    studentEmail: 'alex.johnson@example.com',
    tutorName: 'Anna Schmidt',
    tutorEmail: 'anna.schmidt@example.com',
    amount: 22,
    status: 'FAILED',
    method: 'paypal'
  }
];

const samplePayouts = [
  {
    tutorName: 'Sarah Johnson',
    tutorEmail: 'sarah.johnson@example.com',
    amount: 150,
    status: 'COMPLETED',
    method: 'bank',
    notes: 'Monthly payout'
  },
  {
    tutorName: 'Miguel Rodriguez',
    tutorEmail: 'miguel.rodriguez@example.com',
    amount: 200,
    status: 'PENDING',
    method: 'paypal',
    notes: 'Weekly payout'
  },
  {
    tutorName: 'Emma Chen',
    tutorEmail: 'emma.chen@example.com',
    amount: 180,
    status: 'PROCESSING',
    method: 'bank',
    notes: 'Bi-weekly payout'
  },
  {
    tutorName: 'Pierre Dubois',
    tutorEmail: 'pierre.dubois@example.com',
    amount: 120,
    status: 'COMPLETED',
    method: 'paypal',
    notes: 'Monthly payout'
  },
  {
    tutorName: 'Anna Schmidt',
    tutorEmail: 'anna.schmidt@example.com',
    amount: 95,
    status: 'PENDING',
    method: 'bank',
    notes: 'Weekly payout'
  }
];

async function createSamplePayments() {
  try {
    console.log('Creating sample payments and payouts...');

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
      console.log('Need at least one student and one tutor to create payments');
      return;
    }

    // Create sample payments
    for (const paymentData of samplePayments) {
      // Find or create student
      let student = students.find(s => s.email === paymentData.studentEmail);
      if (!student) {
        try {
          student = await prisma.user.create({
            data: {
              name: paymentData.studentName,
              email: paymentData.studentEmail,
              password: 'password123',
              role: 'STUDENT',
              active: true
            }
          });
        } catch (error) {
          if (error.code === 'P2002') {
            student = await prisma.user.findUnique({
              where: { email: paymentData.studentEmail }
            });
          } else {
            throw error;
          }
        }
      }

      // Find or create tutor
      let tutor = tutors.find(t => t.email === paymentData.tutorEmail);
      if (!tutor) {
        try {
          tutor = await prisma.user.create({
            data: {
              name: paymentData.tutorName,
              email: paymentData.tutorEmail,
              password: 'password123',
              role: 'TUTOR',
              active: true,
              tutorProfile: {
                create: {
                  hourlyRate: paymentData.amount,
                  skills: ['English', 'Conversation'],
                  languages: ['English'],
                  experience: 2
                }
              }
            }
          });
        } catch (error) {
          if (error.code === 'P2002') {
            tutor = await prisma.user.findUnique({
              where: { email: paymentData.tutorEmail }
            });
          } else {
            throw error;
          }
        }
      }

      // Create a booking for the payment
      const booking = await prisma.booking.create({
        data: {
          studentId: student.id,
          tutorId: tutor.id,
          scheduledAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date in last 30 days
          status: paymentData.status === 'PAID' ? 'COMPLETED' : 'PENDING',
          duration: 60,
          price: paymentData.amount,
          isInstant: false
        }
      });

      // Create payment
      await prisma.payment.create({
        data: {
          userId: student.id,
          bookingId: booking.id,
          amount: paymentData.amount,
          status: paymentData.status
        }
      });

      console.log(`Created payment: ${paymentData.studentName} -> ${paymentData.tutorName} (${paymentData.status})`);
    }

    // Create sample payouts
    for (const payoutData of samplePayouts) {
      // Find or create tutor
      let tutor = tutors.find(t => t.email === payoutData.tutorEmail);
      if (!tutor) {
        try {
          tutor = await prisma.user.create({
            data: {
              name: payoutData.tutorName,
              email: payoutData.tutorEmail,
              password: 'password123',
              role: 'TUTOR',
              active: true,
              tutorProfile: {
                create: {
                  hourlyRate: 25,
                  skills: ['English', 'Conversation'],
                  languages: ['English'],
                  experience: 2
                }
              }
            }
          });
        } catch (error) {
          if (error.code === 'P2002') {
            tutor = await prisma.user.findUnique({
              where: { email: payoutData.tutorEmail }
            });
          } else {
            throw error;
          }
        }
      }

      // Generate unique reference
      const reference = `PAYOUT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create payout
      await prisma.payout.create({
        data: {
          tutorId: tutor.id,
          amount: payoutData.amount,
          status: payoutData.status,
          method: payoutData.method,
          reference,
          notes: payoutData.notes,
          processedAt: payoutData.status === 'COMPLETED' ? new Date() : null
        }
      });

      console.log(`Created payout: ${payoutData.tutorName} - $${payoutData.amount} (${payoutData.status})`);
    }

    console.log('Sample payments and payouts created successfully!');
  } catch (error) {
    console.error('Error creating sample payments:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSamplePayments(); 