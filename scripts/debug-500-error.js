const { PrismaClient } = require('@prisma/client');

async function debug500Error() {
  const prisma = new PrismaClient();
  
  console.log('🔍 Debugging 500 Error...\n');

  try {
    // Test with the actual user ID
    const userId = 'd921789d-884a-4691-a6df-b27d70787264'; // emeka's ID
    
    console.log('1️⃣ Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful');

    console.log('\n2️⃣ Testing user existence...');
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    console.log('✅ User found:', user ? user.name : 'Not found');

    console.log('\n3️⃣ Testing bookings query...');
    const bookings = await prisma.booking.findMany({
      where: { studentId: userId },
      include: {
        tutor: {
          select: {
            name: true,
            email: true,
            tutorProfile: {
              select: {
                skills: true,
                languages: true
              }
            }
          }
        },
        review: {
          select: {
            rating: true,
            createdAt: true
          }
        },
        payment: {
          select: {
            status: true
          }
        }
      },
      orderBy: { scheduledAt: 'desc' }
    });
    console.log('✅ Bookings query successful:', bookings.length, 'bookings found');

    console.log('\n4️⃣ Testing UserAchievement query...');
    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' }
    });
    console.log('✅ UserAchievement query successful:', userAchievements.length, 'achievements found');

    console.log('\n5️⃣ Testing achievement creation...');
    try {
      const testAchievement = await prisma.userAchievement.create({
        data: {
          userId,
          achievementId: 'test-debug',
          current: 1,
          isUnlocked: false,
          progress: 10
        }
      });
      console.log('✅ Achievement creation successful');

      // Clean up
      await prisma.userAchievement.delete({
        where: { id: testAchievement.id }
      });
      console.log('✅ Test achievement cleaned up');
    } catch (error) {
      console.log('❌ Achievement creation failed:', error.message);
    }

    console.log('\n6️⃣ Testing data calculations...');
    const totalSessions = bookings.length;
    const completedSessions = bookings.filter(b => b.status === 'COMPLETED').length;
    const upcomingSessions = bookings.filter(b => 
      b.status === 'CONFIRMED' && b.paidAt
    ).length;
    const totalHours = bookings
      .filter(b => b.status === 'COMPLETED')
      .reduce((acc, b) => acc + (b.duration / 60), 0);

    const reviews = bookings.filter(b => b.review).map(b => b.review);
    const averageRating = reviews.length > 0 
      ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length 
      : 0;

    console.log('✅ Data calculations successful:');
    console.log('   - Total sessions:', totalSessions);
    console.log('   - Completed sessions:', completedSessions);
    console.log('   - Upcoming sessions:', upcomingSessions);
    console.log('   - Total hours:', Math.round(totalHours * 10) / 10);
    console.log('   - Average rating:', Math.round(averageRating * 10) / 10);

    console.log('\n🎯 DIAGNOSIS:');
    console.log('='.repeat(40));
    console.log('✅ Database connection: Working');
    console.log('✅ User queries: Working');
    console.log('✅ Booking queries: Working');
    console.log('✅ Achievement queries: Working');
    console.log('✅ Data calculations: Working');
    console.log('\n💡 The 500 error might be happening in the browser due to:');
    console.log('   - Authentication issues');
    console.log('   - Session problems');
    console.log('   - Frontend JavaScript errors');
    console.log('   - Network connectivity issues');

  } catch (error) {
    console.error('❌ Debug failed:', error);
    console.error('Error stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug
debug500Error(); 