const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedMessages() {
  try {
    console.log('🌱 Seeding messages data...');

    // Get existing users
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { role: 'STUDENT' },
          { role: 'TUTOR' }
        ]
      },
      take: 10
    });

    console.log('🔎 Users found for seeding:');
    users.forEach(u => {
      console.log(`   • ${u.name} (${u.email}) - ${u.role}`);
    });

    if (users.length < 2) {
      console.log('❌ Need at least 2 users (1 student, 1 tutor) to seed messages');
      return;
    }

    const student = users.find(u => u.role === 'STUDENT');
    const tutor = users.find(u => u.role === 'TUTOR');

    if (!student || !tutor) {
      console.log('❌ Need both student and tutor users to seed messages');
      if (!student) console.log('⚠️  No student found');
      if (!tutor) console.log('⚠️  No tutor found');
      return;
    }

    console.log(`👤 Student: ${student.name} (${student.id})`);
    console.log(`👨‍🏫 Tutor: ${tutor.name} (${tutor.id})`);

    // Create bookings
    const bookings = [];
    
    // Past booking with messages
    const pastBooking = await prisma.booking.create({
      data: {
        studentId: student.id,
        tutorId: tutor.id,
        scheduledAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        status: 'COMPLETED',
        duration: 60,
        price: 25.00
      }
    });
    bookings.push(pastBooking);

    // Current booking with messages
    const currentBooking = await prisma.booking.create({
      data: {
        studentId: student.id,
        tutorId: tutor.id,
        scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        status: 'CONFIRMED',
        duration: 60,
        price: 25.00
      }
    });
    bookings.push(currentBooking);

    console.log(`📅 Created ${bookings.length} bookings`);

    // Create messages for past booking
    const pastMessages = [
      {
        bookingId: pastBooking.id,
        senderId: student.id,
        content: "Hi! I'm really excited about our session today. I've been practicing the pronunciation exercises you gave me last time."
      },
      {
        bookingId: pastBooking.id,
        senderId: tutor.id,
        content: "Hello! I'm so glad to hear that! I can definitely see the improvement in your recent recordings. Are you ready to tackle some more advanced conversation topics today?"
      },
      {
        bookingId: pastBooking.id,
        senderId: student.id,
        content: "Absolutely! I've prepared some questions about cultural differences in business communication. I think it will be really interesting."
      },
      {
        bookingId: pastBooking.id,
        senderId: tutor.id,
        content: "Perfect! That's exactly what I had in mind. Cultural awareness is crucial for effective international communication. Great session today! Don't forget to practice the new expressions we covered."
      }
    ];

    // Create messages for current booking
    const currentMessages = [
      {
        bookingId: currentBooking.id,
        senderId: student.id,
        content: "Hi! I'm looking forward to our upcoming session. Can you help me prepare for the business presentation I have next week?"
      },
      {
        bookingId: currentBooking.id,
        senderId: tutor.id,
        content: "Of course! Business presentations are my specialty. I'll prepare some exercises to help you with confidence, pronunciation, and professional vocabulary."
      },
      {
        bookingId: currentBooking.id,
        senderId: student.id,
        content: "That sounds perfect! I'm particularly nervous about speaking in front of senior management."
      }
    ];

    // Insert all messages
    const allMessages = [...pastMessages, ...currentMessages];
    
    for (const messageData of allMessages) {
      await prisma.message.create({
        data: messageData
      });
    }

    console.log(`💬 Created ${allMessages.length} messages`);

    // Create additional bookings with different tutors if available
    const additionalTutors = users.filter(u => u.role === 'TUTOR' && u.id !== tutor.id);
    
    if (additionalTutors.length > 0) {
      const additionalTutor = additionalTutors[0];
      
      const additionalBooking = await prisma.booking.create({
        data: {
          studentId: student.id,
          tutorId: additionalTutor.id,
          scheduledAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
          status: 'CONFIRMED',
          duration: 45,
          price: 20.00
        }
      });

      await prisma.message.create({
        data: {
          bookingId: additionalBooking.id,
          senderId: additionalTutor.id,
          content: "Welcome! I'm excited to work with you on your English skills. What specific areas would you like to focus on?"
        }
      });

      console.log(`📚 Created additional booking with ${additionalTutor.name}`);
    }

    console.log('✅ Messages seeding completed successfully!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   • ${bookings.length} bookings created`);
    console.log(`   • ${allMessages.length} messages created`);
    console.log(`   • Student: ${student.name}`);
    console.log(`   • Tutors: ${users.filter(u => u.role === 'TUTOR').map(u => u.name).join(', ')}`);
    console.log('');
    console.log('🎯 You can now test the messages page with real data!');

  } catch (error) {
    console.error('❌ Error seeding messages:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedMessages(); 