const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addTestNotifications() {
  try {
    // Get a user to add notifications for
    const user = await prisma.user.findFirst({
      where: {
        role: 'TUTOR'
      }
    });

    if (!user) {
      console.log('No tutor user found. Please create a user first.');
      return;
    }

    console.log(`Adding test notifications for user: ${user.name} (${user.id})`);

    // Add test notifications
    const notifications = [
      {
        userId: user.id,
        type: 'SESSION_REMINDER',
        title: 'Session Reminder',
        message: 'You have a session with Sarah Johnson in 30 minutes.',
        isRead: false,
        data: { bookingId: 'test-booking-1' }
      },
      {
        userId: user.id,
        type: 'PAYMENT_RECEIVED',
        title: 'Payment Received',
        message: 'You received ₦4,000 for your session with Mike Chen.',
        isRead: false,
        data: { amount: 4000, sessionId: 'test-session-1' }
      },
      {
        userId: user.id,
        type: 'REVIEW_RECEIVED',
        title: 'New Review',
        message: 'Emma Davis left you a 5-star review!',
        isRead: false,
        data: { rating: 5, reviewId: 'test-review-1' }
      },
      {
        userId: user.id,
        type: 'INSTANT_BOOKING_REQUEST',
        title: 'Instant Booking Request',
        message: 'Alex Smith wants to book an instant session with you.',
        isRead: false,
        data: { studentId: 'test-student-1', duration: 30 }
      },
      {
        userId: user.id,
        type: 'SYSTEM_UPDATE',
        title: 'System Update',
        message: 'New features are available! Check out the latest updates.',
        isRead: true,
        data: { updateType: 'feature' }
      }
    ];

    for (const notification of notifications) {
      await prisma.notification.create({
        data: notification
      });
      console.log(`Created notification: ${notification.title}`);
    }

    console.log('Test notifications added successfully!');
  } catch (error) {
    console.error('Error adding test notifications:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addTestNotifications(); 