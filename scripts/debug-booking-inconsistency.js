const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugBookingInconsistency() {
  console.log('🔍 Debugging Booking Inconsistency...\n');

  try {
    // Get all bookings for the current student (emeka)
    const studentId = 'd921789d-884a-4691-a6df-b27d70787264'; // emeka's ID
    
    const bookings = await prisma.booking.findMany({
      where: { studentId },
      include: {
        tutor: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { scheduledAt: 'desc' },
    });

    console.log(`📊 Total bookings for student: ${bookings.length}\n`);

    // Show all bookings with details
    bookings.forEach((booking, index) => {
      const scheduledDate = new Date(booking.scheduledAt);
      const now = new Date();
      const isFuture = scheduledDate > now;
      
      console.log(`${index + 1}. Booking ${booking.id}:`);
      console.log(`   - Status: ${booking.status}`);
      console.log(`   - Scheduled: ${scheduledDate.toLocaleString()}`);
      console.log(`   - Is Future: ${isFuture ? 'Yes' : 'No'}`);
      console.log(`   - Tutor: ${booking.tutor.name}`);
      console.log('');
    });

    // Test dashboard logic
    console.log('🎯 DASHBOARD LOGIC:');
    const dashboardUpcoming = bookings.filter(b => 
      ["PENDING", "CONFIRMED", "IN_PROGRESS"].includes(b.status)
    );
    console.log(`   - Includes PENDING, CONFIRMED, IN_PROGRESS: ${dashboardUpcoming.length}`);
    
    const dashboardUpcomingWithDate = bookings.filter(b => 
      ["PENDING", "CONFIRMED", "IN_PROGRESS"].includes(b.status) && 
      new Date(b.scheduledAt) > new Date()
    );
    console.log(`   - With future date check: ${dashboardUpcomingWithDate.length}`);

    // Test bookings page logic
    console.log('\n📅 BOOKINGS PAGE LOGIC:');
    const bookingsPageUpcoming = bookings.filter(b => 
      b.status === "CONFIRMED" && new Date(b.scheduledAt) > new Date()
    );
    console.log(`   - Only CONFIRMED + future date: ${bookingsPageUpcoming.length}`);

    // Show breakdown by status
    console.log('\n📋 BREAKDOWN BY STATUS:');
    const statusCounts = {};
    bookings.forEach(booking => {
      statusCounts[booking.status] = (statusCounts[booking.status] || 0) + 1;
    });
    
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   - ${status}: ${count}`);
    });

    // Show future vs past bookings
    console.log('\n⏰ FUTURE VS PAST BOOKINGS:');
    const futureBookings = bookings.filter(b => new Date(b.scheduledAt) > new Date());
    const pastBookings = bookings.filter(b => new Date(b.scheduledAt) <= new Date());
    
    console.log(`   - Future bookings: ${futureBookings.length}`);
    console.log(`   - Past bookings: ${pastBookings.length}`);

    // Show the specific booking that might be causing the issue
    console.log('\n🔍 DETAILED ANALYSIS:');
    bookings.forEach(booking => {
      const scheduledDate = new Date(booking.scheduledAt);
      const now = new Date();
      const isFuture = scheduledDate > now;
      const isDashboardUpcoming = ["PENDING", "CONFIRMED", "IN_PROGRESS"].includes(booking.status);
      const isBookingsPageUpcoming = booking.status === "CONFIRMED" && isFuture;
      
      if (isDashboardUpcoming !== isBookingsPageUpcoming) {
        console.log(`   ⚠️  INCONSISTENCY FOUND:`);
        console.log(`      - Booking: ${booking.id}`);
        console.log(`      - Status: ${booking.status}`);
        console.log(`      - Date: ${scheduledDate.toLocaleString()}`);
        console.log(`      - Dashboard includes: ${isDashboardUpcoming}`);
        console.log(`      - Bookings page includes: ${isBookingsPageUpcoming}`);
        console.log('');
      }
    });

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug
debugBookingInconsistency(); 